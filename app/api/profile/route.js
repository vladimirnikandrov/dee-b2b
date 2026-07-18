import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

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

  await sql`
    insert into buyer_profiles (user_id, company, contact, address, city, country, zip, vat, email, updated_at)
    values (${session.id}, ${company}, ${contact}, ${address}, ${city}, ${country}, ${zip}, ${vat}, ${email}, now())
    on conflict (user_id) do update set
      company = excluded.company, contact = excluded.contact, address = excluded.address,
      city = excluded.city, country = excluded.country, zip = excluded.zip,
      vat = excluded.vat, email = excluded.email, updated_at = now()
  `;

  return NextResponse.json({ success: true });
}
