import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { toFlatOrderData } from "@/lib/orders";
import { sendTransactionalEmail } from "@/lib/email";

// Mirrors the old client-side canClientCancel() precondition.
function canClientCancel(row) {
  if (row.cancelled) return false;
  return !row.status_deposit_paid && !row.status_packed && !row.status_balance_invoiced &&
    !row.status_balance_paid && !row.status_shipped && !row.status_received;
}

export async function PATCH(request, { params }) {
  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const [row] = await sql`select * from orders where id = ${id}`;
  if (!row) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  const isAdmin = session.role === "admin";
  const isOwner = row.user_id === session.id;
  if (!isAdmin && !isOwner) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (row.cancelled) return NextResponse.json({ error: "Order is already cancelled" }, { status: 409 });
  if (!isAdmin && !canClientCancel(row)) {
    return NextResponse.json({ error: "This order can no longer be cancelled — contact us" }, { status: 409 });
  }

  const updated = await sql.begin(async (tx) => {
    // Claim the cancellation FIRST, conditional on it not already being
    // cancelled. The `row` above was read outside this transaction, so two
    // concurrent cancels (a double-click, or buyer and admin at once) both saw
    // cancelled=false and both got here — and the old code refunded inventory
    // unconditionally, crediting every line twice and inventing stock that was
    // never returned. Making the flag flip the thing that has to win means the
    // loser matches no row and touches nothing.
    const [claimed] = await tx`
      update orders set cancelled = true
      where id = ${id} and cancelled = false
      returning *
    `;
    if (!claimed) return null;

    // Refund inventory for every line — the old flow never did this, so
    // stock sold on a since-cancelled order was gone from the counter forever.
    // Read the lines off the row we just claimed, not the stale pre-transaction
    // copy, so an edit landing in between can't make us refund the wrong sizes.
    for (const line of claimed.lines || []) {
      await tx`update inventory set stock = stock + ${line.qty}, updated_at = now() where sku = ${line.sku}`;
    }
    return claimed;
  });

  if (!updated) {
    return NextResponse.json({ error: "Order is already cancelled" }, { status: 409 });
  }

  const flatOrder = toFlatOrderData(updated);
  sendTransactionalEmail("order_cancelled_buyer", flatOrder).catch((e) => console.error("order_cancelled_buyer email failed:", e));
  // Notify admin only when the buyer cancels (not when admin cancels themselves).
  if (!isAdmin) {
    sendTransactionalEmail("order_cancelled_admin", flatOrder).catch((e) => console.error("order_cancelled_admin email failed:", e));
  }

  return NextResponse.json({ success: true });
}
