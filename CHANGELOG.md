# Changelog

All notable changes to **Dee April B2B** (order.deeapril.com / order.maison-dee.com).
Format loosely follows [Keep a Changelog](https://keepachangelog.com/).
As of 2026-07-24, the `web` service is connected directly to this repo's `main` branch on Railway — every push auto-deploys, no CLI/token needed. Before that, deploys went via `railway up --ci --service web` independent of git pushes; see `CLAUDE.md`. As of 2026-07-18, every deployed change also gets a dated entry here in the same session — see the standing workflow rule at the top of `CLAUDE.md`. Versions referenced from the Vercel era (e.g. "v9") are informal milestones kept for history.

---

## [Unreleased] — current backlog

Nothing in progress. Don't start any of these without an explicit ask from Vladimir.

1. **Move IT infrastructure off Vladimir's personal accounts onto Dorte's own** — Railway, Resend, Cloudflare DNS (`deeapril.com`/`maison-dee.com`/`maisondeeapril.com`), and the GitHub repo are all currently under Vladimir's accounts. Domain registrar ownership hasn't been checked. e-conomic does *not* need migration — already on Dorte's own agreement.
2. **`app/DeeAprilB2B.js` is still a ~1450-line monolith** — no routing, all views/state in one file. Not urgent, but worth splitting if the app keeps growing.
3. **No TypeScript, no automated tests** — on a money/invoice app, this is still true. Nothing has caught a bug yet, but it's a standing risk on VAT math / pricing changes.
4. **Fire-and-forget emails and e-conomic sync silently swallow failures** — intentional (a Resend or e-conomic outage must never block an order), but there's no admin-visible alert when something actually fails, only a server log line. Worth a lightweight "last sync failed" indicator in the admin panel at some point.
5. **DEE 04, DEE 05, and DISCOVER ME are placeholder-priced** — WSP/RRP for DEE 04/05 were copied from DEE 01-03 as a stand-in (not real production items yet). Confirm real pricing before setting their stock above zero.

---

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
