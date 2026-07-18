import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

// Public read — catalog needs stock badges before/without auth.
export async function GET() {
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
    for (const r of records) {
      await sql`
        insert into inventory (sku, product_name, size, stock, updated_at)
        values (${r.sku}, ${r.product_name}, ${r.size}, ${r.stock || 0}, now())
        on conflict (sku) do update set
          product_name = excluded.product_name,
          size = excluded.size,
          stock = excluded.stock,
          updated_at = now()
      `;
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Inventory save error:", err);
    return NextResponse.json({ error: "Failed to save inventory" }, { status: 500 });
  }
}
