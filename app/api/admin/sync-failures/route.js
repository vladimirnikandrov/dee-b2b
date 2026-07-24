import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

// GET: recent unresolved failures first, then a bit of resolved history for context.
export async function GET() {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const failures = await sql`
    select id, type, order_id, context, error, resolved, created_at
    from sync_failures
    order by resolved asc, created_at desc
    limit 100
  `;
  return NextResponse.json({ failures });
}

// PATCH: mark one failure resolved (dismiss from the admin panel).
export async function PATCH(request) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await request.json();
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  await sql`update sync_failures set resolved = true where id = ${id}`;
  return NextResponse.json({ success: true });
}
