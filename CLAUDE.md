# Dee B2B — Wholesale Ordering Platform

## Project Overview
B2B wholesale portal for **DEE** (Danish niche perfume brand).
Client: Dorte (`da@deeapril.com`). Built by PROJECT 1804 (Vladimir Nikandrov).
Live at **order.deeapril.com** and **order.maison-dee.com** (same app, two domains — see Domains section) | Repo: github.com/vladimirnikandrov/dee-b2b

See also: [`README.md`](./README.md) for setup, [`CHANGELOG.md`](./CHANGELOG.md) for release history.

## ⚠️ Standing workflow rule — read this first

**Every change that gets deployed to production must also be committed and pushed to GitHub in the same session, with a `CHANGELOG.md` entry.** This is a durable, explicit instruction from Vladimir (2026-07-18) — do this without asking each time:

1. Make the code change, verify it (build/test/manual check as appropriate).
2. Add a dated entry to `CHANGELOG.md` under a new `## [Unreleased]` or dated heading describing *what changed and why* (not just "updated files").
3. `git add` the specific files touched (never `git add -A` — this repo has stray `.DS_Store` files from Dropbox sync).
4. `git commit` with a message describing the change.
5. `git push origin main`.

Do this **before** ending the turn, not as a separate follow-up. The whole point is that GitHub always mirrors what's actually deployed — if this repo is ever handed to another developer, `git clone` should produce exactly what's running in production, with a changelog explaining how it got there. Before 2026-07-18 this rule did not exist and the repo drifted ~3 months out of sync with production (see CHANGELOG "2026-07-18 — Documentation & backup recovery" entry) — don't let that happen again.

**Since 2026-07-24, step 5 also deploys** — Railway's `web` service auto-deploys from this repo's `main` branch (see Deployment section below), so `git push origin main` is no longer just a backup step, it's the actual deploy trigger. Don't push anything to `main` that isn't meant to go live immediately.

