// Migration 006 — record what an order has already produced in Dorte's live
// e-conomic accounting, so the same invoice draft can never be posted twice.
//
// Each order legitimately produces exactly two drafts: the shipping invoice at
// order creation, and the full order value when an admin flips
// `balance_invoiced` on. But that status is a toggle and nothing recorded that
// the draft already existed, so switching it off and on again put a second
// identical draft into her real books.
//
// THREE COLUMNS PER INVOICE, NOT ONE, because "we started" and "it worked" are
// genuinely different states and collapsing them loses the difference:
//   *_claimed_at  — an attempt is in flight. This is the lock: lib/economic.js
//                   sets it with an UPDATE ... WHERE ... IS NULL, so exactly one
//                   of any number of concurrent or repeated attempts proceeds.
//                   Cleared again only when the draft provably was NOT created.
//   *_synced_at   — the draft exists. Written after e-conomic confirms.
//   *_draft_number— e-conomic's own id for it, when the response gives us one.
// With a single column, a process death between claiming and creating would
// mark the order synced forever with no invoice in her books and no way to tell
// that apart from success. Split, that state is visible (claimed, never synced)
// and self-healing: the claim goes stale after a while and a retry can take it.
//
// Additive and nullable, so the previous release — which knows nothing about
// these columns — keeps working while the new one rolls out. Note that
// `alter table` still takes a brief ACCESS EXCLUSIVE lock, so a request the old
// release is serving at that instant can block on it or, if it is mid
// transaction on `orders`, fail with a cached-plan error. The window is
// milliseconds on a table this size, but it is not literally zero.

const DDL = `
  alter table orders add column if not exists economic_deposit_claimed_at timestamptz;
  alter table orders add column if not exists economic_deposit_synced_at timestamptz;
  alter table orders add column if not exists economic_deposit_draft_number integer;
  alter table orders add column if not exists economic_balance_claimed_at timestamptz;
  alter table orders add column if not exists economic_balance_synced_at timestamptz;
  alter table orders add column if not exists economic_balance_draft_number integer;
`;

export default {
  id: "006-economic-sync-tracking",
  async run(tx) {
    await tx.unsafe(DDL);

    // Orders already invoiced before this migration existed: mark them both
    // claimed and synced so the next status toggle doesn't post a duplicate of
    // an invoice that is already in her books. The draft number is unknown for
    // these — null there means "synced before we started recording numbers",
    // not "never synced", which is why the claim keys off the timestamps.
    await tx`
      update orders
      set economic_deposit_claimed_at = coalesce(economic_deposit_claimed_at, created_at),
          economic_deposit_synced_at  = coalesce(economic_deposit_synced_at, created_at)
      where status_deposit_invoiced = true and economic_deposit_synced_at is null
    `;
    await tx`
      update orders
      set economic_balance_claimed_at = coalesce(economic_balance_claimed_at, created_at),
          economic_balance_synced_at  = coalesce(economic_balance_synced_at, created_at)
      where status_balance_invoiced = true and economic_balance_synced_at is null
    `;
  },
};
