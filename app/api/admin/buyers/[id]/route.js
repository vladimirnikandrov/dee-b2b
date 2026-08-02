import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

// Revoking a buyer's access.
//
// This exists because the portal became invite-only (2026-08-02): the account
// IS the access control now, so being able to create one without being able to
// take it back left the trade price list open to anyone who was ever invited —
// a shop that closed, a contact who moved on, an address typed wrong.
//
// An account with orders is NEVER deleted: those orders are Dorte's own
// accounting record and carry the e-conomic draft numbers. It is deactivated
// instead — `deactivated_at` set, which requireAuth rejects and request-otp
// treats as "no account" — so the history stays and the door closes. An account
// with no orders and no profile is deleted outright, since there is nothing to
// preserve and a typo'd invite should leave no trace.
export async function DELETE(request, { params }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  if (id === session.id) {
    return NextResponse.json({ error: "You can't remove your own account" }, { status: 400 });
  }

  const [target] = await sql`select id, email, role from users where id = ${id}`;
  if (!target) return NextResponse.json({ error: "Account not found" }, { status: 404 });
  if (target.role === "admin") {
    return NextResponse.json({ error: "That's an admin — remove admin access first" }, { status: 400 });
  }

  const [{ count }] = await sql`select count(*)::int as count from orders where user_id = ${id}`;
  if (count > 0) {
    await sql`update users set deactivated_at = now() where id = ${id}`;
    return NextResponse.json({ success: true, deactivated: true, orders: count });
  }

  await sql`delete from buyer_profiles where user_id = ${id}`;
  await sql`delete from login_otps where email = ${target.email}`;
  await sql`delete from users where id = ${id}`;
  return NextResponse.json({ success: true, deactivated: false });
}
