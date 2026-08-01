import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { sendTransactionalEmail } from "@/lib/email";

export async function GET() {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const buyers = await sql`select id, email, company, created_at from users where role = 'buyer' order by created_at desc`;
  return NextResponse.json({ buyers });
}

// Invite a new buyer by email — creates the account and sends a welcome
// email explaining the platform. No password to generate: they sign in the
// same passwordless way as everyone else, whenever they first log in.
export async function POST(request) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { email: rawEmail, company } = await request.json();
  const email = String(rawEmail || "").trim().toLowerCase();
  if (!email) return NextResponse.json({ error: "Email is required" }, { status: 400 });

  try {
    const [existing] = await sql`select id, role from users where lower(email) = ${email}`;
    if (existing) {
      const label = existing.role === "admin" ? "an admin" : "a buyer";
      return NextResponse.json({ error: `This email is already registered as ${label}` }, { status: 400 });
    }

    const [user] = await sql`
      insert into users (email, company, role)
      values (${email}, ${company || null}, 'buyer')
      returning id
    `;
    await sql`
      insert into buyer_profiles (user_id, company, email)
      values (${user.id}, ${company || null}, ${email})
      on conflict (user_id) do nothing
    `;

    await sendTransactionalEmail("buyer_welcome", { email });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Invite buyer error:", err);
    return NextResponse.json({ error: "Failed to invite buyer" }, { status: 500 });
  }
}
