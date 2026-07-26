// Migration 008 — record the VAT that sits inside the shipping charge.
//
// Dorte's accountant settled the open question on 2026-07-26: freight follows
// the goods into the same VAT bracket, and the quoted shipping price is the
// FINAL price the buyer pays, VAT already inside it. So a 35.00 shipping charge
// on a 25% order is 28.00 + 7.00 VAT, not 35.00 + 8.75 on top. Same money out
// of the buyer's pocket, but the VAT now has to be declared instead of being
// silently absent from the invoice.
//
// That splits one number into two, so the columns have to say which is which:
//   shipping_amount     — NET. What goes on the invoice line and what
//                         e-conomic receives as unitNetPrice.
//   shipping_vat_amount — the VAT inside the charge. NEW here.
//   deposit_amount      — GROSS (net + vat). Unchanged meaning: the total of
//                         the shipping-only first invoice, i.e. what is asked
//                         for. Already held exactly this.
//   vat_amount          — now goods VAT PLUS shipping VAT, because that is the
//                         VAT total printed on the invoice.
// So `shipping_amount + shipping_vat_amount = deposit_amount` on every new row.
//
// EXISTING ROWS ARE LEFT ALONE. Their shipping_amount is the old
// no-VAT-anywhere figure and their vat_amount covers goods only. That is what
// those buyers were actually invoiced, and lib/economic.js already derives an
// order's e-conomic VAT zone from the frozen orders.vat_rate rather than
// recomputing, so nothing re-books history. Backfilling would rewrite issued
// documents to say something they never said. Production had no orders at all
// when this shipped, so the mixed-shape window covers nothing real.

const DDL = `
  alter table orders add column if not exists shipping_vat_amount numeric not null default 0;
`;

export default {
  id: "008-shipping-vat",
  async run(tx) {
    await tx.unsafe(DDL);
  },
};
