import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

const SIZES = ["100 ML", "50 ML", "20 ML", "2 ML", "KIT"];

export async function GET() {
  const rows = await sql`select code, label, discount_type, prices from promo_codes order by created_at`;
  return NextResponse.json({ promoCodes: rows });
}

// Admin create. Errors now propagate to the client instead of being
// silently swallowed (the old client code faked a success toast even when
// the Supabase insert failed).
export async function POST(request) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { code, label, prices } = await request.json();
  if (!code?.trim()) return NextResponse.json({ error: "Code required" }, { status: 400 });
  if (!label?.trim()) return NextResponse.json({ error: "Label required" }, { status: 400 });

  const cleanPrices = {};
  for (const size of SIZES) {
    const p = parseFloat(prices?.[size]);
    if (isNaN(p) || p < 0) return NextResponse.json({ error: "All prices must be valid numbers" }, { status: 400 });
    cleanPrices[size] = p;
  }

  try {
    await sql`
      insert into promo_codes (code, label, discount_type, prices)
      values (${code.trim().toUpperCase()}, ${label}, 'fixed_prices', ${sql.json(cleanPrices)})
    `;
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Promo code save error:", err);
    return NextResponse.json({ error: "Failed to save promo code — code may already exist" }, { status: 500 });
  }
}

export async function DELETE(request) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  if (!code) return NextResponse.json({ error: "Missing code" }, { status: 400 });

  try {
    await sql`delete from promo_codes where code = ${code}`;
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Promo code delete error:", err);
    return NextResponse.json({ error: "Failed to delete promo code" }, { status: 500 });
  }
}
