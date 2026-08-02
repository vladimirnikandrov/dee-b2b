// Migration 013 — move portal accounts off the retiring domain.
//
// `deeapril.com` expires 2026-12-16. Sign-in is a code emailed to the address
// on the account, so an account still registered at `@deeapril.com` locks
// itself out the day the domain lapses — quietly, months from now, with no
// error anyone would connect to the cause.
//
// Google keeps every old address as an alias on the renamed users, so mail to
// the old form still arrives; what has to move is the address the portal
// authenticates against. On production this is `contact@deeapril.com`
// (company "MAISON DEE", zero orders).
//
// Guarded on every side: only accounts on that exact domain, only when the
// maison-dee.com form doesn't already exist as a separate account (renaming
// into a collision would violate the unique index from migration 010 and, worse,
// merge two people), and `login_otps` rows follow so a code requested seconds
// before the deploy still verifies.

export default {
  id: "013-retire-old-domain-addresses",
  async run(tx) {
    const stragglers = await tx`
      select id, email from users where lower(email) like '%@deeapril.com'
    `;
    for (const u of stragglers) {
      const next = u.email.toLowerCase().replace(/@deeapril\.com$/, "@maison-dee.com");
      const [clash] = await tx`select id from users where lower(email) = ${next} and id <> ${u.id}`;
      if (clash) {
        console.warn(`[migrate 013] ${u.email} left alone — ${next} already exists as a separate account`);
        continue;
      }
      await tx`update users set email = ${next} where id = ${u.id}`;
      await tx`update buyer_profiles set email = ${next} where user_id = ${u.id}`;
      await tx`update login_otps set email = ${next} where lower(email) = ${u.email.toLowerCase()}`;
      console.warn(`[migrate 013] moved ${u.email} to ${next}`);
    }
  },
};
