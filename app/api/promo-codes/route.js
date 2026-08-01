import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requireAdmin, requireAuth } from "@/lib/auth";

const SIZES = ["100 ML", "50 ML", "20 ML", "2 ML", "KIT"];

// ADMIN ONLY. This used to be public, and the client fetched it on mount for
// anonymous landing-page visitors — so `curl /api/promo-codes` returned every
// code together with its exact price table, and any buyer could read the
// deepest discount out of their own Network tab and apply it. On the live data
// that was 48 EUR against a 75 EUR wholesale price for a 100 ML.
//
// A promo code is a secret; the whole point is that you have to be told it.
// Buyers now validate a code they already know via POST below, which reveals
// nothing about codes they don't.
export async function GET() {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const rows = await sql`select code, label, discount_type, prices from promo_codes order by created_at`;
  return NextResponse.json({ promoCodes: rows });
}

// Buyer-facing single-code check. Requires a session so it can't be used as an
// open oracle, and returns only the code that was actually presented.
export async function PUT(request) {
  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { code } = await request.json();
  const clean = String(code || "").trim().toUpperCase();
  if (!clean) return NextResponse.json({ error: "Enter a promo code" }, { status: 400 });

  const [row] = await sql`
    select code, label, discount_type, prices from promo_codes where upper(code) = ${clean}
  `;
  if (!row) return NextResponse.json({ error: "Invalid code" }, { status: 404 });
  return NextResponse.json({ promo: row });
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
    // Round to cents. A price like 48.005 propagates through every line total,
    // the VAT and the order total independently, and the printed Subtotal +
    // Shipping + VAT then fails to equal the printed Total by a cent — on a
    // document a bookkeeper has to reconcile.
    cleanPrices[size] = Math.round(p * 100) / 100;
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