## Tech Stack
- **Frontend**: React 19 (JSX, inline styles — NO Tailwind), Next.js 15 App Router (`"use client"`)
- **Backend**: Railway Postgres (plain SQL via the `postgres` npm package — no ORM, no RLS), Next.js API Routes handle all authorization in code
- **Auth**: Passwordless. Every account (buyer or admin) signs in via an emailed 6-digit OTP. JWT session in an httpOnly cookie (`jose`). No passwords anywhere in this app.
- **Email**: Resend, from `order@deeapril.com` (domain verified)
- **PDF**: jsPDF (server-side, dark mode, logo cached from local file)
- **Accounting sync**: e-conomic REST API (Dorte's real, live account) — invoice drafts created server-side on real invoicing events
- **Hosting**: Railway (single project: Next.js app service + Postgres addon), Nixpacks auto-build. No Vercel, no Supabase — fully migrated off both 2026-07.
- **DNS**: Cloudflare, both domains point at the same Railway `web` service
- **Node**: pinned to 22 LTS via `.nvmrc` (`engines: { node: ">=20" }`)

## File Structure
```
app/
  DeeB2B.js                    — All state, server calls, and view routing (~830 lines). Renders whichever view component matches `view`.
  components/
    shared.js                  — Constants (FONT, ORDER_STATUSES, ...) and small building blocks (Logo, Toast, ConfirmModal, NoteSection, AuthScreen, Header/UserNav) reused across views.
    LandingView.js, ProfileView.js, CatalogView.js, CheckoutView.js, MyOrdersView.js, InvoiceView.js — one view each, receive exactly the state/handlers their JSX needs as named props.
    AdminView.js                — The biggest one (~330 lines): promo codes, inventory, buyers, admins, sync failures, error log, company cards, orders table.
  layout.js                         — Next.js root layout
  page.js                           — Renders <DeeB2B />
  legal-layout.js                   — Shared layout for the legal pages below
  privacy-policy/page.js            — Privacy policy
  eula/page.js                      — EULA
  dpa/page.js                       — Data processing agreement
  api/
    auth/
      request-otp/route.js          — Emails a 6-digit code (register + every sign-in)
      verify-otp/route.js           — Checks code, creates session cookie
      session/route.js              — GET current session ({id, email, role} or null)
      logout/route.js               — Clears session cookie
      register/route.js             — Creates a new buyer account
    admin/
      admins/route.js               — GET list / POST add admin (by email — auto-creates account + Resend welcome email)
      admins/[id]/route.js          — DELETE remove admin (self-removal + last-admin guards)
    orders/
      route.js                      — GET (buyer: own orders; admin: all) / POST create order (server-derives pricing, decrements stock atomically, syncs shipping invoice to e-conomic, sends emails)
      [id]/route.js                 — PATCH edit order lines (re-derives pricing + stock delta server-side)
      [id]/status/route.js          — PATCH toggle a status flag → sends the matching email, generates/attaches PDF for invoice statuses, syncs balance invoice to e-conomic
      [id]/cancel/route.js          — Buyer/admin cancel — refunds stock
      [id]/restore/route.js         — Admin un-cancel
      [id]/notes/route.js           — POST a note — author/is_admin derived from session, never trusted from client
    inventory/route.js               — GET (public) / PUT (admin bulk upsert)
    promo-codes/route.js             — GET (public) / POST, DELETE (admin)
    profile/route.js                 — GET/PUT own buyer_profiles row
    generate-invoice/route.js        — On-demand PDF re-generation (re-fetches order from DB, doesn't trust client payload)
    economic/callback/route.js       — OAuth-style redirect target for e-conomic's InstallationURL flow (this is how Dorte's real AgreementGrantToken was obtained)
lib/                                 — shared between client components and API routes, imported via the `@/lib/...` alias
  db.js                              — Postgres client (tagged-template queries via `postgres`, uses DATABASE_URL)
  auth.js                            — Session signing/verification (JWT + httpOnly cookie), requireAuth/requireAdmin, OTP code generation
  otp.js                             — OTP email delivery helper
  orders.js                          — toFlatOrderData() — converts a DB row (snake_case) to the flat camelCase shape used by PDF/email/client
  pricing.js                         — Server-authoritative pricing: re-derives all amounts from {sku, qty} + buyer country/VAT. Client is never trusted for price data.
  vat.js                             — getVatInfo, DK_VAT_RATE (country resolution delegated to countries.js)
  countries.js                       — Canonical ISO country list + alias normalization. The closed set of values a buyer's country may be.
  migrate.js                         — Migration runner. READ THE RULES AT THE TOP before adding a migration.
  products.js                        — Full SKU catalog: DEE 01-05 (4 sizes each) + DISCOVER ME (see note below)
  seller.js                          — SELLER constants (DA DESIGN APS, CVR 45305481, IBAN, etc.)
  format.js                          — formatEUR (Intl en-IE), SIZE_LABELS
  assets.js                          — Local logo asset paths
  email.js                           — sendTransactionalEmail() — all HTML templates, escapeHtml() on every user-controlled field
  invoice-pdf.js                     — generateInvoicePDF() — jsPDF generation, fmtMoney() € kerning fix (see Known Patterns)
  economic.js                        — syncInvoiceToEconomic() — no-op until ECONOMIC_* env vars are set; never blocks order flow on failure
db/
  schema.sql                        — Canonical current schema (source of truth — apply this to a fresh DB)
  migrations/                         — Auto-applied at boot, newest last. See "Database migrations" below.
    index.js                          — The ordered list. Append here; never reorder or edit a shipped migration.
    005-canonical-country.js           — Backfilled buyer_profiles.country to canonical names
    006-economic-sync-tracking.js      — Added the orders.economic_* columns + backfilled already-invoiced orders
  migration-002-otp-auth.sql          — Historical (pre-runner, applied by hand): added login_otps, dropped NOT NULL on password_hash
  migration-003-remove-passwords.sql  — Historical (pre-runner): dropped password_hash column entirely
  migration-004-sync-failures.sql     — Historical (pre-runner): added the sync_failures table
  seed-data.sql                       — One-time data migrated from the old Supabase database (historical only, do not re-run)
instrumentation.js                  — Next.js boot hook; runs migrations. Node-only half is instrumentation-node.js.
CHANGELOG.md                        — Release history
README.md                           — Project intro + setup
.env.local.example                  — Template for local env vars
jsconfig.json                       — Enables `@/*` path alias
```

**Note on `lib/products.js`**: no named collections (renamed 2026-07-24) — every fragrance is just "DEE 0X", variants ordered smallest to largest (2/20/50/100 ML). DEE 04, DEE 05, and DISCOVER ME exist in the catalog but ship at zero stock (real pricing/photos for 04/05 still pending) — see CHANGELOG backlog.

## Architecture Decisions
- **View state, not URL routing**: `DeeB2B.js` still switches on a `view` string via `useState` rather than Next.js routes — that part is unchanged. Split into per-view components 2026-07-24 (see File Structure above) — all state/handlers still live in `DeeB2B.js`, views are presentational and receive what they need as props.
- **Dark mode everywhere**: Backgrounds `#000` / `#111` / `#1a1a1a`, text `#fff` / `#eee`, borders `#333` / `#444`. Floating elements (cart bar, toast) are WHITE on dark.
- **Inline styles only**: No CSS files, no Tailwind. All styling via `style={{}}` props.
- **Server-authoritative everything**: pricing (`lib/pricing.js`), PDF generation, and email content are all re-derived from the DB by `orderId` server-side — never trust a client-submitted `order`/`data` payload. This was a deliberate fix during the 2026-07 migration (the old Supabase-era code trusted the client for this).
- **No RLS**: Railway Postgres has no row-level security. Every authorization check (own-order-only, admin-only) happens explicitly in the API route handler via `requireAuth()`/`requireAdmin()`.
- **Shared constants live in `lib/`**: imported via `@/lib/...` alias (configured in `jsconfig.json`). Both client and API routes use the same `SELLER`, `formatEUR`, `SIZE_LABELS`, pricing logic.
- **e-conomic sync never blocks order flow**: `syncInvoiceToEconomic()` wraps everything in try/catch and only logs on failure — a broken e-conomic connection must never prevent a buyer from placing or paying for an order.

## Auth (current implementation)
Fully passwordless, buyer and admin identical mechanism:
1. `POST /api/auth/request-otp` with an email — creates a `login_otps` row, emails a 6-digit code (10 min TTL, 5 max attempts, single-use — enforced in `lib/auth.js`). Auto-creates a `users` row on first request (buyer role) unless already registered as admin.
2. `POST /api/auth/verify-otp` with the code — validates, signs a JWT (`role` embedded), sets an httpOnly `da_session` cookie (30-day expiry).
3. Every protected route calls `requireAuth()` (any logged-in user) or `requireAdmin()` (`role === "admin"` only) from `lib/auth.js`.

Admins are managed entirely inside the admin panel — "Admins" section, add by email (auto-creates the account + sends a Resend welcome email), remove with guards against self-removal and removing the last admin. Current admins: `hello@project-1804.com` (Vladimir) and `da@deeapril.com` (Dorte).

## Order Flow
1. Buyer registers / signs in via OTP.
2. Browses the DEE range at wholesale prices → adds to cart → fills shipping/billing → places order.
3. `POST /api/orders`: server re-derives all pricing from `{sku, qty}` + buyer country/VAT (`lib/pricing.js` — client-submitted prices are never trusted), atomically decrements stock (`update ... where stock >= qty`, fails cleanly on race), inserts the order row, generates the **shipping invoice PDF**, emails it to the buyer + an alert to admin, and syncs the shipping invoice to e-conomic.
4. Admin advances statuses from the admin panel (each is a `PATCH /api/orders/:id/status` toggle): `deposit_invoiced` (fires automatically at creation, see above — this key name is historical, it now means "shipping invoiced") → `deposit_paid` → `packed` → `balance_invoiced` (creates the **full order invoice** PDF + email + e-conomic sync — this is the second and final invoice) → `balance_paid` → `shipped` → `received`.
5. Every status toggled ON sends the matching buyer email; the two invoice statuses also generate and attach a fresh PDF.
6. Cancelling an order (buyer within a window, or admin any time) refunds the reserved stock.
7. Deep links `?order=DA-XXXX-XXXX` in email CTAs land the buyer on their specific order after auth.

**No more 30/70 deposit split** (removed 2026-07-15/17, Vladimir's explicit request): the first invoice is shipping-fee-only, the second is the full order value (goods + VAT). The `deposit_amount`/`balance_amount` DB columns kept their names to avoid a migration but now hold shipping-only / full-order-value respectively — see the comment block in `lib/pricing.js` before touching this.

## Database migrations

**Schema changes ship with the code that needs them — never by hand.** `instrumentation.js` runs `lib/migrate.js` on every boot, applying anything in `db/migrations/index.js` not yet recorded in the `schema_migrations` table, inside one transaction under an advisory lock. To add one: write `db/migrations/00N-name.js` exporting `{ id, async run(tx) }`, append it to `index.js`, done — the next `git push` deploys and applies it together.

Rules (the full version, with reasoning, is the comment block at the top of `lib/migrate.js`):
- **Append-only.** Never edit, renumber or reorder a migration that has shipped; it's recorded by `id` and won't run again.
- **Must be safe while the PREVIOUS release is still serving.** Railway overlaps deployments. Add nullable columns, add tables, backfill — don't drop or rename anything the live code still reads. Split destructive changes across two deploys.
- All migrations run in one transaction, so nothing needing its own (`CREATE INDEX CONCURRENTLY`) belongs here — that's a `railway run` break-glass job.
- Write them idempotently anyway (`if not exists`, guarded updates).
- **A failed migration is fatal on purpose, via an explicit `process.exit(1)`.** Do not "simplify" this into a `throw`. Throwing from the instrumentation hook does NOT stop the server on Next.js 15 — the rejection is swallowed by `prepare().catch(console.error)`, the port stays bound, every request (including static pages) returns 500, and the memoized promises mean it never retries and never recovers. Measured, not assumed. The explicit exit is what makes a failed migration fail the *deploy* and leave the previous version serving.
- `db/schema.sql` stays the bootstrap for a fresh database. Apply it first, then the runner catches up.

## VAT logic (`lib/vat.js` + `lib/countries.js`)
- DK → 25% Danish VAT
- EU + valid VAT ID → 0% reverse charge (Art. 196 Council Directive 2006/112/EC)
- EU without VAT ID → 25% Danish VAT
- Outside EU → 0% export

**The country is a closed set, not free text** (since 2026-07-26). `lib/countries.js` owns the canonical ISO list; `getVatInfo` resolves a string to an alpha-2 code and decides from that, so spelling never affects tax. Things to know before touching this:
- **Never rewrite `orders.buyer_country`.** It's the record of what was actually invoiced. `buyer_profiles.country` is the one that gets canonicalized (migration 005), because it prefills the next order.
- **`lib/economic.js` derives the VAT zone from the frozen `orders.vat_rate`, not from a fresh `getVatInfo` call.** This is deliberate and load-bearing: draft creation can happen long after the order, so recomputing would let any future improvement to country matching re-book historical orders into a different tax zone than the invoice the buyer holds. There's a regression test for it.
- Territories outside the EU VAT area (Greenland, Faroes, Åland, French DOMs) are separate entries and land on the export branch — which is what the old hardcoded array did too. Not a settled tax opinion; see the file header.

## Shipping and its VAT (`lib/products.js`, `lib/pricing.js`)
**Shipping is quoted GROSS.** `SHIPPING_RATES_GROSS` — Denmark 9.25, everywhere else 35.00 — is the final amount the buyer pays. VAT is inside it and is never added on top (Dorte's accountant's decision, 2026-07-26). `splitShipping()` divides the quote into the net line and the VAT within it:

| column | is |
|---|---|
| `shipping_amount` | NET — the invoice line, and e-conomic's `unitNetPrice` |
| `shipping_vat_amount` | the VAT inside the charge |
| `deposit_amount` | GROSS — the two summed; the shipping-only first invoice |
| `vat_amount` | goods VAT **plus** shipping VAT — the invoice's VAT total |
| `balance_amount` | goods + goods VAT **only** — never include shipping VAT here, or the two invoices double-count it |

Things that will bite you:
- **Send e-conomic the NET.** It applies the customer's `vatZone` to `unitNetPrice` itself. Sending the gross is exactly what made a 35.00 charge book as 43.75 against a 35.00 invoice.
- **A rate has to survive re-grossing**: `net x 1.25` must land exactly on the quoted gross, which at 25% requires a gross that is a multiple of 0.05. About a fifth of cent values fail. `lib/__tests__/pricing.test.js` pins this for every configured rate — if you add a rate and that test fails, the rate is wrong, not the test.
- **Shipping is listed above the VAT line** on the invoice view, the PDF, the confirmation email and the checkout summary. Below it, the document reads as though the VAT covered only the goods.
- **Order edits never re-price freight** from the current rate table — the order keeps the split it was quoted at.
- Pre-migration-008 rows hold the whole charge in `shipping_amount` with no VAT split, and are deliberately not backfilled.

## e-conomic integration (`lib/economic.js`)
Live and verified against Dorte's real account (agreement 1797386 / DA DESIGN ApS) since 2026-07-17. Key things to know before touching this file:
- **`recipient` object is mandatory** on invoice draft creation, with its own `vatZone` — a bare customer reference isn't enough. Found via live-API testing, not documented clearly by e-conomic.
- **Any line with `quantity`/`unitNetPrice` must reference a real `product.productNumber`** — a description-only line with a manual amount is silently accepted but produces a `netAmount: 0` line, not an error. Always verify a test draft's actual totals after creation, don't trust the 200 response alone.
- `SKU_TO_ECONOMIC_PRODUCT` maps this app's SKUs 1:1 to Dorte's real e-conomic product catalog (verified, not guessed) — shipping maps to her "TRANSPORT" product (#1001).
- **Check the published JSON schemas before guessing a field name.** They're public and unauthenticated: `https://restapi.e-conomic.com/schema/<resource>.<verb>.schema.json` (e.g. `invoices.drafts.post.schema.json`, `customers.get.schema.json`). That's how `references.other`, `draftInvoiceNumber` and the customer filter fields were settled without posting a test draft into her live books. Filter syntax and its escape scheme are at restdocs.e-conomic.com/#filtering.
- **The order id travels in `references.other`** so a draft in her agreement can be traced back here (and it's filterable, so by API too). Deliberately not in the line descriptions — that would change what prints on the invoices she sends to customers.
- **A buyer's customer card is resolved once and remembered** in `buyer_profiles.economic_customer_number`. Don't reintroduce a per-order name search: that's what created a new card for every spelling variation of a company name. The first-time lookup prefers the VAT number over the name.
- `customerGroupNumber` (1=Danish/2=Foreign), `vatZoneNumber` (1=Domestic/2=EU/3=Abroad), `paymentTermsNumber: 4` ("Net 14 days"), `layoutNumber: 22` ("DEE APRIL Sort layout engelsk") were all reverse-engineered from her ~15 existing wholesale customers, not the account defaults — don't change these without re-checking against her live customer list.
- If `ECONOMIC_APP_SECRET_TOKEN` / `ECONOMIC_AGREEMENT_GRANT_TOKEN` are unset, every sync call is a silent no-op — safe for local dev.
- **Draft creation is claimed before it happens** (2026-07-26). Two timestamps per invoice: `economic_*_claimed_at` (attempt in flight — the lock) and `economic_*_synced_at` (draft confirmed). `syncInvoiceToEconomic` claims with an `UPDATE … WHERE synced_at IS NULL AND (claimed_at IS NULL OR claimed_at < now() - 15min)` and only posts if it won. That's what stops a re-toggled status from putting a second invoice into her real books. **Keep them separate** — collapsing to one column means a crash between claiming and creating marks the order done forever with no invoice in her books.
- **The claim is released only when the draft provably was never sent.** If the create request was already dispatched (dropped connection, timeout), the lock is kept and the sync-failure row tells a human to check e-conomic first. Releasing there would book a real duplicate.
- An order-line edit clears the claim so a corrected draft can be re-issued — that off/on toggle is the only re-issue path the UI has, so don't remove the clearing in `app/api/orders/[id]/route.js` without replacing it. It keeps the old draft *number* deliberately: that stale document still needs deleting by hand in e-conomic.
- The draft number is read from the create response defensively; the exact field name has never been confirmed against a live call (that would post a real draft into her accounting). "Synced, no number" in the admin panel means that guess is wrong — it does not mean the draft is missing.

## Known Patterns & Past Fixes
- **jsPDF € kerning bug**: jsPDF's built-in Helvetica has broken glyph-width metrics for "€" — glues it to the following digit. Fixed with `fmtMoney()` in `lib/invoice-pdf.js` (inserts a space after the symbol) — this wrapper is PDF-only, `formatEUR()` itself (used in HTML/email) is unaffected and must stay that way.
- **Apple Mail `<table background>` bug**: Apple Mail doesn't reliably honor a `background` CSS property on a `<table>` element — causes a visible white gap. Fix is to set `bgcolor="..."` as an attribute *and* put `background` on the inner `<td>` too, not just the table. See the "Next Step" boxes in `lib/email.js`.
- **NEXT_PUBLIC_ADMIN_PASSWORD is gone** — do not reintroduce a client-side admin check. Admin is a `role` column checked server-side via `requireAdmin()`.
- **No RLS anywhere** — every new API route needs its own explicit `requireAuth()`/`requireAdmin()` call. There is no safety net.
- **Never trust client-submitted order/pricing data** — always re-derive from the DB by `orderId` server-side (see `lib/pricing.js`, `generate-invoice/route.js`).
- **Fire-and-forget emails/e-conomic sync**: intentional — a Resend or e-conomic failure must never block the order flow. Failures are logged via `console.error`, not surfaced to the buyer. This is a known tradeoff, not an oversight.
- **Dark-mode contrast traps**: always check text/badge colors against dark backgrounds — common bugs are white-on-white and black-on-black.
- **`viewRef` pattern**: `useRef(view)` mirrors view state for use inside async callbacks (stale-closure fix), still present in `DeeB2B.js`.

## Environment Variables
See [`.env.local.example`](./.env.local.example) for the full list with descriptions. Set the same values in **Railway → Project → Variables** for production (Railway auto-injects `DATABASE_URL` when the Postgres addon is linked — don't set it manually).

## Domains
- `order.deeapril.com` — original domain, still the default (`SITE_URL` fallback in `lib/email.js`).
- `order.maison-dee.com` — added 2026-07. Both domains serve the identical Railway app. The brand itself was renamed to plain **"DEE"** on 2026-07-24 (see CHANGELOG) — the domain question (which URL becomes primary, whether the sender email moves off `deeapril.com`) is separate and still open, don't assume either domain "wins" just because of the brand name.
- DNS for both (plus the defensively-registered `maisondeeapril.com`) is on Cloudflare, currently under Vladimir's personal account — flagged in the backlog to eventually move to Dorte's own accounts (Railway, Resend, Cloudflare, GitHub) alongside the domain registrar itself.

## Git Workflow
```bash
git add <specific files>   # never `git add -A` — Dropbox drops .DS_Store files everywhere
git commit -m "description"
git push origin main       # this now triggers a live Railway deploy automatically — see below
```
**Deploys auto-trigger from GitHub as of 2026-07-24**: the `web` service's Source is connected directly to this repo's `main` branch on Railway — every push builds and deploys automatically, no CLI or token needed. Before that date, deploys were a separate manual `railway up --ci --service web` step (needs `RAILWAY_API_TOKEN` env var, not `RAILWAY_TOKEN`) — that command still works if you ever need to force a deploy without pushing (e.g. testing an uncommitted change), but the normal path is just `git push`.

## Style & Communication
- Client emails: always professional, concise, no fluff.
- Code: pragmatic, ship-ready, no over-engineering. Inline styles, single-file components are OK.
- UI: dark luxury aesthetic, minimal, DEE brand language.
