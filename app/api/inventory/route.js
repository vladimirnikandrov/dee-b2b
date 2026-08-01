import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requireAdmin, requireAuth } from "@/lib/auth";

// Signed-in read. The catalogue itself is behind a login — this is a wholesale
// portal, not a shop — so there was never a reason to publish exact
// stock-on-hand for every SKU to anyone who asked. Competitors could read the
// whole warehouse, and the numbers also tell them what is selling.
export async function GET() {
  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await sql`select sku, product_name, size, stock from inventory order by sku`;
  return NextResponse.json({ inventory: rows });
}

// Admin-only bulk upsert (replaces saveInventory's supabase.upsert call).
export async function PUT(request) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { records } = await request.json();
  if (!Array.isArray(records)) return NextResponse.json({ error: "records must be an array" }, { status: 400 });

  try {
    // Only write SKUs whose value the admin actually changed. The client used
    // to PUT the whole catalogue as one snapshot taken when the panel loaded,
    // so every untouched row was rewritten to its stale figure — an order
    // placed while the panel sat open had its stock silently resurrected. The
    // client now sends `previousStock` per row and the write is conditional on
    // the DB still holding that value, so a row that moved underneath is
    // reported back instead of being trampled.
    const conflicts = [];
    await sql.begin(async (tx) => {
      for (const r of records) {
        const stock = Number(r.stock) || 0;
        const prev = r.previousStock === undefined || r.previousStock === null ? null : Number(r.previousStock);

        const [existing] = await tx`select stock from inventory where sku = ${r.sku}`;
        if (!existing) {
          await tx`
            insert into inventory (sku, product_name, size, stock, updated_at)
            values (${r.sku}, ${r.product_name}, ${r.size}, ${stock}, now())
            on conflict (sku) do nothing
          `;
          continue;
        }

        // Unchanged by the admin — never rewrite it, whatever it says now.
        if (prev !== null && Number(existing.stock) === stock && prev === stock) continue;

        const [ok] = await tx`
          update inventory
          set product_name = ${r.product_name}, size = ${r.size}, stock = ${stock}, updated_at = now()
          where sku = ${r.sku} and (${prev}::int is null or stock = ${prev})
          returning sku
        `;
        if (!ok) conflicts.push({ sku: r.sku, expected: prev, actual: Number(existing.stock) });
      }
      if (conflicts.length > 0) throw Object.assign(new Error("stale"), { conflicts });
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err.conflicts) {
      return NextResponse.json(
        {
          error:
            `Stock for ${err.conflicts.map((c) => c.sku).join(", ")} changed while this page was open ` +
            `(an order came in). Nothing was saved — reload and re-enter your changes.`,
          conflicts: err.conflicts,
        },
        { status: 409 }
      );
    }
    console.error("Inventory save error:", err);
    return NextResponse.json({ error: "Failed to save inventory" }, { status: 500 });
  }
}
