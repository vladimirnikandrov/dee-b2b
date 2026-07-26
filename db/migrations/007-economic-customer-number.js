// Migration 007 — remember which e-conomic customer card a buyer resolved to.
//
// `getOrCreateCustomer` used to search Dorte's customer list by exact company
// name on every single order, and create a card when the search came back
// empty. So "Dee Store", "DEE STORE" and "Dee Store " were three different
// customers in her live ledger, each with its own invoice history — and the
// weakness fired on every order, not once.
//
// Storing the resolved customerNumber against the buyer's profile means the
// lookup happens once per buyer account, ever. After that the name can be
// edited, re-cased or re-typed freely and the order still lands on the same
// card. It also removes the search from the critical path for every order
// after the first, which is one less thing that can fail mid-invoice.

const DDL = `
  alter table buyer_profiles add column if not exists economic_customer_number integer;
`;

export default {
  id: "007-economic-customer-number",
  async run(tx) {
    await tx.unsafe(DDL);
  },
};
