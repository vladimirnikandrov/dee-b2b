import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { sendTransactionalEmail } from "@/lib/email";
import { recordSyncFailure } from "@/lib/sync-failures";

export async function GET() {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Order count comes along so the panel can say what removing an account
  // would actually do — deactivate it, or delete it outright.
  const buyers = await sql`
    select u.id, u.email, u.company, u.created_at, u.deactivated_at,
           (select count(*)::int from orders o where o.user_id = u.id) as order_count
    from users u where u.role = 'buyer' order by u.created_at desc
  `;
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
  // The invite form isn't a <form>, so type="email" never validates anything.
  // A typo'd address creates an account nobody can ever sign into, and the
  // welcome email — the only way in — goes nowhere.
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    return NextResponse.json({ error: `"${rawEmail}" doesn't look like an email address` }, { status: 400 });
  }

  try {
    const [existing] = await sql`select id, role, deactivated_at from users where lower(email) = ${email}`;
    if (existing?.deactivated_at) {
      // Re-inviting someone whose access was revoked restores it rather than
      // failing on a duplicate they can't see.
      await sql`update users set deactivated_at = null, company = coalesce(${company || null}, company) where id = ${existing.id}`;
      const restored = await sendTransactionalEmail("buyer_welcome", { email }).catch(() => ({ success: false }));
      return NextResponse.json({ success: true, restored: true, emailSent: !!restored?.success });
    }
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

    // Now that the portal is invite-only, this email IS the buyer's way in —
    // reporting "welcome email sent" without checking meant an account that
    // exists and a person who was never told about it.
    const sent = await sendTransactionalEmail("buyer_welcome", { email }).catch((e) => {
      console.error("buyer_welcome failed:", e);
      return { success: false, error: e.message || String(e) };
    });
    if (!sent?.success) {
      await recordSyncFailure({ type: "email", orderId: null, context: "buyer_welcome", error: sent?.error || "unknown" });
    }
    return NextResponse.json({ success: true, emailSent: !!sent?.success, emailError: sent?.error || null });
  } catch (err) {
    console.error("Invite buyer error:", err);
    return NextResponse.json({ error: "Failed to invite buyer" }, { status: 500 });
  }
}
