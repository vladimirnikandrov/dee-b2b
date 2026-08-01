import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

// Re-deducts the stock that was refunded at cancel time. Can genuinely fail
// now if that stock was sold to someone else in the meantime — correct
// behavior (the old flow never touched inventory on restore at all, so it
// couldn't have this failure mode, but also silently drifted the count).
export async function PATCH(request, { params }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const [row] = await sql`select * from orders where id = ${id}`;
  if (!row) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  if (!row.cancelled) return NextResponse.json({ error: "Order is not cancelled" }, { status: 409 });

  try {
    await sql.begin(async (tx) => {
      // Same compare-and-swap as cancel, and for the same reason: `row` was
      // read outside this transaction, so two concurrent restores both saw
      // cancelled=true and the old code deducted every line twice. Claim first,
      // and if the flag has already been flipped, match nothing and abort
      // before touching inventory.
      const [claimed] = await tx`
        update orders set cancelled = false
        where id = ${id} and cancelled = true
        returning *
      `;
      if (!claimed) throw new Error("Order is not cancelled");

      for (const line of claimed.lines || []) {
        // A SKU with no inventory row isn't tracked at all — cancel didn't
        // credit anything back for it, so there's nothing to re-deduct here.
        // Without this check the decrement matches no row and the whole
        // restore fails as "insufficient stock", permanently, for any order
        // containing an untracked SKU.
        const [tracked] = await tx`select sku from inventory where sku = ${line.sku}`;
        if (!tracked) continue;

        const [ok] = await tx`
          update inventory set stock = stock - ${line.qty}, updated_at = now()
          where sku = ${line.sku} and stock >= ${line.qty}
          returning stock
        `;
        if (!ok) throw new Error(`Cannot restore — insufficient stock for ${line.product} ${line.size}`);
      }
      await tx`update orders set cancelled = false where id = ${id}`;
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Restore error:", err);
    return NextResponse.json({ error: err.message || "Failed to restore order" }, { status: 409 });
  }
}
