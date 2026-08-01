// Migration 009 — remember every e-conomic draft an order has ever produced,
// not just the latest one.
//
// When an order's lines are edited after its full-order draft was posted, that
// draft becomes wrong and has to be deleted by hand in e-conomic — nothing here
// can retract a document already in her books. The edit therefore keeps
// `economic_balance_draft_number` precisely so she can find it.
//
// But the re-issue then overwrote that number with the new draft's, and the
// stale one became untraceable: still sitting in the live ledger, no longer
// referenced anywhere. Two edits in a row lost two documents.
//
// So superseded numbers move into an array before the column is reused. The
// admin panel lists them as "also in e-conomic, delete these", and the list only
// ever grows, because a document in someone's accounting does not disappear
// because our column got reassigned.

const DDL = `
  alter table orders add column if not exists economic_superseded_drafts integer[] not null default '{}';
`;

export default {
  id: "009-economic-superseded-drafts",
  async run(tx) {
    await tx.unsafe(DDL);

    // Orders already carrying a superseded draft when this shipped: an edit had
    // cleared the sync timestamps but kept the number, which is exactly the
    // "stale document, never re-issued" state. Seed the array from it so those
    // numbers survive the next re-issue.
    await tx`
      update orders
      set economic_superseded_drafts = array[economic_balance_draft_number]
      where economic_balance_draft_number is not null
        and economic_balance_synced_at is null
        and economic_superseded_drafts = '{}'
    `;
  },
};
