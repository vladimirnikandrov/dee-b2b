import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { sendTransactionalEmail } from "@/lib/email";

export async function GET() {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const admins = await sql`select id, email, company, created_at from users where role = 'admin' order by created_at`;
  return NextResponse.json({ admins });
}

// Invite a new admin by email — creates the account if it doesn't exist yet,
// or promotes an existing buyer account. No password to generate: they sign
// in the same passwordless way as everyone else.
export async function POST(request) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { email, company } = await request.json();
  if (!email) return NextResponse.json({ error: "Email is required" }, { status: 400 });

  try {
    const [existing] = await sql`select id from users where email = ${email}`;
    if (existing) {
      await sql`update users set role = 'admin' where id = ${existing.id}`;
    } else {
      const [user] = await sql`
        insert into users (email, company, role)
        values (${email}, ${company || null}, 'admin')
        returning id
      `;
      await sql`
        insert into buyer_profiles (user_id, company, email)
        values (${user.id}, ${company || null}, ${email})
        on conflict (user_id) do nothing
      `;
    }

    await sendTransactionalEmail("admin_welcome", { email });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Add admin error:", err);
    return NextResponse.json({ error: "Failed to add admin" }, { status: 500 });
  }
}
