import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

// One-off, admin-gated route to apply db/migration-004-sync-failures.sql to
// production — no interactive SQL console was reachable to run it directly.
// Runs the exact fixed DDL from that file (not arbitrary SQL), and is safe
// to call more than once (CREATE TABLE/INDEX IF NOT EXISTS). Delete this
// route once the migration has been confirmed applied — see CHANGELOG.
export async function POST() {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await sql`
    create table if not exists sync_failures (
      id uuid primary key default gen_random_uuid(),
      type text not null check (type in ('email', 'economic')),
      order_id text references orders(id) on delete set null,
      context text not null,
      error text not null,
      resolved boolean not null default false,
      created_at timestamptz not null default now()
    )
  `;
  await sql`
    create index if not exists sync_failures_unresolved_idx on sync_failures(resolved, created_at) where resolved = false
  `;

  return NextResponse.json({ success: true, migration: "004-sync-failures" });
}
