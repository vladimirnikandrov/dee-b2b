import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { toFlatOrderData } from "@/lib/orders";
import { sendTransactionalEmail } from "@/lib/email";
import { generateInvoicePDF } from "@/lib/invoice-pdf";
import { syncInvoiceToEconomic } from "@/lib/economic";
import { recordSyncFailure } from "@/lib/sync-failures";

const STATUS_KEYS = ["deposit_invoiced", "deposit_paid", "packed", "balance_invoiced", "balance_paid", "shipped", "received"];

export async function PATCH(request, { params }) {
  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const isAdmin = session.role === "admin";

  const { id } = await params;
  const { key } = await request.json();
  if (!STATUS_KEYS.includes(key)) return NextResponse.json({ error: "Invalid status key" }, { status: 400 });

  const dbKey = `status_${key}`;
  const [existing] = await sql`select * from orders where id = ${id}`;

  // Non-admins get the same 403 whether the order doesn't exist or isn't
  // theirs — order ids come from a sequence (DA-YYMM-NNNN), so a
  // 404-vs-403 split would let anyone probe which ids are real.
  if (!existing) {
    return isAdmin
      ? NextResponse.json({ error: "Order not found" }, { status: 404 })
      : NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Buyers may confirm receipt of their own shipped order — and nothing else.
  // This is the one status action the UI offers them (My Orders "Confirm
  // Receipt", and the shipped email's CTA links straight to it), so it has to
  // be reachable, but strictly: own order, only `received`, only ON, never a
  // toggle back off.
  const buyerMayConfirmReceipt =
    key === "received" &&
    existing.user_id === session.id &&
    existing.status_shipped &&
    !existing.status_received &&
    !existing.cancelled;

  if (!isAdmin && !buyerMayConfirmReceipt) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const newValue = isAdmin ? !existing[dbKey] : true;

  // Turning a status ON for a cancelled order would email the buyer about an
  // order that no longer exists (and re-issue its invoices). Turning one OFF
  // stays allowed so admins can still clean up.
  if (existing.cancelled && newValue) {
    return NextResponse.json({ error: "This order is cancelled" }, { status: 409 });
  }

  // Compare-and-swap on the value we read, rather than a blind write. Two
  // PATCHes racing (a double-click inside the confirm modal's exit animation,
  // or Vladimir and Dorte clicking at once) would otherwise both read false,
  // both compute newValue=true, and both send the invoice email. The e-conomic
  // claim in lib/economic.js stops the duplicate draft; this stops the
  // duplicate email and the "second toggle silently flips it back off" case.
  // `dbKey` is one of the STATUS_KEYS constants checked above, never raw input.
  const [row] = await sql`
    update orders set ${sql({ [dbKey]: newValue })}
    where id = ${id} and ${sql(dbKey)} is not distinct from ${existing[dbKey]}
    returning *
  `;
  if (!row) {
    return NextResponse.json({ error: "That status was just changed by someone else — reload and try again" }, { status: 409 });
  }

  // Send the matching buyer notification only when the status is toggled ON.
  if (newValue) {
    const flatOrder = toFlatOrderData(row);
    if (key === "deposit_invoiced" || key === "balance_invoiced") {
      const invoiceType = key === "deposit_invoiced" ? "deposit" : "balance";
      generateInvoicePDF(flatOrder, invoiceType)
        .then((buf) => {
          const pdfAttachment = { filename: `${row.id}-${invoiceType}-invoice.pdf`, base64: Buffer.from(buf).toString("base64") };
          return sendTransactionalEmail(key, { ...flatOrder, pdfAttachment });
        })
        // Degrade to an attachment-less email rather than leaving the buyer
        // with nothing, and surface the failure in the admin panel.
        .catch(async (e) => {
          console.error(`${key} email failed:`, e);
          recordSyncFailure({ type: "email", orderId: row.id, context: `${key}_pdf`, error: e.message || String(e) });
          try {
            await sendTransactionalEmail(key, flatOrder);
          } catch (e2) {
            console.error(`${key} fallback (no PDF) also failed:`, e2);
          }
        });
      // Deposit already synced to e-conomic at order creation (see
      // app/api/orders/route.js) — only balance is a genuinely new
      // invoicing event triggered here.
      if (key === "balance_invoiced") {
        syncInvoiceToEconomic(flatOrder, "balance").catch((e) => console.error("e-conomic balance sync failed:", e));
      }
    } else {
      sendTransactionalEmail(key, flatOrder).catch((e) => console.error(`${key} email failed:`, e));
    }
  }

  return NextResponse.json({ success: true, statuses: STATUS_KEYS.reduce((acc, k) => ({ ...acc, [k]: row[`status_${k}`] }), {}) });
}
