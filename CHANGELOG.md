# Changelog

All notable changes to **Dee B2B** (order.deeapril.com / order.maison-dee.com).
Format loosely follows [Keep a Changelog](https://keepachangelog.com/).
As of 2026-07-24, the `web` service is connected directly to this repo's `main` branch on Railway — every push auto-deploys, no CLI/token needed. Before that, deploys went via `railway up --ci --service web` independent of git pushes; see `CLAUDE.md`. As of 2026-07-18, every deployed change also gets a dated entry here in the same session — see the standing workflow rule at the top of `CLAUDE.md`. Versions referenced from the Vercel era (e.g. "v9") are informal milestones kept for history.

---

## [Unreleased] — current backlog

Nothing in progress. Don't start any of these without an explicit ask from Vladimir.

1. **Move Railway/Resend/GitHub off Vladimir's personal accounts onto Dorte's own** — the last open item. Cloudflare and the domain registrar are already sorted (per Vladimir, 2026-07-24), and e-conomic never needed it — that is already her own agreement (1797386 / DA DESIGN ApS). Plan: **she creates each account and invites Vladimir**, rather than transferring his — ownership and billing are hers from the start and he keeps working access. Order matters: Resend first (a new account means new DKIM records, so another ~90-second sending gap), then GitHub (transferring the repo breaks Railway's auto-deploy link, which has to be reconnected), then Railway last since it depends on GitHub. Take a database backup before moving the Railway project — it carries the Postgres volume. Email sent to Dorte 2026-07-30, awaiting her accounts.

Closed out and deliberately dropped from this list (Vladimir, 2026-07-30), recorded here so nobody re-raises them as oversights:

- **Google DKIM for maison-dee.com** — done, the console reads *Authenticating email with DKIM*.
- **A reused e-conomic customer card keeps its old `vatZone`/country** — reviewed and accepted as-is. `getOrCreateCustomer` deliberately does not write back to an existing card: Dorte maintains those by hand for her ~15 existing wholesale customers, and each invoice's VAT treatment comes from the draft's own `recipient` block regardless, so overwriting her records from checkout form data would risk destroying real information to fix a reporting-only discrepancy.
- **`info@` and `dorte@` exist only on deeapril.com** — Vladimir's call not to recreate them on maison-dee.com.
- **Renewing deeapril.com past 2026-12-16** — handled directly with the client.

The longstanding tech-debt items previously listed here (monolith split, no TS/tests, silent sync failures) have all been worked through as of 2026-07-24 — see the dated entries below. DEE 04/05 pricing confirmed fine as-is (Vladimir, 2026-07-24). From the 2026-07-26 audit: free-text country and e-conomic draft idempotency were resolved the same day, and draft traceability + customer duplication the same evening — all four are in the dated entries below.

---

## 2026-08-02 (evening) — Wave 1: the audit's own findings, fixed

Everything in the first wave of [`PHASE-0-AUDIT.md`](./PHASE-0-AUDIT.md), plus the four decisions Vladimir
made on the open questions. No stack changes — that is still a separate workstream.

### The portal is invite-only now

Vladimir's call. The landing page's primary action used to be "Create account"; registration inserted a normal
buyer, mailed a code, and dropped them straight into the catalogue — every wholesale price, RRP, EAN and stock
level for the whole range, one email address away, while the admin panel already had a deliberate "invite
buyer" flow. `POST /api/auth/register` and the register view are deleted; accounts exist only because an admin
created one in the Buyers section. `request-otp` answers an unknown address with who to write to instead of
"create one first". The landing page says the same thing under the single Sign In button.

### Order notes are internal

Also Vladimir's call. Dorte writes them in the admin panel with nothing suggesting they travel — and
`GET /api/orders` was serialising them into the buyer's own response, readable from any devtools Network tab,
even though no buyer view renders them. The buyer's response no longer queries them at all, posting one is
`requireAdmin`, and the section is labelled "Internal notes — only DEE sees these".

### Documents

**The on-screen invoice contradicted the PDF of the same invoice.** The 2026-08-01 fix (each document states
only its own VAT) landed in `lib/invoice-pdf.js` only. `InvoiceView` still printed the whole order's VAT and
total above a shipping-only amount due — so `DA-2608-1010-SHIP` said €11.35 VAT / €56.75 total on screen and
€1.85 / €9.25 in the attached PDF. Both documents now derive their own figures from the same split as the PDF,
and the shipping invoice lists one freight line instead of the entire order.

**The full-invoice email's "View invoice" button opened the shipping invoice** — `?order=` alone, and the view
always defaults to the shipping document. Both invoice emails now carry `&invoice=deposit|balance`.

`"Incl. 25% moms"` — Danish, in an otherwise English document a foreign bookkeeper has to reconcile — is now
"Includes 25% Danish VAT".

### A missing inventory row meant unlimited stock

`app/api/orders/route.js` skipped `stockBySku[sku] === undefined` in *both* the pre-check and the
in-transaction guard, so a SKU with no row was orderable in any quantity and decremented nothing. Production
was never exposed (DEE 04/05 and DISCOVER ME all have rows at 0, verified against the live API), but adding a
product to `lib/products.js` and forgetting the inventory row was a live trap. A missing row is now zero on
both sides, and the catalogue distinguishes "checking stock…" from "out of stock" rather than showing no badge
at all. DEE 04/05 and DISCOVER ME stay visible and read "Out of stock" (Vladimir: don't hide them).

### Screens that lied when a fetch failed

`loadOrders` did `if (!res.ok) return;` — no error, no log, no state. On a cold load My Orders then rendered
"No orders yet. Start shopping": an active buyer told, in plain words, that they had never ordered anything,
and invited to place it again. The two screenshots of "loading" and "failed" were byte-identical. Loading,
failed-with-retry and genuinely-empty are now three different screens (the skeleton repeats the real card's
shape), the admin list no longer blames Dorte's filter for a dead backend, and the catalogue says when stock
couldn't be loaded instead of quietly dropping every badge and unbounding every stepper.

A rejected order used to flash past in a toast that dismissed itself and couldn't be selected — on the most
expensive click in the app, while the totals silently re-priced and the promo silently dropped. It is now a
block on the checkout that stays until dismissed, and it says the promo was removed.

### Actions that misled

- **"Edit" was offered on orders the server refuses to edit.** The button allowed everything up to
  `balance_paid`; `canEdit` refuses a buyer once `deposit_paid` is set. The correct predicate was already in
  scope — the Cancel button beside it uses it. Now they agree.
- **The cancel dialog offered "CANCEL" and "CANCEL ORDER" side by side**, the destructive one in red on the
  right. Dismiss now reads "Keep order"; the delete dialog's reads "Keep it".
- **Every status pill emailed the buyer the instant it was clicked**, with no confirmation and no undo — a
  mis-aimed click on a seven-chip row told a buyer their order had shipped. Each toggle now names what the
  buyer will receive. The buyer's own "Confirm receipt" skips the prompt, since there the buyer is the one
  telling us.
- **A cart line whose stock hit zero could never be removed** — the catalogue replaced its stepper with "Out
  of stock", so the quantity stayed in the cart and blocked checkout for good. The stepper stays while the
  line is in the cart, capped at what is already there.
- **Repeat Order silently replaced whatever was in the cart.** It asks now.
- **Unsaved inventory edits** survive a background reload, warn on unload and on sign-out, and a cleared field
  no longer commits a 0 the moment focus leaves. The one sentence explaining the greyed-out Save All was
  unreachable code behind the disabled button; it is now a line under it.

### The primary button was #000 on a #000 page

`SEND CODE` on the sign-in screen — the screen every buyer sees every session, since there are no passwords —
rendered as bare white text with no button shape at all. Same for `SAVE PDF` on the invoice, `EXPORT CSV` and
every note `ADD` in the admin panel, while the landing page next door does it correctly with a white pill.
One fill, applied everywhere the primary role appears.

### Legibility

`#666` was the token for every field label and most captions: 3.66:1 on black, under AA. Now `#8a8a8a` (5.9:1).
Error red `#dc2626` (3.4:1) → `#f87171`; the two different ambers that meant the same thing → one. `outline:
"none"` sat in `inputStyle`, and an inline style beats a stylesheet rule, so the app's own `:focus-visible`
ring never appeared on a single text field — removed, and the ring is white so it reads on black. Inputs are
16px because anything smaller makes iOS Safari zoom the viewport on focus and never zoom back. Quantity
steppers and the mobile nav are 44px. On mobile, City/ZIP/Country no longer share a row — the country field,
which decides the VAT treatment, read "Select c" — and the six-column invoice table becomes labelled blocks
instead of a silent horizontal scroller with the prices off-screen.

### Weight

The catalogue transferred **13.8 MB** of imagery, **13.2 MB** of it a single 3727×3727 `discover-me.png` shown
in a ~300 px cell, for a product that is out of stock. Everything is resized to 900 px: **13.8 MB → 0.93 MB**,
about 5.5 s of image loading on a 20 Mbit line reclaimed. `hero-cover.png` (4.8 MB) was exported from
`lib/assets.js` and rendered nowhere — deleted. Images are lazy below the first product. `app/icon.svg` gives
the portal a favicon; `/favicon.ico` had been a 404, and it was the only console error Lighthouse could find.

### Schema

Migration `011-sync-failures-table` brings `sync_failures` under the runner. Production has had the table since
July (applied by hand) and a database built from `db/schema.sql` gets it, but a clone from an older dump did
not — and the admin panel's sync-failure fetch 500s without it. Idempotent; a no-op everywhere it already exists.

### Brand

The PDF's logo fallback — reached only when `public/images/logo-white.png` can't be read — still printed
"DEE APRIL / PARFUMS". A fallback nobody looks at is exactly where an old name survives. `.env.local.example`
still pointed the sender at `@deeapril.com`. Both fixed. The remaining "April" strings in the tree are
`db/seed-data.sql` (a historical import, verified absent from production data) and the name of Dorte's own
e-conomic layout, "DEE APRIL Sort layout engelsk", which is hers and must not change.

### Found by reviewing the above, before it shipped

Ten agents went at this diff with instructions to refute it, and caught five things it had broken or left
half-done. Recorded because four of them were regressions introduced by the fixes themselves:

- **Sign Out became a dead button on the catalogue and profile.** The new unsaved-stock guard raised a confirm
  dialog, but each view rendered its own `<ConfirmModal>` and those two didn't have one — so the click set
  state and drew nothing. There is now a single dialog at the app root next to the single toast, and the three
  per-view copies are gone.
- **The "unsaved inventory survives a background reload" fix wasn't implemented** — only the comment claiming
  it was. `setInventory(inv)` was still unconditional, so cancelling an order or saving an edit reverted
  whatever Dorte had typed, and disarmed the unload guard with it. Now gated on a ref, with an explicit
  `force` for the two callers that do want the server's truth.
- **A cleared stock field was silently dropped while the panel said "Inventory saved".** Fixing "empty commits
  0" by making empty commit nothing just moved the lie. A cleared field now reverts on blur, and a blank one
  at save time is refused with the field named — to zero a SKU you type 0.
- **The invoice deep link hung on "Loading order…" forever** if the orders fetch failed, with no header, no
  nav and no retry — on the exact screen every invoice email links to. Same three states as everywhere else now.
- **A failed refresh blanked a list that was already on screen**, including an open edit form. The full-screen
  error is only for when there is nothing to show; otherwise the list stays with a retry banner above it.

Plus: `#b91c1c` (3.2:1) survived the contrast sweep and was the colour of every destructive control; ten
inputs overrode the 16px base back to 11px, re-arming the iOS zoom; the first click on Place order revealed
the field errors but scrolled before React had rendered them; a rejected order stayed on screen after leaving
and re-entering the checkout; and on a 0%-rated invoice the VAT treatment printed below the total instead of
where the VAT line goes.

### And one gap the invite-only decision opened

Making the account the access control meant there had to be a way to take it back — there wasn't one. Buyers
can now be removed: an account with orders is **deactivated** (migration 012 adds `users.deactivated_at`;
`getSession` and `request-otp` both reject it, so existing 30-day cookies die immediately) because those
orders are the accounting record and carry e-conomic draft numbers, while an account that never ordered is
deleted outright. Re-inviting a deactivated address restores it. The invite form also validates the address
now — it isn't a `<form>`, so `type="email"` was never checked, and a typo produced an account nobody could
ever sign into with the welcome email going nowhere.

---

## 2026-08-02 — Phase 0 audit (no product changes)

Groundwork for the polish pass, ahead of the client going into full daily use. Nothing in `app/` or `lib/`
changed — this entry is the audit itself plus the tooling that produced it.

**`scripts/audit-sweep.mjs`** walks every flow on the production build and writes 35 screenshots per viewport
(1440 and 375), including the states nobody screenshots by hand: submitted-empty forms, a wrong OTP, an unknown
email, an invalid promo code, `/api/orders` frozen mid-flight, `/api/orders` aborted, `/api/inventory` aborted.
OTP codes are read straight out of `login_otps` instead of email, so a sweep sends nothing to anyone — and the
script refuses to run unless both the database and the base URL are local, because it deletes its own audit
accounts before each run. `scripts/audit-perf.mjs` records what each screen actually transfers.

One capture detail worth keeping: the header is `position: sticky`, and a full-page screenshot paints a sticky
element at its *scrolled* offset — which put the header across the middle of every mobile form and read exactly
like a layout bug. The script now scrolls to top before each shot.

**81 findings, 78 confirmed, 3 refuted** — seven audit lenses over the screenshots and the source, each finding
then attacked by a skeptic told to refute it. Written up in [`PHASE-0-AUDIT.md`](./PHASE-0-AUDIT.md) with a
wave split; the refuted three are recorded there too so they don't get raised again. Two worth naming here:

- **The primary button on the sign-in screen is `#000` on a `#000` page** (`shared.js:291`), so `SEND CODE`
  renders as bare text with no button shape. Same at `SAVE PDF`, `EXPORT CSV` and every note `ADD`. The landing
  page does it correctly, which is what makes it read as broken rather than austere.
- **The on-screen invoice contradicts the PDF of the same invoice.** The 2026-08-01 fix (each document states
  only its own VAT) landed in `lib/invoice-pdf.js` only; `InvoiceView.js:86-98` still prints the whole order's
  VAT and total above a shipping-only amount due. Same invoice number, two different documents — worse than
  before the PDF was fixed.

Measured rather than assumed: the catalogue transfers **13.8 MB** of imagery, **13.2 MB** of it one
3727×3727 `discover-me.png` shown in a ~300 px cell, for a product that is out of stock — 5.5 s of image
loading on a 20 Mbit line, and a 12 193 px page on a phone. `hero-cover.png` (4.8 MB) is exported and never
rendered. Lighthouse on the landing page reads 100/95/96, which flatters the app: that page is 2 KB and
everything heavy is behind the login, where Lighthouse can't go.

`screenshots/` is gitignored — about 5 MB per run, regenerate rather than store.

---

## 2026-08-01 (evening) — The remaining 26 audit findings

Everything the audit found is now fixed. Grouped by what was actually wrong, because most of these were the same mistake wearing different clothes.

### Read a row, decide, write it back — four separate places, all racing

`cancel`, `restore`, `PATCH /api/orders/:id` and `PUT /api/inventory` all read the order (or the stock row), computed something from it, then wrote unconditionally. Two requests arriving together both read the same "before" state and both applied their effect. Cancelling twice — a double-click, or Vladimir and Dorte at once — refunded the stock twice, and the inventory counter then said DEE had bottles it did not have. Restore deducted twice. An edit applied its quantity delta twice and the second write silently discarded the first edit's lines.

All four now decide *inside* the write:

- **Cancel:** `update orders set cancelled = true where id = ? and cancelled = false returning *`. Only the request that flips the flag refunds the stock; the loser gets a 409. Verified against the live database with five concurrent cancels: one 200, four 409s, stock refunded exactly once.
- **Restore:** the mirror, `where cancelled = true`. It also had no confirmation modal at all while Cancel and Delete both did — it has one now.
- **Edit:** the entire computation moved inside `sql.begin` on a `select ... for update` row, so the delta is derived from the quantities that are actually current. The edit window is re-checked there too, since an order can be cancelled or invoiced during the wait for the lock. The checks that moved into the transaction (edit window, empty order, insufficient stock) throw, so the catch now maps them back to 409/400/404 instead of turning every one of them into a 500 that reads as "something went wrong" for a problem the user can fix.
- **Inventory:** the admin panel used to PUT the whole catalogue as one snapshot taken when the page loaded, rewriting every untouched SKU to its stale figure — an order placed while the panel sat open had its stock silently resurrected. The client now sends `previousStock` per row and each write is conditional on the database still holding that value. Rows that moved come back as a 409 listing them, nothing is saved, and the panel reloads.

### Documents in Dorte's real accounting

A draft in e-conomic is a document in a real ledger. Nothing in this codebase can retract one, so the design principle is: never lose the number.

- **Superseded drafts are kept.** Re-issuing an edited order overwrote `economic_balance_draft_number`, and the previous number — the only way to find that now-wrong document in her books — was gone. New `economic_superseded_drafts integer[]` (migration 009, backfilled) is appended to before the column is reused. The admin panel shows them as a red chip.
- **Cancelling shows what to delete.** A cancelled order's drafts stay in her accounting. The `EconomicSync` row now takes the cancelled flag and renders an explicit "Delete in e-conomic: #N" instruction, rather than a green tick that says synced.
- **Delete refuses while drafts are outstanding.** Deleting the order row destroyed the last link between draft #N and the order it belonged to. `DELETE` now returns a 409 naming the drafts; once they are gone from e-conomic, the modal's second step ("I've deleted them") re-sends with `?force=1`. A refusal with no way past it is just a different dead end.
- **A failed deposit sync can be retried.** The shipping draft is created at order placement; if that call failed, nothing in the app could ever try again and the invoice was simply missing from her books forever. Toggling `deposit_invoiced` now re-fires it, but only when `economic_deposit_synced_at` is null. The claim in `lib/economic.js` is what makes that safe — if the draft did get created, the claim is held and the call is a no-op.
- **A VAT number alone no longer binds an account to a customer card.** `getOrCreateCustomer` matched on corporate/VAT identifier, so a buyer who typed a competitor's VAT number — by mistake or otherwise — had their orders permanently filed under that competitor in the live ledger. The card's name now has to agree as well (case- and punctuation-insensitively, so "DEE STORE ApS." still matches "Dee Store aps"); on disagreement it declines to bind and logs why.

### Money that could differ from what was agreed

- **Each invoice states only its own VAT.** Both PDFs printed the order's entire VAT total: the shipping invoice demanded 9.25 while declaring 20.60 of VAT, then the full invoice declared the same 20.60 again — 41.20 stated across two documents against 20.60 actually charged. A bookkeeper reconciling either one against DEE's correctly-split e-conomic drafts would find that neither matched. The shipping document now shows the freight net, its own VAT and its own total, and lists a single "Shipping" line rather than the entire product table.
- **The confirmed total is checked at submit.** `appliedPromo` was a price-table snapshot taken at page load and never revalidated, so a promo edited mid-checkout (or a page left open overnight) invoiced an amount the buyer never saw. The client sends `expectedTotal`; a mismatch over one cent is a 409 telling them what it now comes to. Applying a code also goes through the server now rather than a client-side table lookup.
- **Promo prices round to cents.** A price like 48.005 propagated independently through every line total, the VAT and the order total, and the printed Subtotal + Shipping + VAT then failed to equal the printed Total by a cent — on a document someone has to reconcile.

### Access control

- **`GET /api/inventory` required nothing** and published exact stock-on-hand for every SKU. The catalogue is behind a login — this is a wholesale portal, not a shop — so there was never a reason for that. It requires a session now.
- **The order's email address came from the request body.** A buyer could put any address on an order and have the portal deliver the confirmation, the invoice PDF and every later status email to it, from the verified sending domain — the same domain the login codes depend on, so the deliverability damage would have locked real buyers out. It is `session.email` now, in `POST /api/orders` and in `PUT /api/profile`.
- **OTP verification only ever considered the newest unused code.** Request a code, request another before typing the first, and the first was dead — so an unauthenticated attacker hammering `request-otp` could lock any account, the single admin account included, out permanently while burying its inbox. Any live, unexpired, under-attempt-limit code is now accepted; a miss burns an attempt on all of them. Added an hourly ceiling (`OTP_MAX_PER_HOUR = 8`) on top of the existing 30-second gap, which alone still allowed 120 mails an hour to any address that exists.
- **Email is matched case-insensitively** (migration 010: a unique index on `lower(email)`, plus normalisation in every route). `Da@maison-dee.com` and `da@maison-dee.com` were two different people — capitalise your address once at registration and not the next time, and you got a second account with an empty order history and no way to reach your real orders. The migration merges any duplicates that already exist (oldest account wins, orders and — if the survivor has none — the delivery profile move across). There are none in production; it is there so the migration is safe on any copy of the database.

### The invoice PDF ran off the page

There was no page-break logic at all: from 19 line items the payment note fell past the bottom edge, and from 21 the IBAN and BIC/SWIFT went with it. The buyer received an invoice with no way to pay from it, and nothing on the document suggested anything was missing. Every block now measures itself and takes a fresh page if it does not fit — line rows one at a time (with the column headings repeated), and the totals block and the payment details each kept whole, since "Subtotal" on one sheet and "Amount Due" on the next is not an invoice. Continuation pages carry the logo and "Order Invoice DA-…-… — continued", and multi-page documents are stamped "Page 2 of 3"; single-page invoices are byte-for-byte unchanged. Seven layout tests pin it at 3, 19, 21, 30 and 60 items and with a wrapping VAT note, and the rendered output was checked page by page.

### Client-side

- **`repeatOrder` overwrote the live buyer profile** with the historical snapshot off the old order, which was then silently persisted on the next checkout — an address change made months ago quietly reverted to the old one.
- **A new order was shown as the full "Order Invoice"** for the whole order value, because `invoiceViewType` was never reset — the buyer's first sight of their order was a demand for the entire amount rather than the shipping fee actually due.
- **Status toggles were decided from stale client state.** The value now comes from the server's own read of the row, so "Send Invoice" can no longer silently un-invoice, and the next click can no longer double-email the buyer.
- **CSV export escaped nothing.** A company name beginning `=`, `+`, `-` or `@` is a formula to Excel, and this export opens on Dorte's machine. Those cells are now prefixed with a tab.

Everything was verified with `npm run typecheck`, 95 unit tests and a production build; the concurrency fixes were additionally verified against the live database with genuinely concurrent requests.

---

## 2026-08-01 (later) — Promo price list was public; and the guard shipped disabled

A 49-agent adversarial audit (six lenses, every finding then attacked by a skeptic told to refute it) returned 28 confirmed findings and refuted 15. Two were fixed immediately because both were live and cost money.

**The whole promo price table was readable by anyone.** `GET /api/promo-codes` had no auth check at all, and the client fetched it on mount for anonymous landing-page visitors — so `curl https://order.maison-dee.com/api/promo-codes` returned every code with its exact prices, and it also sat in every visitor's Network tab. Verified against production: it returned `MOODSCENTBAR` at 48 EUR for a 100 ML against a 75 EUR wholesale price, a 36% discount available to anyone who opened DevTools. Since `POST /api/orders` honours any code that exists, a buyer could simply apply it.

Fixed by inverting the model. A promo code is a secret — the point is that you have to be told it — so the list is now admin-only, and buyers validate a single code they already know via `PUT /api/promo-codes`, which requires a session and reveals nothing about codes they did not present. The client no longer holds a table of codes at all; `loadPromoCodes` moved off the mount effect onto the admin view. Verified live locally: unauthenticated GET now 403, unauthenticated PUT 401, an authenticated buyer's own code returns 200, an unknown code 404.

**The dev-send guard added earlier today shipped switched off.** That same commit set `SITE_URL=https://order.maison-dee.com` in `.env.local.example`, and the README tells every new clone to copy that file. A production host makes `IS_PRODUCTION_PORTAL` true, which skips the recipient check entirely — and because the base URL genuinely is production, the content scan finds nothing to complain about either. So a fresh clone with a seeded database could email real retailers with links that resolve, meaning nobody would notice. That is a worse version of the bug the guard was written for. The example now ships `SITE_URL=http://localhost:3000`, with the production value documented as a comment, and a test reads the tracked example file and fails if its host is ever a production one.

The remaining 26 findings were all fixed the same evening — see the entry above.

---

## 2026-08-01 — Stop local development from emailing real customers

Between 3 and 26 July, real retailers received real transactional emails whose logo and "View Order" link pointed at `http://localhost:3000`. Eleven of twenty-nine audited sends were affected, across three templates.

**The reported cause was wrong, and that is worth recording because it was a plausible-looking wrong answer.** The bug report attributed it to a base URL "silently falling back to `http://localhost:3000`" when an env var was unset. No such fallback exists in this codebase and `git log -S localhost:3000 -- lib/email.js` returns nothing — the fallback has always been a production URL.

The real mechanism is entirely environmental. `.env.local` carried `SITE_URL=http://localhost:3000` **together with the production Resend key**, and `db/seed-data.sql` — the one-time export from the old Supabase database — contains real customer addresses. So `npm run dev` plus any action that sends mail equalled a real email, to a real client, from the verified production domain, carrying dead localhost links. Several of those sends came from this project's own audit sessions requesting OTPs against localhost. The same mechanism explains another item in that report: the "order-number collision" on `DA-2607-1005` is just the local and production sequences both starting at 1000, not a broken generator.

Care cannot fix this, because "someone runs the app locally" is the normal thing to do. So the fix is a guard at the single point every message passes through, `sendTransactionalEmail` in `lib/email.js`, with the two questions deliberately split by environment:

- **Outside production** (SITE_URL host is neither `order.maison-dee.com` nor `order.deeapril.com`) the question is **who**: nothing is sent to anyone outside `DEV_EMAIL_ALLOWLIST`. Localhost URLs in the body are fine there — that is exactly what local testing looks like, and blocking them would only get the guard switched off by whoever needs to test.
- **In production** the question is **what**: every recipient is legitimate, but a body matching `localhost|127.0.0.1|.railway.app|.vercel.app|http://` is refused. That can only mean a wrong deployed `SITE_URL` or a stray absolute URL in a template. The plain-`http://` check earns its place: every real portal URL is https, so its presence is itself the evidence.

A blocked send returns `{ blocked: true }` rather than throwing, so the PDF-failure fallback paths in the order routes still behave. It deliberately does not create a sync-failure row — in local development that is the guard working, and filling the admin panel with those teaches everyone to ignore it.

Verified by running the real thing, not just unit tests: with the dev server on localhost, an OTP request for `da@deeapril.com` (a genuine client address sitting in the local seed) was blocked with nothing leaving the machine, while the same request for an allowlisted address was delivered normally. Eight unit tests cover the matrix, including the case that matters most — that production sending is completely unaffected. That was checked against the live `SITE_URL`, evidenced by the logo URL in an actual production email rather than assumed.

Also corrected in `.env.local`: `RESEND_FROM_EMAIL` still read `Dee April Parfums <order@deeapril.com>`, a domain no longer verified in Resend.

Two other items from the same report needed no action — the stale `Dee April Parfums` brand strings and the hardcoded `order@deeapril.com` in the cancellation template were both fixed on 2026-07-29. The report was analysing messages sent before that change.

---

## 2026-07-29 — Email identity moved to maison-dee.com

`deeapril.com` expires **2026-12-16**, so the whole email identity moved to `maison-dee.com` while there is still time to do it calmly.

**In Google Workspace:** `maison-dee.com` added as a *secondary* domain — not a user-alias domain, because only a secondary can later be promoted — and verified by TXT rather than by handing Google OAuth write access to the entire Cloudflare zone. MX, SPF, DMARC and DKIM published for it. The primary domain was then switched to `maison-dee.com`, which automatically demoted `deeapril.com` to secondary. All five accounts renamed to `@maison-dee.com`; Google keeps each previous address as an alias automatically, so nothing sent to an old name is lost. `deeapril.com` is deliberately LEFT as a secondary domain rather than converted to a domain alias — the per-user aliases already cover continuity, and a domain alias would keep minting addresses on a domain that is being retired.

**In this codebase** — every address except the actual sender: `lib/seller.js` (seller contact printed on invoices) and `lib/email.js` (`ADMIN_EMAIL` recipient, the footer line on every email, the "contact us at" line on cancellations, and the `PORTAL_URL` fallback). Safe to ship immediately: `order@maison-dee.com` is a real mailbox that receives, and the From address is env-driven and untouched, so sending is unaffected by this deploy.

**Not changed, on purpose:** the privacy policy and EULA still name *both* `order.deeapril.com` and `order.maison-dee.com`. Both really do serve the portal today, and dropping the old one would leave anyone arriving on that URL covered by a document that doesn't mention it. They get cleaned up when the domain is actually retired.

**Transcription note:** the Google DKIM key had to be copied by hand from a screenshot, and three characters came across wrong — `I` (capital i) versus `l` (lowercase L), indistinguishable in the console's font. Google refused to verify, correctly. Caught by decoding the base64 as a DER RSA key locally and then diffing character-by-character against the console's own copy. Anything hand-copied from a screenshot deserves that kind of check before it goes anywhere near DNS. Google confirmed it once the corrected record propagated — the console now reads *Authenticating email with DKIM*.

**Sender moved the same day.** Vladimir chose to free Resend's single-domain slot rather than upgrade the plan: `deeapril.com` deleted, `maison-dee.com` created, its three records written straight from the API response into Cloudflare, verified in **80 seconds** — the outbound-mail outage was about a minute and a half. Resend's suggested DMARC record was skipped on purpose, since the zone already publishes its own and a second TXT at `_dmarc` would be invalid. `RESEND_FROM_EMAIL` in Railway went from `Dee April Parfums <order@deeapril.com>` — still carrying the pre-rebrand name — to `DEE <order@maison-dee.com>`. Verified on production by requesting a real OTP: it arrived from `order@maison-dee.com`, footer included.

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
