import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requireAuth, requireAdmin } from "@/lib/auth";
import { toEnrichedOrder } from "@/lib/orders";

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

  // Everything below is derived from the order's CURRENT lines, so the row has
  // to be re-read and locked inside the transaction. Reading it outside (as this
  // did) meant two concurrent edits both computed their stock delta from the
  // same starting quantities and both applied it — inventory moved twice, and
  // the second write silently discarded the first edit's lines.
  try {
    const updated = await sql.begin(async (tx) => {
      const [locked] = await tx`select * from orders where id = ${id} for update`;
      if (!locked) throw new Error("Order not found");
      // Re-check the edit window against the locked row: it may have been
      // cancelled or invoiced in the moment we spent waiting for the lock.
      if (!canEdit(locked, session.role === "admin")) {
        throw new Error("This order can no longer be edited");
      }

      const existingLines = locked.lines || [];
      const newLines = existingLines
        .map((l) => {
          const newQty = qtyUpdates[l.sku] !== undefined ? Math.max(0, Math.floor(Number(qtyUpdates[l.sku]))) : l.qty;
          return { ...l, qty: newQty, total: newQty * l.unitPrice };
        })
        .filter((l) => l.qty > 0);

      if (newLines.length === 0) throw new Error("At least one item must have quantity > 0");

      const newTotalWSP = newLines.reduce((s, l) => s + l.total, 0);
      const vatRate = Number(locked.vat_rate);
      const round2 = (n) => Math.round(n * 100) / 100;
      const goodsVat = round2(newTotalWSP * vatRate);

      // Shipping is NOT recomputed from the current rate table. The order was
      // quoted, invoiced and possibly already paid at whatever it was charged at
      // the time, and editing quantities is not a reason to re-price the freight —
      // that would silently move the buyer onto a rate they never agreed to. The
      // order's own net/VAT split carries over untouched.
      const newShippingAmount = Number(locked.shipping_amount) || 0;
      const newShippingVat = Number(locked.shipping_vat_amount) || 0;

      // No 30/70 split — deposit_amount is the shipping-only first invoice (gross),
      // balance_amount the full order value (goods + goods VAT). See lib/pricing.js.
      const newVatAmount = round2(goodsVat + newShippingVat);
      const newDepositAmount = round2(newShippingAmount + newShippingVat);
      const newBalanceAmount = round2(newTotalWSP + goodsVat);
      const newTotalWithVat = round2(newBalanceAmount + newDepositAmount);

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
      // The stale document still exists in Dorte's accounting and has to be
      // deleted by hand — its number is what she needs to find it, and nothing
      // here can retract a document already in her books. So the number is
      // pushed onto `economic_superseded_drafts` before the column is reused;
      // otherwise the next re-issue overwrote it and the old draft became
      // untraceable while still sitting in the live ledger.
      //
      // The claim is released ONLY if the previous sync actually completed. A
      // claim with no sync timestamp means a request is in flight right now:
      // clearing it would let a re-toggle claim in parallel and post a second
      // draft, which is precisely the duplicate this locking exists to prevent.
      // (Both `case` arms read the pre-update value, so they agree.)
      const [r] = await tx`
        update orders set
          lines = ${sql.json(newLines)}, total_wsp = ${newTotalWSP}, vat_amount = ${newVatAmount},
          shipping_amount = ${newShippingAmount}, shipping_vat_amount = ${newShippingVat}, total_with_vat = ${newTotalWithVat},
          deposit_amount = ${newDepositAmount}, balance_amount = ${newBalanceAmount},
          economic_superseded_drafts = case
            when economic_balance_synced_at is not null and economic_balance_draft_number is not null
              then economic_superseded_drafts || economic_balance_draft_number
            else economic_superseded_drafts end,
          economic_balance_synced_at = case
            when economic_balance_synced_at is not null then null
            else economic_balance_synced_at end,
          economic_balance_claimed_at = case
            when economic_balance_synced_at is not null then null
            else economic_balance_claimed_at end
        where id = ${id}
        returning *
      `;
      return r;
    });

    return NextResponse.json({ order: toEnrichedOrder(updated, []) });
  } catch (err) {
    console.error("Order edit error:", err);
    // The checks that moved inside the transaction (edit window, empty order,
    // insufficient stock) are ordinary rejections, not server faults — they
    // were 409/400 before and must stay that way, or the client shows
    // "something went wrong" for a case the user can actually resolve.
    const msg = err.message || "Failed to update order";
    const status = /no longer be edited/i.test(msg) ? 409
      : /quantity > 0/i.test(msg) ? 400
      : /insufficient stock/i.test(msg) ? 409
      : /not found/i.test(msg) ? 404
      : 500;
    return NextResponse.json({ error: msg }, { status });
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

  // Refuse while the order still points at documents in Dorte's live
  // accounting. Deleting the row destroys the only record that draft #N belongs
  // to a cancelled order — she is then left with an invoice draft for an order
  // that no longer exists anywhere, and no way to trace it back. The drafts
  // themselves cannot be retracted from here, so the order row has to outlive
  // them. `?force=1` is the deliberate override once she has deleted them.
  const url = new URL(request.url);
  if (url.searchParams.get("force") !== "1") {
    const outstanding = [
      row.economic_deposit_draft_number,
      row.economic_balance_draft_number,
      ...(row.economic_superseded_drafts || []),
    ].filter((n) => n !== null && n !== undefined);

    if (outstanding.length > 0) {
      return NextResponse.json(
        {
          error:
            `This order still has ${outstanding.length === 1 ? "an invoice draft" : "invoice drafts"} in e-conomic ` +
            `(${outstanding.map((n) => `#${n}`).join(", ")}). Delete ${outstanding.length === 1 ? "it" : "them"} there first — ` +
            `deleting the order here would leave ${outstanding.length === 1 ? "it" : "them"} with nothing to trace back to.`,
          economicDrafts: outstanding,
        },
        { status: 409 }
      );
    }
  }

  await sql`delete from orders where id = ${id}`;
  return NextResponse.json({ success: true });
}
