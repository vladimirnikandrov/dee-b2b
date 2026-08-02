// Migration 011 — bring `sync_failures` under the migration runner.
//
// The table was created on production by hand in July (db/migration-004-sync-failures.sql,
// applied through a temporary admin-gated route before the runner existed) and
// added to db/schema.sql. Every path since then has covered it: production has
// it, and a database created fresh from schema.sql gets it.
//
// What nothing covered is a database that predates schema.sql's version of it —
// a clone restored from an older dump, or a developer's local copy from the
// original Supabase export. There the table is simply absent, and the admin
// panel's sync-failure fetch 500s with no clue why. That is exactly the gap the
// runner exists to close, so the table belongs here too.
//
// Idempotent by construction: production and fresh databases run this as a no-op.

export default {
  id: "011-sync-failures-table",
  async run(tx) {
    await tx.unsafe(`
      create table if not exists sync_failures (
        id uuid primary key default gen_random_uuid(),
        type text not null check (type in ('email', 'economic')),
        order_id text references orders(id) on delete set null,
        context text not null,
        error text not null,
        resolved boolean not null default false,
        created_at timestamptz not null default now()
      );
      create index if not exists sync_failures_unresolved_idx
        on sync_failures(resolved, created_at) where resolved = false;
    `);
  },
};
