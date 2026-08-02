import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

// Notes are internal to DEE (Vladimir, 2026-08-02). They are written in the
// admin panel, they are never returned to a buyer (see GET /api/orders), and
// only an admin can add one — a buyer-authored note would have to be shown to
// the buyer to be worth anything, which is exactly what "internal" rules out.
// `is_admin` is still stored, and still comes from the verified session rather
// than a client flag: the old client passed an unverified `isAdminView` boolean
// down from the calling view, so any buyer could post a note labelled "Admin".
export async function POST(request, { params }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const { text } = await request.json();
  const trimmed = (text || "").trim();
  if (!trimmed) return NextResponse.json({ error: "Note text required" }, { status: 400 });

  const [order] = await sql`select user_id from orders where id = ${id}`;
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  const [note] = await sql`
    insert into order_notes (order_id, text, author, is_admin)
    values (${id}, ${trimmed}, 'Admin', true)
    returning text, author, is_admin, created_at
  `;

  return NextResponse.json({ note: { text: note.text, author: note.author, date: note.created_at, isAdmin: note.is_admin } });
}
