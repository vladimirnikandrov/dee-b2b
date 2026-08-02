// Migration 012 — let an account be switched off without being deleted.
//
// The portal went invite-only on 2026-08-02, which makes the account itself the
// access control: whoever holds one can see the whole trade price list. There
// was no way to take one back. Deleting isn't the answer for a buyer who has
// ordered — those rows are Dorte's accounting record and carry the e-conomic
// draft numbers — so access and history are separated here.
//
// Nullable and additive, so the previous release keeps serving through the
// overlap: code that doesn't know about the column simply ignores it.

export default {
  id: "012-deactivate-buyers",
  async run(tx) {
    await tx.unsafe(`alter table users add column if not exists deactivated_at timestamptz`);
  },
};
