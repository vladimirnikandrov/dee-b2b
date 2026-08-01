import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { normalizeCountry } from "@/lib/countries";

export async function GET() {
  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [profile] = await sql`select * from buyer_profiles where user_id = ${session.id}`;
  return NextResponse.json({ profile: profile || null });
}

// user_id always comes from the verified session, never from the request
// body — a buyer can only ever write their own profile.
export async function PUT(request) {
  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { company, contact, address, city, country, zip, vat, email } = await request.json();

  // Store the canonical country name whenever we can resolve one, so the VAT
  // classification in lib/vat.js doesn't depend on how the buyer spelled it.
  // An unresolvable value is kept verbatim rather than rejected — the profile
  // form is also how someone fixes a half-filled record, and refusing to save
  // the other eight fields over one stale country would be worse. Order
  // creation is where an unresolvable country is actually blocked.
  const canonicalCountry = normalizeCountry(country) || country;

  // Same reason as POST /api/orders: the address every invoice and status
  // email is delivered to comes from the session, never from the request body.
  // Otherwise a buyer could point their profile at anyone and have the portal
  // mail them from the verified sending domain.
  const canonicalEmail = session.email;

  await sql`
    insert into buyer_profiles (user_id, company, contact, address, city, country, zip, vat, email, updated_at)
    values (${session.id}, ${company}, ${contact}, ${address}, ${city}, ${canonicalCountry}, ${zip}, ${vat}, ${canonicalEmail}, now())
    on conflict (user_id) do update set
      company = excluded.company, contact = excluded.contact, address = excluded.address,
      city = excluded.city, country = excluded.country, zip = excluded.zip,
      vat = excluded.vat, email = excluded.email, updated_at = now()
  `;

  return NextResponse.json({ success: true });
}
