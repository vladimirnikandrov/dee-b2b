// Migration 005 — rewrite stored buyer countries to their canonical English
// names (see lib/countries.js).
//
// The checkout country field was free text until 2026-07-26, and the string it
// held was the input to the VAT decision in lib/vat.js. A buyer who wrote
// "Danmark" or "Deutschland" matched no branch and was classified as a 0% VAT
// export. The field is a <select> now, but existing rows still hold whatever
// was typed, and buyer_profiles is what prefills the next checkout — so
// without this backfill the very next order from an affected buyer would
// inherit the bad value again.
//
// SCOPE: buyer_profiles only. `orders.buyer_country` is deliberately left
// alone — those rows are the historical record of what was actually invoiced,
// and their VAT treatment is already frozen in vat_rate/vat_label/vat_amount.
// Rewriting them would change what lib/economic.js derives for an order that
// was booked months ago.
import { normalizeCountry } from "@/lib/countries";

export default {
  id: "005-canonical-country",
  async run(tx) {
    const rows = await tx`
      select id, country from buyer_profiles
      where country is not null and country <> ''
    `;

    for (const row of rows) {
      const canonical = normalizeCountry(row.country);
      // Unresolvable values stay untouched on purpose: guessing at what
      // someone meant is exactly the failure mode this whole change removes.
      // CountrySelect surfaces them as "not recognized, please reselect", and
      // POST /api/orders refuses to price an order until one is picked.
      if (!canonical) {
        console.warn(`[migrate 005] buyer_profiles ${row.id}: cannot resolve country ${JSON.stringify(row.country)} — left as-is, buyer will be asked to reselect`);
        continue;
      }
      if (canonical === row.country) continue;
      // Guarded on the value we read, not just the id: during a rolling deploy
      // the previous release is still serving PUT /api/profile, and an
      // unguarded write here would silently revert a save someone made in the
      // seconds between the select and the update.
      const updated = await tx`
        update buyer_profiles set country = ${canonical}
        where id = ${row.id} and country = ${row.country}
        returning id
      `;
      if (updated.length === 0) {
        console.warn(`[migrate 005] buyer_profiles ${row.id}: changed underneath us, left alone`);
        continue;
      }
      console.log(`[migrate 005] buyer_profiles ${row.id}: ${JSON.stringify(row.country)} -> ${JSON.stringify(canonical)}`);
    }
  },
};
