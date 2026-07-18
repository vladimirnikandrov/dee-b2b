import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

// is_admin is derived from the verified session role, never from a
// client-submitted flag — the old client passed an unverified isAdminView
// boolean down from the calling view, so any buyer could POST a note that
// displayed as "Admin".
export async function POST(request, { params }) {
  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { text } = await request.json();
  const trimmed = (text || "").trim();
  if (!trimmed) return NextResponse.json({ error: "Note text required" }, { status: 400 });

  const [order] = await sql`select user_id from orders where id = ${id}`;
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  if (session.role !== "admin" && order.user_id !== session.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const isAdmin = session.role === "admin";
  let author = "Admin";
  if (!isAdmin) {
    const [profile] = await sql`select company from buyer_profiles where user_id = ${session.id}`;
    author = profile?.company || "Buyer";
  }

  const [note] = await sql`
    insert into order_notes (order_id, text, author, is_admin)
    values (${id}, ${trimmed}, ${author}, ${isAdmin})
    returning text, author, is_admin, created_at
  `;

  return NextResponse.json({ note: { text: note.text, author: note.author, date: note.created_at, isAdmin: note.is_admin } });
}
