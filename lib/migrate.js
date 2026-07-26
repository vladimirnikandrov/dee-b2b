// Database migration runner — applied automatically on every boot, wired up
// in instrumentation.js at the repo root.
//
// WHY THIS EXISTS
// Until 2026-07-26 there was no runner: db/ held hand-numbered .sql files that
// somebody had to remember to apply to production by hand. That is how the
// `sync_failures` table ended up missing in production while the code that
// queried it was already live — every admin-panel load 500'd on
// `relation "sync_failures" does not exist`, and fixing it needed a temporary
// admin-gated API route added, called once, and deleted again. Deploying the
// schema and deploying the code that depends on it must be the same action.
//
// RULES FOR WRITING A MIGRATION (read before adding one)
//  1. Migrations are append-only. Never edit or renumber one that has shipped —
//     it is recorded by id in schema_migrations and will not run again.
//  2. Every migration must be safe to run WHILE THE PREVIOUS RELEASE IS STILL
//     SERVING TRAFFIC. Railway overlaps deployments: the new instance boots and
//     migrates while the old one is still answering requests. So: add nullable
//     columns, add tables, backfill data. Do not drop or rename a column the
//     currently-live code still reads, and do not add a NOT NULL without a
//     default. Splitting a destructive change across two deploys is the price
//     of zero-downtime deploys.
//  3. They all run inside ONE transaction, so anything requiring its own
//     (`create index concurrently`, `vacuum`) does not belong here.
//  4. They must be individually idempotent anyway (`if not exists`, guarded
//     updates) — belt and braces if a record is ever lost.
import { sql } from "@/lib/db";
import { MIGRATIONS } from "@/db/migrations";

// Arbitrary but fixed. Any other advisory lock in this app must use a
// different number.
const ADVISORY_LOCK_KEY = 418041804;

/**
 * Applies every migration not yet recorded in schema_migrations.
 * Safe to call concurrently from multiple instances — the advisory lock
 * serializes them and the second one finds nothing left to do.
 *
 * @returns {Promise<{ applied: string[], alreadyCurrent: boolean }>}
 */
export async function runMigrations({ logger = console } = {}) {
  return sql.begin(async (tx) => {
    // Transaction-scoped so it releases on commit/rollback no matter what, and
    // is guaranteed to be taken and released on the same pooled connection —
    // a session-level pg_advisory_lock() would risk unlocking from a different
    // connection than it locked.
    await tx`select pg_advisory_xact_lock(${ADVISORY_LOCK_KEY})`;

    // Bound the wait. A migration's `alter table` needs an ACCESS EXCLUSIVE
    // lock, and during a rolling deploy the previous release is still holding
    // row locks — without a timeout, boot can block indefinitely behind a
    // long-running transaction and the container just hangs. Failing fast
    // instead surfaces as a failed deploy, which is recoverable; a hang is not.
    await tx`set local lock_timeout = '5s'`;
    await tx`set local statement_timeout = '120s'`;

    await tx`
      create table if not exists schema_migrations (
        id text primary key,
        applied_at timestamptz not null default now()
      )
    `;

    const rows = await tx`select id from schema_migrations`;
    const done = new Set(rows.map((r) => r.id));
    const pending = MIGRATIONS.filter((m) => !done.has(m.id));

    if (pending.length === 0) return { applied: [], alreadyCurrent: true };

    const applied = [];
    for (const migration of pending) {
      logger.log(`[migrate] applying ${migration.id}…`);
      await migration.run(tx);
      await tx`insert into schema_migrations (id) values (${migration.id})`;
      applied.push(migration.id);
    }
    return { applied, alreadyCurrent: false };
  });
}
