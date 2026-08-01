import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { issueLoginOtp } from "@/lib/otp";

// Buyers are passwordless — registration just creates the account + profile,
// then sends the same one-time code used for every subsequent sign-in.
// The client follows up with POST /api/auth/verify-otp to actually log in.
export async function POST(request) {
  try {
    const { email: rawEmail, company } = await request.json();
    const email = String(rawEmail || "").trim().toLowerCase();
    if (!email || !company) {
      return NextResponse.json({ error: "Company name and email are required" }, { status: 400 });
    }

    const [existing] = await sql`select id from users where lower(email) = ${email}`;
    if (existing) {
      return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
    }

    const [user] = await sql`
      insert into users (email, company, role)
      values (${email}, ${company}, 'buyer')
      returning id
    `;
    await sql`
      insert into buyer_profiles (user_id, company, email)
      values (${user.id}, ${company}, ${email})
      on conflict (user_id) do update set company = excluded.company, email = excluded.email
    `;

    await issueLoginOtp(email);

    return NextResponse.json({ step: "otp_sent", email });
  } catch (err) {
    console.error("Register error:", err);
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}
