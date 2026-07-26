import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requireAuth, requireAdmin } from "@/lib/auth";
import { toEnrichedOrder } from "@/lib/orders";
import { SHIPPING_FLAT } from "@/lib/products";

async function loadOrder(id) {
  const [row] = await sql`select * from orders where id = ${id}`;
  return row;
}

// Admins keep broad latitude to fix an order up until it's fully paid.
// Buyers get the same window they have for self-cancel (see
// app/api/orders/[id]/cancel/route.js): only while nothing has happened yet.
// Otherwise a buyer could silently change quantities after the full invoice
// PDF was emailed and the matching draft booked into e-conomic.
function canEdit(row, isAdmin) {
  if (row.cancelled || row.status_balance_paid) return false;
  if (isAdmin) return true;
  return (
    !row.status_deposit_paid &&
    !row.status_packed &&
    !row.status_balance_invoiced &&
    !row.status_shipped &&
    !row.status_received
  );
}

// Edit line-item quantities on an existing order. Only quantities on lines
// that already exist on the order can change — no new SKUs, no price
// overrides — closing the price-injection gap a fully open PATCH would have.
// Stock is adjusted by the delta (increase = decrement more, decrease =
// refund) inside the same transaction; the old client-side edit flow never
// touched inventory at all.
export async function PATCH(request, { params }) {
  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const row = await loadOrder(id);
  if (!row) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  if (session.role !== "admin" && row.user_id !== session.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!canEdit(row, session.role === "admin")) {
    return NextResponse.json({ error: "This order can no longer be edited" }, { status: 409 });
  }

  const { qtyUpdates } = await request.json();
  if (!qtyUpdates || typeof qtyUpdates !== "object") {
    return NextResponse.json({ error: "Missing qtyUpdates" }, { status: 400 });
  }

  const existingLines = row.lines || [];
  const newLines = existingLines
    .map((l) => {
      const newQty = qtyUpdates[l.sku] !== undefined ? Math.max(0, Math.floor(Number(qtyUpdates[l.sku]))) : l.qty;
      return { ...l, qty: newQty, total: newQty * l.unitPrice };
    })
    .filter((l) => l.qty > 0);

  if (newLines.length === 0) {
    return NextResponse.json({ error: "At least one item must have quantity > 0" }, { status: 400 });
  }

  const newTotalWSP = newLines.reduce((s, l) => s + l.total, 0);
  const vatRate = Number(row.vat_rate);
  const newVatAmount = Math.round(newTotalWSP * vatRate * 100) / 100;
  const totalBeforeShipping = newTotalWSP + newVatAmount;
  const newShippingAmount = newLines.reduce((s, l) => s + l.qty, 0) > 0 ? Number(row.shipping_amount) || SHIPPING_FLAT : 0;
  const newTotalWithVat = totalBeforeShipping + newShippingAmount;
  // No 30/70 split — deposit_amount is the shipping-only first invoice,
  // balance_amount the full order value (see lib/pricing.js).
  const newDepositAmount = newShippingAmount;
  const newBalanceAmount = totalBeforeShipping;

  try {
    const updated = await sql.begin(async (tx) => {
      // Apply the stock delta for every existing line (0 delta for
      // untouched lines, refund for removed/reduced lines, decrement for
      // increased ones — all in one pass).
      for (const oldLine of existingLines) {
        const newLine = newLines.find((l) => l.sku === oldLine.sku);
        const newQty = newLine ? newLine.qty : 0;
        const delta = newQty - oldLine.qty;
        if (delta === 0) continue;
        if (delta > 0) {
          const [ok] = await tx`
            update inventory set stock = stock - ${delta}, updated_at = now()
            where sku = ${oldLine.sku} and stock >= ${delta}
            returning stock
          `;
          if (!ok) throw new Error(`Insufficient stock for ${oldLine.product} ${oldLine.size}`);
        } else {
          await tx`update inventory set stock = stock + ${-delta}, updated_at = now() where sku = ${oldLine.sku}`;
        }
      }

      // Clearing the e-conomic claim is the important part here. Editing the
      // lines makes an already-posted full-order draft stale, and toggling
      // `balance_invoiced` off and on is the only way the admin panel offers
      // to re-issue it — so the claim has to be handed back, or the corrected
      // draft would be skipped as "already synced" and the books would keep
      // the old amounts forever.
      //
      // `economic_balance_draft_number` is deliberately NOT cleared. That stale
      // document still exists in Dorte's accounting and has to be deleted by
      // hand — its number is exactly what she needs to find it, and nothing
      // here can retract a document already in her books. The admin panel reads
      // "draft number but no sync timestamp" as superseded and says so.
      const [r] = await tx`
        update orders set
          lines = ${sql.json(newLines)}, total_wsp = ${newTotalWSP}, vat_amount = ${newVatAmount},
          shipping_amount = ${newShippingAmount}, total_with_vat = ${newTotalWithVat},
          deposit_amount = ${newDepositAmount}, balance_amount = ${newBalanceAmount},
          economic_balance_synced_at = null, economic_balance_claimed_at = null
        where id = ${id}
        returning *
      `;
      return r;
    });

    return NextResponse.json({ order: toEnrichedOrder(updated, []) });
  } catch (err) {
    console.error("Order edit error:", err);
    return NextResponse.json({ error: err.message || "Failed to update order" }, { status: 500 });
  }
}

// Permanent delete — admin only, and only for orders already cancelled
// (matches the old UI's condition). Stock was already refunded when the
// order was cancelled, so this doesn't touch inventory again.
export async function DELETE(request, { params }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const row = await loadOrder(id);
  if (!row) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  if (!row.cancelled) {
    return NextResponse.json({ error: "Only cancelled orders can be deleted" }, { status: 409 });
  }

  await sql`delete from orders where id = ${id}`;
  return NextResponse.json({ success: true });
}
