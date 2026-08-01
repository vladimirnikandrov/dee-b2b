// Migration 010 — make email identity case-insensitive.
//
// Every lookup was `where email = ${email}` against a plain `text unique`
// column, so `Da@maison-dee.com` and `da@maison-dee.com` were two different
// people. A buyer who capitalised their address once at registration and not
// the next time got a second account, an empty order history, and no way to
// see the orders they had already placed. Nothing in the app ever normalised
// the input.
//
// The fix is a unique index on `lower(email)` plus `citext`-style comparison in
// the routes. A functional index is preferred over converting the column to
// `citext` because the extension is not guaranteed to be installed on Railway's
// Postgres and a failed `create extension` would take the boot down.

export default {
  id: "010-case-insensitive-email",
  async run(tx) {
    // Collapse any duplicates that already exist before the unique index can
    // be created, oldest account wins. There are none in production today —
    // this is here so the migration is safe on any copy of the database,
    // including local ones seeded from older exports.
    const dupes = await tx`
      select lower(email) as key, count(*) as n
      from users group by lower(email) having count(*) > 1
    `;
    for (const d of dupes) {
      const rows = await tx`
        select id, email from users where lower(email) = ${d.key} order by created_at asc
      `;
      const keep = rows[0];
      for (const loser of rows.slice(1)) {
        // Move anything that points at the duplicate onto the surviving row
        // rather than deleting it — these are real orders.
        await tx`update orders set user_id = ${keep.id} where user_id = ${loser.id}`;
        // buyer_profiles is one-per-user, so the loser's can only be carried
        // over if the survivor has none. Dropping it outright would throw away
        // a real delivery address — likelier to be the current one, since it
        // belongs to the account that was created later.
        await tx`
          update buyer_profiles set user_id = ${keep.id}
          where user_id = ${loser.id}
            and not exists (select 1 from buyer_profiles where user_id = ${keep.id})
        `;
        await tx`delete from buyer_profiles where user_id = ${loser.id}`;
        await tx`delete from users where id = ${loser.id}`;
        console.warn(`[migrate 010] merged duplicate account ${loser.email} into ${keep.email}`);
      }
    }

    await tx.unsafe(`
      create unique index if not exists users_email_lower_idx on users (lower(email));
    `);

    // Normalise what is stored so the value shown in the admin panel matches
    // what people actually type.
    await tx`update users set email = lower(email) where email <> lower(email)`;
    await tx`update login_otps set email = lower(email) where email <> lower(email)`;
  },
};
