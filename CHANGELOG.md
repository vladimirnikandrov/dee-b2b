# Changelog

All notable changes to **Dee B2B** (order.deeapril.com / order.maison-dee.com).
Format loosely follows [Keep a Changelog](https://keepachangelog.com/).
As of 2026-07-24, the `web` service is connected directly to this repo's `main` branch on Railway — every push auto-deploys, no CLI/token needed. Before that, deploys went via `railway up --ci --service web` independent of git pushes; see `CLAUDE.md`. As of 2026-07-18, every deployed change also gets a dated entry here in the same session — see the standing workflow rule at the top of `CLAUDE.md`. Versions referenced from the Vercel era (e.g. "v9") are informal milestones kept for history.

---

## [Unreleased] — current backlog

Nothing in progress. Don't start any of these without an explicit ask from Vladimir.

1. **Move Railway/Resend/GitHub off Vladimir's personal accounts onto Dorte's own** — Cloudflare and the domain registrar are already sorted (per Vladimir, 2026-07-24); these three are what's left. e-conomic does not need it — already her own agreement (1797386 / DA DESIGN ApS).
2. **Move the Resend sender to `order@maison-dee.com`.** The mailbox now exists and every other address in the code already points at it; `lib/seller.js` is done. What is left is blocked purely by the Resend plan's one-domain limit: `deeapril.com` holds the only slot, and freeing it stops all outbound mail — OTP codes included, so nobody can sign in — until `maison-dee.com` verifies. Either upgrade the plan (no outage) or pick a quiet window, then set `RESEND_FROM_EMAIL` in Railway. Must happen before 2026-12-16 regardless, or sending breaks by itself when the domain lapses.
3. **A reused e-conomic customer card keeps its old `vatZone`/country.** `getOrCreateCustomer` deliberately does not write back to an existing card — Dorte maintains those by hand for her ~15 existing wholesale customers, and the invoice's own VAT treatment comes from the draft's `recipient` block regardless, so overwriting her records from checkout form data would risk destroying real information to fix a reporting-only discrepancy. Left as-is on purpose; revisit only if her customer list turns out to disagree with reality in a way that matters.

The longstanding tech-debt items previously listed here (monolith split, no TS/tests, silent sync failures) have all been worked through as of 2026-07-24 — see the dated entries below. DEE 04/05 pricing confirmed fine as-is (Vladimir, 2026-07-24) — no longer a backlog item. From the 2026-07-26 audit: free-text country and e-conomic draft idempotency were resolved the same day, and draft traceability + customer duplication the same evening — all four are in the dated entries below.

---

## 2026-07-29 — Email identity moved to maison-dee.com

`deeapril.com` expires **2026-12-16**, so the whole email identity moved to `maison-dee.com` while there is still time to do it calmly.

**In Google Workspace:** `maison-dee.com` added as a *secondary* domain — not a user-alias domain, because only a secondary can later be promoted — and verified by TXT rather than by handing Google OAuth write access to the entire Cloudflare zone. MX, SPF, DMARC and DKIM published for it. The primary domain was then switched to `maison-dee.com`, which automatically demoted `deeapril.com` to secondary. All five accounts renamed to `@maison-dee.com`; Google keeps each previous address as an alias automatically, so nothing sent to an old name is lost. `deeapril.com` is deliberately LEFT as a secondary domain rather than converted to a domain alias — the per-user aliases already cover continuity, and a domain alias would keep minting addresses on a domain that is being retired.

**In this codebase** — every address except the actual sender: `lib/seller.js` (seller contact printed on invoices) and `lib/email.js` (`ADMIN_EMAIL` recipient, the footer line on every email, the "contact us at" line on cancellations, and the `PORTAL_URL` fallback). Safe to ship immediately: `order@maison-dee.com` is a real mailbox that receives, and the From address is env-driven and untouched, so sending is unaffected by this deploy.

**Not changed, on purpose:** the privacy policy and EULA still name *both* `order.deeapril.com` and `order.maison-dee.com`. Both really do serve the portal today, and dropping the old one would leave anyone arriving on that URL covered by a document that doesn't mention it. They get cleaned up when the domain is actually retired.

**Transcription note:** the Google DKIM key had to be copied by hand from a screenshot, and three characters came across wrong — `I` (capital i) versus `l` (lowercase L), indistinguishable in the console's font. Google refused to verify, correctly. Caught by decoding the base64 as a DER RSA key locally and then diffing character-by-character against the console's own copy. Anything hand-copied from a screenshot deserves that kind of check before it goes anywhere near DNS.

---

## 2026-07-27 — Email and invoice presentation

**Email logo halved** (100px to 50px in a 560px email). It was reading as a banner rather than a mark.

**Invoice PDFs stay plain A4.** Sizing the page to its content was tried and reverted the same day — it previewed better as an email attachment, but these are accounting documents and a non-standard page size is the worse trade.

**Black fill now overshoots the page edge.** Filling exactly `0,0,W,H` left a ~0.004pt uncovered sliver at the right edge from mm-to-point conversion. Verified the rendered page has zero non-black edge pixels. Note: the white outline visible around the attachment in Apple Mail is the mail client's own page border, not part of the document — that one isn't ours to remove.

## 2026-07-26 (late) — Shipping VAT: Option 2, and two destination rates

Dorte's accountant answered the open question. Freight follows the goods into the same VAT bracket, and **the quoted shipping price is the final price the buyer pays, VAT already inside it** — never added on top. She also asked for two rates: **Denmark 9.25 EUR, everywhere else 35.00 EUR**. Both are live.

The bug this closes: shipping was charged with no VAT anywhere in the app, but sent to e-conomic as a NET price, so it added 25% on domestic-zone orders and booked 43.75 against an invoice that said 35.00. Every DK and EU-without-VAT-ID order would have disagreed with the books by 8.75.

**One quoted number now splits into two stored ones** (migration 008):

| column | meaning |
|---|---|
| `shipping_amount` | NET — the invoice line, and e-conomic's `unitNetPrice` |
| `shipping_vat_amount` | the VAT inside the charge (new) |
| `deposit_amount` | GROSS — the shipping-only first invoice, what the buyer actually pays |
| `vat_amount` | goods VAT **plus** shipping VAT, i.e. the invoice's VAT total |
| `balance_amount` | goods + goods VAT only — must never pick up the shipping VAT, or the two invoices double-count it |

A Danish order of 500.00 in goods: shipping 7.40 net + 1.85 VAT = 9.25 gross; VAT total 126.85; shipping invoice 9.25, full invoice 625.00, order total 634.25. The buyer pays the same 9.25 they were quoted, and the VAT is now declared instead of silently absent.

Verified end-to-end by placing real orders through the API for all four VAT cases (DK, EU-no-VAT-ID, EU reverse charge, export) and reading back what was stored — the buyer is never charged more than the quoted rate in any of them, and `deposit + balance == total` exactly.

Documents now list **shipping above the VAT line** on the invoice view, the PDF, the confirmation email and the checkout summary. With shipping underneath, the document read as though the VAT covered only the goods, which on a tax document is worse than untidy. Checkout also spells out the gross ("Shipping (9.25 incl. VAT)") so a Danish buyer told "shipping is 9.25" doesn't see 7.40 and think the quote moved.

**Existing rows are deliberately not backfilled.** Their `shipping_amount` is the old no-VAT-anywhere figure and their `vat_amount` covers goods only — which is what those buyers were actually invoiced. Rewriting them would make issued documents say something they never said. Production had zero orders when this shipped, so the mixed-shape window covers nothing real.

**Order edits keep the order's own shipping split** rather than re-pricing freight from the current rate table — a quantity change is not a reason to move a buyer onto a rate they never agreed to.

A four-lens adversarial review (21 findings, all 21 refuted on verification) produced no defects but did surface real nits, all fixed: the checkout summary hadn't been reordered with the other three surfaces; a `??` fallback chain in `lib/economic.js` was unreachable and its comment claimed protection it didn't provide; an `stillHasItems` branch was dead because an emptied order already 400s earlier; the CSV headers didn't say which shipping figure was which. One test was correctly called tautological and was replaced with **the property e-conomic actually depends on** — that `net x 1.25` re-grosses to exactly the quoted figure. It does not hold for every rate (about a fifth of cent values fail at 25%), both configured rates satisfy it, and the test now fails loudly if someone sets one that doesn't.

## 2026-07-26 (evening) — e-conomic traceability and customer matching

Both resolved by reading e-conomic's own published JSON schemas rather than guessing, which is what had them blocked: `restapi.e-conomic.com/schema/invoices.drafts.{post,get}.schema.json` and `customers.get.schema.json`.

**Drafts now carry the order number.** A draft sitting in Dorte's agreement had nothing on it identifying which order produced it — balance-draft lines don't even have descriptions — so reconciling her books against this app meant matching on amounts and dates. It now goes in `references.other`, which the schema confirms is a free string up to 250 chars **and** `filterable`, so a draft can be found by order id through the API too. Chosen over putting the id in each line's `description`, which would have changed the text printed on the invoices she sends to customers; this doesn't touch them. The same schema check also confirmed `draftInvoiceNumber` is the right field for the draft id we store — that had been a defensive guess.

**Customer cards are resolved once per buyer, not re-matched on every order.** The lookup was `filter=name$eq:<whatever the buyer typed>` every single time, so "Dee Store", "DEE STORE" and "Dee Store " would each get their own card in her live ledger with a slice of the same company's invoice history. The resolved `customerNumber` is now stored on the buyer's profile (migration 007), so after the first order the name can be re-typed or re-cased freely and it still lands on the same card — and later orders skip the lookup entirely. The one-time lookup itself now tries the **VAT number** first (`vatNumber`, then `corporateIdentificationNumber`) before falling back to the name, since a VAT number identifies a company and a typed name identifies a spelling; a new card is created with the VAT number on it so the next match has something real to work with.

**Filter values are escaped.** e-conomic's filter syntax uses `$` for both operators and escaping, so a company name containing `$ ( ) * , [ ]` didn't merely fail to match — it corrupted the query into a different one. Escaped per their documented scheme, with tests.

Verified by running the real `syncInvoiceToEconomic` against a stubbed transport and validating the exact outgoing payload against e-conomic's published POST schema: no unknown fields, no missing required ones, `references.other` within its length limit. Confirmed the second order for a known buyer issues zero customer requests. No live draft was created — that would have written into Dorte's real accounting.

---

## 2026-07-26 — Country picker, e-conomic idempotency, automatic migrations

Closes backlog items 4 and 5 from the audit entry below, plus the delivery problem that made them awkward to ship. Reviewed by a second multi-agent pass (5 lenses × adversarial verification) before deploying.

**Migrations now apply themselves (`lib/migrate.js`, `instrumentation.js`, `db/migrations/`)**
- There was no runner: `db/migration-00X.sql` files had to be remembered and applied by hand. That is how `sync_failures` ended up missing in production while the code querying it was already live — every admin-panel load 500'd, the client swallowed it and rendered "no failures", and fixing it needed a temporary admin-gated route added, called once and deleted (see 2026-07-24 below).
- Migrations are now JS modules in `db/migrations/`, applied at boot from Next.js's `instrumentation` hook, inside one transaction under a `pg_advisory_xact_lock` and recorded in a `schema_migrations` ledger. Concurrent boots serialize; the second finds nothing to do. Verified against a local copy: applied cleanly, second boot a no-op.
- A failed migration is deliberately fatal, via an explicit `process.exit(1)` — **not** by throwing. The review caught that throwing here does not do what it looks like: measured against Next.js 15.5.18, the rejection is swallowed by `prepare().catch(console.error)`, the port stays bound, and the process keeps running while returning HTTP 500 for every request including fully static pages — and because both the instrumentation and prepare promises are memoized, it never retries and never recovers even after the database comes back. A throw would have turned a transient database blip into a permanent outage of the whole shop. A non-zero exit gives the intended behaviour instead: during a deploy the new container never becomes healthy so the **previous version keeps serving**, and on a restart it retries from a clean process. Verified by running the real production build against an unreachable database: exit code 1, connection refused, no 500s. Five retries over ~37s first, so a cold database doesn't fail a deploy.
- The migration transaction sets `lock_timeout` and `statement_timeout`, so a migration that can't get its table lock (the previous release still holds row locks during a rolling deploy) fails fast instead of hanging boot indefinitely.
- The DB import lives in `instrumentation-node.js`, imported only inside `if (process.env.NEXT_RUNTIME === "nodejs")`. That exact shape is required: written as an early `return`, the bundler still tries to compile `postgres` for the edge runtime and the build errors with "Can't resolve 'net'".
- Rules for writing one are at the top of `lib/migrate.js`. The important one: Railway overlaps deployments, so a migration must be safe while the *previous* release is still serving.

**Country is a picker now, not free text (`lib/countries.js`)**
- The old check compared the typed country against a hardcoded array of English EU names, so "Deutschland", "Belgique" or a typo matched nothing, fell through every branch to "Export (0% VAT)", and the buyer was invoiced with no VAT on goods they owed 25% on. Silent: nothing errored, the order was just taxed wrong.
- Checkout and profile now use a `<select>` over a canonical ISO list; `getVatInfo` resolves via code, not spelling, so local-language names and ISO codes all classify correctly. `POST /api/orders` refuses an unresolvable country outright, so one can no longer reach the database.
- Existing rows are handled rather than ignored: migration 005 canonicalizes `buyer_profiles.country` (logging every change and anything it can't resolve), the client normalizes on profile load and on repeat-order, and a value that still can't be resolved is shown in the picker as a disabled "not recognized, please reselect" option — visible, not silently blank, and not re-selectable into the same dead end.
- `orders.buyer_country` is deliberately **never** rewritten: it is the record of what was invoiced. The CSV export normalizes for display only, so the column doesn't mix "Danmark" and "Denmark" as separate values in a pivot.
- Territories outside the EU VAT area (Greenland, Faroes, Åland, the French DOMs) are separate entries, which keeps them on the export branch — exactly what the old array did, since none of them appeared in it. Continuity, not a new tax judgment.

**e-conomic drafts are idempotent (`lib/economic.js`, migration 006)**
- `balance_invoiced` is a toggle and nothing recorded that a draft had been posted, so switching it off and on again put a second identical draft into Dorte's live books. There are now two timestamps per invoice — `economic_*_claimed_at` (an attempt is in flight; this is the lock) and `economic_*_synced_at` (the draft exists) — because a single column would mark an order done forever if the process died between claiming and creating, indistinguishably from success. Verified: 5 concurrent claims produce exactly 1 winner; a confirmed draft can't be re-claimed; a claim released after a pre-send failure can; a claim orphaned by a crash goes stale after 15 minutes and self-heals.
- A claim is handed back **only when the draft provably was never sent** (bad customer lookup, unmapped SKU, empty lines). If the create request was already on the wire when it failed — a dropped connection, the 20s timeout — the lock is kept and the sync-failure row says in plain words that a draft may exist and someone has to check e-conomic before re-issuing. Releasing there would have booked a real duplicate. Delivery is at-least-once and can't be better without an idempotency key from e-conomic; the design biases towards never duplicating.
- Migration 006 backfills already-invoiced orders as synced, so the first toggle after deploying doesn't duplicate an invoice that already exists.
- **Editing an order's lines clears the balance claim.** That off/on cycle is the only re-issue path the admin panel has, and after a line edit the posted draft is stale — an unconditional claim would have quietly removed the one legitimate way to correct it. The old draft *number* is kept on purpose: that document is still sitting in her accounting and has to be deleted by hand, so the admin panel shows it as "#N superseded — delete it in e-conomic" rather than throwing away the one thing that would let her find it.
- The admin badge has four states, not two: a draft that exists (green, with its number), one still being sent (grey — the sync is fire-and-forget, so this is normal for a second after toggling), one superseded by an order edit (blue), and one that genuinely never went (amber). Two states would have shown the normal in-flight second as a failure and invited a re-toggle of an invoice that did go out.
- The VAT zone now comes from the frozen `orders.vat_rate` instead of recomputing `getVatInfo`. Without this, improving country matching would re-book history: a legacy order stored as "Deutschland" was invoiced at 0%, and a fresh computation resolves it to Germany at 25%, which would put a domestic-zone draft 25% above the invoice the buyer holds into her live accounting. Pinned by a regression test.
- A failed customer lookup used to fall straight through to the create branch — a 401 or a transient 500 meant no `collection` in the body, which read as "not found" and produced a **duplicate customer card**. It now refuses and records a sync failure. All e-conomic calls have a 20s timeout, so a hung request can't hold the claim indefinitely.
- The admin panel shows, per order, whether each invoice actually reached e-conomic and under which draft number. Previously a draft that silently never got created looked identical to one that did.
- First tests for `lib/economic.js` — the module that touches a real accounting system had none.

**Also**
- `PATCH /api/orders/[id]/status` is a compare-and-swap and returns 409 on a lost race. Two simultaneous toggles (a double-click, or Vladimir and Dorte at once) both read the old value, both computed "turning on", and both sent the invoice email; now one wins and the other is told to reload.
- The confirm dialog's buttons stay live for the 170ms it takes to animate out — a second click in that window fired the action twice. Both buttons are now disabled once it starts closing.
- The profile page warns when the saved country can't be resolved, instead of letting someone save a profile they then can't order with.

---

## 2026-07-26 — Audit pass: security, correctness, UX and animation

A 12-agent review (6 reviewers × 6 adversarial verifiers) went over React correctness, API/auth, money logic, buyer UX, admin UX and animation/CSS. 70 findings, 69 survived verification; the ones that were safe to act on now are below. Three that need Dorte's or an accountant's decision were deliberately left alone and written into the backlog above instead.

**Security / auth**
- `/api/economic/callback` reflected its `token` query param into an HTML response with no escaping and no auth — a link like `?token=<img onerror=…>` executed script on our own origin, and because the session cookie is `sameSite:"lax"` it ran fully authenticated as whoever opened it (for an admin: read every order, add an admin, delete orders). Now admin-gated and HTML-escaped.
- Removing an admin didn't actually remove anything: `getSession()` trusted the 30-day JWT's `role` claim, so a demoted account kept full admin — including re-promoting itself — until the cookie expired. The role is now re-read from the DB on every authenticated request, which also means promoting a signed-in buyer takes effect immediately instead of after a sign-out.
- The OTP 5-attempt cap was a read-then-write race: concurrent requests all read `attempts = 0` and each got a free guess, so the cap was really "unlimited attempts per burst" against the app's only authentication factor. Check and increment are now a single atomic `UPDATE … WHERE attempts < N`. A successful login also retires every outstanding code for that email, not just the one used.

**Correctness**
- Buyers' "Confirm Receipt" button was dead: it hit an admin-only route and 403'd every time, and the shipped email's CTA linked straight to it. The status route now allows exactly one buyer action — set `received`, on their own shipped order, never a toggle back off — and returns the same 403 for "not found" and "not yours" so sequential order ids can't be probed.
- Toggling any status ON for a cancelled order still emailed the buyer about it (and re-issued invoices); now blocked, while turning statuses off stays allowed for cleanup.
- Toasts fired from the invoice and auth screens never rendered at all — `<Toast>` was mounted per-view and those views had none — and because the auto-hide timer lived inside the unmounted component, the message stayed queued and popped up out of context on the next screen that did mount one. There's now a single app-level Toast.
- An emailed `?order=` deep link rendered a real-looking €0.00 invoice under the deep-linked order number while the fetch was in flight, and stayed there forever if the id was mistyped or belonged to someone else. Now shows a loading state, then a proper "order not found".
- Signing in from a deep link dropped the link and dumped the user on the catalogue; it now lands on the order.
- The client fell back to a hardcoded `MOODSCENTBAR` promo whenever the promo table was empty or the fetch failed — the buyer confirmed a discounted total and was invoiced full price. Fallback removed, and the order route now rejects an unknown promo code instead of silently pricing without it.
- A promo price of `0` or `""` (the admin form stores prices as strings) sold that size for free; only a positive number overrides the catalogue price now, client and server, with tests.
- Signing out overwrote the saved profile with whatever was in form state even if a profile had never loaded.
- One "Save All" after a failed inventory load would have written stock 0 across all 21 SKUs — the failure path wiped local state to `{}` and every input rendered as 0. It now keeps the last good data and the button is disabled until a load succeeds.
- Order-edit quantity ceilings were the remaining free stock rather than the order's own quantity plus remaining stock, silently shrinking orders; restore failed permanently on any order containing an untracked SKU; the edit route hardcoded 35 instead of `SHIPPING_FLAT`; and buyers could still edit quantities after the full invoice had been emailed and booked (now limited to the same window as self-cancel).
- A failed invoice PDF meant the buyer got no email at all and nothing surfaced anywhere; it now falls back to sending without the attachment and records the failure in the Sync Failures panel.

**UX**
- Buyers can finally see order status in My Orders (current stage + a 7-step progress dot row) — the data was already there, only emails ever showed it. Cancelled orders now read as cancelled: red-tinted border, struck-through total, dimmed line items.
- Invoice status toggles now confirm before sending: one click used to email a legally-meaningful invoice and push an accounting draft, from pills sitting 6px apart with a hover-scale.
- Auth screens are real `<form>`s (Enter submits) with a busy state — double-clicking Send Code previously emailed two codes, of which only the newest worked. The OTP field autofocuses and accepts the OS one-time-code autofill.
- Checkout names the missing required fields instead of just greying the button, and flags an empty cart; the confirm dialog no longer quotes a fake client-generated order number.
- Admin: free-text order search (id / email / company), CSV exports the filtered set with ISO dates and a Full Invoice column, delete-promo confirms, promo prices are validated, unsaved inventory edits are marked and no longer clobbered by a background reload, sync-failure rows link through to their order, and revenue totals exclude cancelled orders.
- Repeat Order clamps to current stock (and says so) rather than prefilling quantities the server will reject.

**Animation / polish**
- The toast lost its centring for the whole entry animation and rendered half a width off-centre, then snapped — the keyframe animated `transform` without repeating the `translateX(-50%)`. It's now one keyframe covering rise-in, hold and fade-out, sized to the same duration as the hide timer so the two can't drift; duration scales with message length; long messages wrap instead of overflowing the viewport.
- The CANCELLED watermark on screen was 8%-alpha red on a black card — mathematically invisible. Now legible at 30%.
- ConfirmModal animates closed and responds to Escape; catalogue stagger caps after the 4th section (it was making below-the-fold sections wait ~0.75s); the landing page reveals in document order instead of buttons-before-copy.
- Added `prefers-reduced-motion` support, `:focus-visible` rings for keyboard users, dark scrollbars, and mobile breakpoints for the admin inventory/promo grids and the floating cart bar.

Verified by hand against real production data: real OTP admin sign-in, order search, My Orders status chips, invoice deep links (valid, invalid, and mid-load), checkout maths, and toast behaviour instrumented via MutationObserver.

## 2026-07-24 — sync_failures migration applied to production

Ran `db/migration-004-sync-failures.sql` against production via a temporary admin-gated `POST /api/admin/migrate` route (added, called once via the real admin OTP session, confirmed the table exists via `GET /api/admin/sync-failures` returning `{"failures":[]}`, then removed — its job was done, no reason to leave a schema-migration endpoint sitting in the admin panel). The "Sync Failures" admin panel section now actually has something to read from.

## 2026-07-24 (latest) — Split app/DeeB2B.js into per-view components

Addresses the last standing tech-debt item: the ~1450-line single-file monolith is now `app/DeeB2B.js` (state, server calls, routing — unchanged logic) plus seven presentational view components under `app/components/`: `LandingView`, `ProfileView`, `CatalogView`, `CheckoutView`, `MyOrdersView`, `AdminView` (the biggest, ~330 lines — promo codes, inventory, buyers, admins, sync failures, error log, company cards, orders table), and `InvoiceView`. Shared building blocks (`Logo`, `Toast`, `ConfirmModal`, `NoteSection`, `AuthScreen`, `Header`/`UserNav`, constants) live in `app/components/shared.js`, imported directly by whichever views need them rather than passed down as props.

This was a pure structural refactor — every view's JSX moved verbatim, no behavior changed. Verified by hand against the real (local `.env.local`, same production data) app: logged in as admin via the real OTP flow, walked through Landing → Admin login → Admin panel (promo codes/inventory/buyers/admins/companies/orders all rendering real data) → Catalog (correct stock badges, 2/20/50/100 ML order) → Checkout (correct VAT/shipping/total math on a real line item) → My Orders → Shipping Invoice (real historical order, all figures correct) → Profile. No new test coverage needed since the underlying logic in `lib/` (already covered by the Vitest suite) didn't change.

## 2026-07-24 (latest) — Admin-visible alert for failed emails/e-conomic syncs

Addresses the last "silent sync failures" tech-debt item: fire-and-forget email (`lib/email.js`) and e-conomic (`lib/economic.js`) calls now also persist to a new `sync_failures` table (via `lib/sync-failures.js`, itself fire-and-forget so a logging failure can never become a real one) right where they already `console.error`. New "Sync Failures" section in the admin panel (`app/api/admin/sync-failures` — GET unresolved-first, PATCH to dismiss) shows what failed, for which order, and when, with a one-click dismiss once handled. Needs `db/migration-004-sync-failures.sql` applied to production — see backlog above.

## 2026-07-24 (latest) — Test suite + lightweight type-checking

Addresses the "no TypeScript, no automated tests" tech debt: added Vitest (`npm test`) with 23 tests covering `lib/vat.js` (all four VAT scenarios: DK, EU+VAT ID reverse charge, EU without VAT ID, non-EU export), `lib/pricing.js` (multi-line totals, promo-code price overrides, unknown-SKU/zero-qty handling, the shipping-only-deposit invariant), and `lib/orders.js` (DB row → flat/enriched shape mapping, numeric coercion, note filtering).

Also added `// @ts-check` + JSDoc types to the money-shape modules (`lib/pricing.js`, `lib/vat.js`, `lib/orders.js`, `lib/products.js`, `lib/economic.js`) and a `tsconfig.json` + `npm run typecheck` script — catches exactly the class of bug the original 2026-05 audit flagged (a `vatInfo` shape drifting between where it's produced and consumed) at build time instead of at runtime. Deliberately **not** a full TypeScript conversion — stays plain `.js`, no file renames, no project-wide `checkJs` — per the project's own stated "pragmatic, no over-engineering" style in `CLAUDE.md`. `lib/invoice-pdf.js` was left un-checked: jsPDF's type definitions require exact-length tuples for its color-setter calls in a way this file's plain-array usage doesn't match, which is noise from a third-party library's types, not a real bug.

## 2026-07-24 (latest) — Project rename: Dee April B2B → Dee B2B

Removed "April" from every remaining project/technical identifier (the customer-facing brand copy was already done — see the "Rename to DEE" entry below; this is the project's own name):

- **GitHub**: repository renamed `vladimirnikandrov/dee-april-b2b` → `vladimirnikandrov/dee-b2b` (GitHub keeps the old URL redirecting). Local `origin` remote updated to match.
- **Local**: Dropbox folder renamed `Coding/Dee April B2B` → `Coding/Dee B2B`; component file `app/DeeAprilB2B.js` → `app/DeeB2B.js` (and its exported function `DeeAprilB2B` → `DeeB2B`, updated the import in `app/page.js`); `package.json` name `dee-april-b2b` → `dee-b2b` (and its `package-lock.json` regenerated to match).
- **Docs**: README.md/CLAUDE.md titles and file-structure listings updated; stale "Chapter I"/"Testers"/"Discovery Kit" mentions in `CLAUDE.md` (missed in the earlier catalog rename) corrected to the current DEE 01-05 + DISCOVER ME reality.
- **Railway**: project display name updated to "Dee B2B" (2026-07-24, later same day) — the plain click-through form submit wasn't persisting; fixed by driving the form's real `submit` event directly (`form.requestSubmit()`) instead, confirmed via the dashboard project list after a fresh reload.

Historical CHANGELOG entries below that reference the old file/repo name are left as-is — they're an accurate record of what those things were actually called at the time.

## 2026-07-24 (later still) — Logo left-alignment fix

The "DEE" wordmark PNGs had the text horizontally centered inside a fixed-width canvas, which left invisible padding on the left — looked fine standalone but sat away from the edge in the left-aligned header. Regenerated both (`logo-white.png`/`logo-black.png`) with the canvas cropped tight to the glyphs, flush left.

## 2026-07-24 (later same day) — Variant ordering, inventory backfill

Catalog variants within each product now list smallest to largest (2 / 20 / 50 / 100 ML) — was largest-to-smallest before. Same reorder applied to the admin promo-code editor's per-size price grid for consistency. Also backfilled production `inventory` rows via the live admin API: DEE 04, DEE 05 (all 4 sizes each) created at stock 0, and DISCOVER ME's pre-existing stock (100, left over from "Discovery Kit") zeroed out — all three are correctly "Out of Stock" now rather than just missing/stale rows.

## 2026-07-24 — Rename to DEE, new buyer invite flow, Railway auto-deploy

**Catalog rename** — no more named collections. "Parfum"/"Parfum I"/"Parfum II" (same SKUs/EANs) are now **DEE 01/02/03**; added two new fragrances **DEE 04** and **DEE 05** (placeholder pricing, zero stock); "Discovery Kit" renamed to **DISCOVER ME**, now with a real product photo. All three new/renamed zero-stock items need their `inventory` rows confirmed via Admin → Inventory after this deploy (new SKUs default to 0 automatically on first Save; DISCOVER ME's existing stock needs zeroing by hand since it already had a row).

**Brand copy** — every customer-facing "Dee April Parfums" / "April" reference replaced with "DEE": page titles, logo alt text, login-code email subject, admin welcome email, all three legal pages (privacy policy, EULA, DPA), landing copy ("Chapter I" → "the range"). The actual company/legal entity (DA Design ApS, CVR 45305481) and the `deeapril.com` domain are unchanged — this was a brand-copy change, not a legal or infrastructure one. New wordmark logo (`public/images/logo-white.png`/`logo-black.png`) generated to match — plain "DEE" in Helvetica Bold, replacing the old logo image that had "April" baked into the artwork itself.

**New: invite buyers from the admin panel** — a "Buyers" section (mirrors the existing "Admins" section) lets an admin add a wholesale buyer by email straight from the admin panel. Creates the account and immediately sends a warm welcome email (`buyer_welcome` template in `lib/email.js`) explaining passwordless login and how ordering works. New route: `app/api/admin/buyers/route.js`.

**Railway now auto-deploys from GitHub** — connected the `web` service's Source directly to this repo's `main` branch (previously deploys were a separate manual `railway up --ci` step with an ephemeral CLI token). Every push to `main` now triggers a Railway build automatically — see the updated note at the top of this file and in `CLAUDE.md`.

---

## 2026-07-18 — Documentation & backup recovery

The GitHub repo had not been pushed to since `19bbb10` (2026-04-24) — three and a half months of real work (the entire Railway migration, passwordless auth, e-conomic integration, the 30/70 removal, all of it below) existed only on Vladimir's local machine. `README.md`, `CLAUDE.md`, and this file were also never committed, and described the old Vercel + Supabase + password-auth stack that no longer exists. A `git clone` of this repo would have produced a non-functional, badly-outdated app.

Fixed: `README.md` and `CLAUDE.md` rewritten to match the current live architecture; this file restructured (resolved audit items marked below, current backlog moved to `[Unreleased]`); everything committed and pushed. `schema-update-v3.sql` (a dead Supabase RLS-policy file, superseded by `db/schema.sql`) deleted as part of the cleanup. Added a standing rule to `CLAUDE.md`: every future deployed change gets a changelog entry and a same-session GitHub push, so this gap can't reopen.

## 2026-07-17 — e-conomic integration goes live

Connected to Dorte's real, live e-conomic account (agreement 1797386 / DA DESIGN ApS) — she completed the InstallationURL authorization herself and forwarded the real `AgreementGrantToken`. `lib/economic.js`'s placeholder reference numbers replaced with real ones verified against her live account: customer group, VAT zone (both derived from this app's own VAT classification), payment terms ("Net 14 days"), and layout — all confirmed against the pattern already used on ~15 of her existing wholesale customers. Invoice lines reference her real e-conomic product catalog (1:1 SKU match) instead of one lump-sum line, so her sales reports break down by product. Ran a full real end-to-end test (real order → real e-conomic drafts → cleaned up test data on both sides) before calling it done.

Also this week: fixed a jsPDF bug where "€" renders glued to the following digit (broken glyph metrics in jsPDF's bundled Helvetica — `fmtMoney()` wrapper in `lib/invoice-pdf.js` inserts a space, isolated to the PDF module only). Promoted `da@deeapril.com` to admin so Dorte can log in and manage further admins herself.

## 2026-07-15 — Remove the 30/70 deposit split

At Vladimir's request: buyers are no longer asked for a 30% deposit + 70% balance. The first invoice is shipping-fee-only (fires automatically at order creation); the second and final invoice is the full order value (goods + VAT), fired when admin marks the order as fully invoiced. Touched everywhere the old split was referenced: `lib/pricing.js` (core formula), `lib/invoice-pdf.js`, all email copy in `lib/email.js`, admin panel labels, the order-edit route (`app/api/orders/[id]/route.js` had its own independent copy of the old formula — would have silently reintroduced the split on any order edit if missed), e-conomic sync descriptions, and the landing/legal-page copy. DB columns `deposit_amount`/`balance_amount` kept their names to avoid a migration — see the comment block in `lib/pricing.js` for what they actually hold now.

Also fixed a white gap rendering in transactional emails — Apple Mail doesn't reliably honor a `background` CSS property on a `<table>`; fixed by setting `bgcolor` as an attribute and putting `background` on the inner `<td>` too.

## 2026-07-04 — DNS cleanup + Cloudflare access

Audited all Cloudflare DNS records across `deeapril.com` and `maison-dee.com`; removed stale entries pointing at the decommissioned Vercel + Supabase stack. Found and fixed `order.deeapril.com` still quietly serving the dead old deployment — root cause was a missing `_railway-verify.order.deeapril.com` TXT record (Railway needs this in addition to the CNAME to issue a cert); added it and force-retried certificate issuance via Railway's GraphQL API rather than waiting for the normal poll cycle. Both `order.deeapril.com` and `order.maison-dee.com` now identically serve the Railway app.

## 2026-07-03 — Railway migration: off Vercel + Supabase entirely

The big one. Supabase's free tier auto-pauses after ~7 days idle, which had already caused a real outage (the app hung indefinitely on "Loading..." because the Supabase Auth call on every page load never resolved). Rather than pay to suppress the symptom, migrated everything onto a single Railway project (Next.js app + Postgres addon), matching the pattern already used for other PROJECT 1804 infrastructure.

- **Passwordless OTP auth** — every account (buyer and admin) now signs in via an emailed 6-digit code. `password_hash` and all password/reset-password code paths removed entirely (`db/migration-002-otp-auth.sql`, `db/migration-003-remove-passwords.sql`). Admin is a `role` column checked server-side, not a client-side password compare.
- **All data access moved server-side** — every `supabase.from(...)` call replaced with a Next.js API route with explicit `requireAuth()`/`requireAdmin()` checks. This closed a real security hole: the old Supabase RLS policies used `using(true)` on `SELECT`/`UPDATE`/`DELETE` for `orders`, `order_notes`, `inventory`, and `promo_codes` — meaning the public anon key embedded in the client bundle could read every buyer's data and edit/delete any order.
- **Images moved to local files** — `public/images/` (logo, product bottles, hero), no more Supabase Storage dependency, no more signed-URL expiry risk.
- **Server-authoritative pricing** — `lib/pricing.js` re-derives all amounts from `{sku, qty}` + buyer VAT info; the client is never trusted for price data (previously, `generate-invoice` and `send-email` trusted whatever the client POSTed).
- **Atomic stock decrement** (`update inventory set stock = stock - qty where stock >= qty`), and **stock is now refunded on cancel** (previously lost forever).
- **Sequential order IDs** — `orders_id_seq` Postgres sequence replaces client-generated `Math.random()` IDs (real collision risk before).
- **Note authorship server-derived** — `is_admin` on order notes now comes from the verified session role, not a client-submitted flag.
- **Promo code save/delete errors now surface properly** — previously silently swallowed, admin UI showed "saved" even when nothing persisted.
- Fixed a `camelCase`/`snake_case` mismatch that could show the wrong balance-due amount on invoiced orders.

Full QA pass on the Railway temp domain before DNS cutover; both `order.deeapril.com` and the new `order.maison-dee.com` (added as a first step toward a possible future "Maison Dee" rebrand) now point at the same Railway service.

---

## v9 — 2026-04-24

**`19bbb10`** — Fix PDF logo aspect ratio and footer layout
- Use auto-width (`0`) with fixed `10mm` height to preserve logo aspect ratio in jsPDF.
- Footer note box sized dynamically via `doc.splitTextToSize()`.
- Last shipped version before the 2026-05-12 audit.

---

## 2026-04-24 — Audit fix pass

**`663f55c`** — Fix 10 bugs from audit + security improvements
- Touched `DeeAprilB2B.js` plus both API routes (`generate-invoice`, `send-email`).
- Added origin allow-list checks on API routes (`order.deeapril.com`, `dee-april-b2b.vercel.app`, `localhost`).
- Submit-button double-click guard via `submitting` state.
- `viewRef` pattern to avoid stale closures inside auth callbacks.
- Misc validation and dark-mode contrast fixes.

---

## 2026-04-16 — PDF + UX polish

**`8c1f67e`** — Fix PDF layout, cart bar, email links, session persistence
- PDF layout adjustments.
- Floating cart-bar positioning fix on mobile.
- Email CTAs use deep-link query (`?order=DA-…`) so buyers land directly on their order.
- Supabase session restored on page load; deep-link order id parked in `pendingDeepOrder` ref until auth completes.

---

## 2026-04-08 — Error logging

**`3d505ca`** — Add error logging system in admin panel
- Client-side `logError(source, detail)` ring buffer (last 50 entries).
- Error log surfaced in Admin panel, with "Copy All" / "Clear" controls.
- All async paths (Supabase, Resend, PDF gen) wired to it.

**`1d49605`** — Fix badges, landing, checkout, PDF download, admin colors
- Visual polish across landing, checkout, admin views.
- PDF download flow tightened.
- Status badge color rules adjusted for dark backgrounds (avoid white-on-white / black-on-black).

---

## 2026-04-08 — Dark mode + branding milestone

**`54929a4`** — Dark mode, PNG logo, `order@deeapril.com`, CVR 45305481
- **Biggest single commit** of the project (1028 insertions / 151 deletions across 7 files).
- Created `app/api/send-email/route.js` (Resend, ~383 lines, ~9 transactional templates).
- Created `app/api/generate-invoice/route.js` (jsPDF, ~366 lines, deposit + balance modes).
- Added `schema-update-v3.sql` (DELETE policies on `orders` / `order_notes`).
- Switched palette to full dark mode (`#000` / `#111` / `#1a1a1a` backgrounds).
- Branding finalized: PNG logo from Supabase Storage, `order@deeapril.com` from-address, `DA DESIGN APS` / CVR 45305481 / Nordea bank details in invoices.

---

## 2026-04-03 → 2026-04-06 — Iteration phase

Heavy iteration on `DeeAprilB2B.js` (commit messages all "Update DeeAprilB2B.js" — semantic content inferred from diff sizes and downstream commits):

- **`d223333`** (2026-04-06, +11/-4) — minor tweak.
- **`fd2f110`** (2026-04-06, +96/-22) — feature additions.
- **`55d8c08`** (2026-04-05, +67/-14) — adjustments.
- **`a2952fc`** (2026-04-05, +263/-14) — major additions (likely promo codes + inventory groundwork).
- **`0af70a9`** (2026-04-04, +58/-46) — refactor pass.
- **`baa2864`** (2026-04-04, +21/-18) — small refactor.
- **`2dec497`** (2026-04-03, +53/-16) — feature.
- **`06d79a4`** (2026-04-03, +307/-230) — large reorganization of the monolith.

---

## 2026-03-27 — Scaffolding

- **`6a8dd91`** — Update `DeeAprilB2B.js` (+36/-4).
- **`ea1b007`** — Update `package.json` (+1).
- **`b3fcea2`** — Update `DeeAprilB2B.js` (+205/-85) — significant expansion.
- **`b0e4bfd`**, **`3963c5b`**, **`e4fb305`** — Move `DeeAprilB2B.js`, `layout.js`, `page.js` into `app/` (Next.js App Router layout).
- **`ac56588`** — **Initial upload.** `DeeAprilB2B.js` (818 lines), `layout.js`, `page.js`, `next.config.js`, `package.json`. Next.js 15 + React 19 + Supabase client. Single-file React monolith from day one.

---

## Off-repo events

- **2026-04-27** — Repo cloned locally to `~/Downloads/dee-april-b2b`. `CLAUDE.md` added at repo root (not in GitHub history before this).
- **2026-05-12** — Repo moved to `~/PROJECT 1804 Dropbox/Vladimir Nikandrov/Coding/Dee April B2B` to sit beside VN Compress / VN Visuals / VN Whisper. Initial code audit performed (findings folded into the entries above as they were fixed during the 2026-07 migration).
- **2026-07-18** — Discovered the repo hadn't been pushed since 2026-04-24 despite months of shipped work; see the "Documentation & backup recovery" entry above.

---

## Notes on versioning

- `CLAUDE.md` referenced "v9" for commit `19bbb10` (2026-04-24) — the last commit before the 2026-07 migration below it. Earlier `v1`…`v8` are informal and were never tagged in git; the "Scaffolding" / "Iteration phase" entries below are the best reconstruction from commit history.
- The Supabase-era `schema.sql` / `schema-update-v2.sql` referenced by old versions of this file were never recovered — moot now, `db/schema.sql` (Railway Postgres) is the current canonical schema and is committed.
