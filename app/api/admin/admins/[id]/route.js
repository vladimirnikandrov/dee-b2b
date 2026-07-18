import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

// "Remove" demotes to buyer rather than deleting the account — reversible,
// and doesn't orphan any orders/notes the account might have.
export async function DELETE(request, { params }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  if (id === session.id) {
    return NextResponse.json({ error: "You can't remove your own admin access" }, { status: 400 });
  }

  const [{ count }] = await sql`select count(*)::int as count from users where role = 'admin'`;
  if (count <= 1) {
    return NextResponse.json({ error: "Can't remove the last remaining admin" }, { status: 400 });
  }

  const [target] = await sql`select role from users where id = ${id}`;
  if (!target || target.role !== "admin") {
    return NextResponse.json({ error: "Admin not found" }, { status: 404 });
  }

  await sql`update users set role = 'buyer' where id = ${id}`;
  return NextResponse.json({ success: true });
}
