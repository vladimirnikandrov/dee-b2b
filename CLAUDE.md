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
  vat.js                             — getVatInfo, EU_COUNTRIES, DK_VAT_RATE
  products.js                        — Full SKU catalog: DEE 01-05 (4 sizes each) + DISCOVER ME (see note below)
  seller.js                          — SELLER constants (DA DESIGN APS, CVR 45305481, IBAN, etc.)
  format.js                          — formatEUR (Intl en-IE), SIZE_LABELS
  assets.js                          — Local logo asset paths
  email.js                           — sendTransactionalEmail() — all HTML templates, escapeHtml() on every user-controlled field
  invoice-pdf.js                     — generateInvoicePDF() — jsPDF generation, fmtMoney() € kerning fix (see Known Patterns)
  economic.js                        — syncInvoiceToEconomic() — no-op until ECONOMIC_* env vars are set; never blocks order flow on failure
db/
  schema.sql                        — Canonical current schema (source of truth — apply this to a fresh DB)
  migration-002-otp-auth.sql          — Historical: added login_otps table, dropped NOT NULL on password_hash
  migration-003-remove-passwords.sql  — Historical: dropped password_hash column entirely
  seed-data.sql                       — One-time data migrated from the old Supabase database (historical only, do not re-run)
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

## VAT logic (`lib/vat.js`)
- DK → 25% Danish VAT
- EU + valid VAT ID → 0% reverse charge (Art. 196 Council Directive 2006/112/EC)
- EU without VAT ID → 25% Danish VAT
- Outside EU → 0% export

## e-conomic integration (`lib/economic.js`)
Live and verified against Dorte's real account (agreement 1797386 / DA DESIGN ApS) since 2026-07-17. Key things to know before touching this file:
- **`recipient` object is mandatory** on invoice draft creation, with its own `vatZone` — a bare customer reference isn't enough. Found via live-API testing, not documented clearly by e-conomic.
- **Any line with `quantity`/`unitNetPrice` must reference a real `product.productNumber`** — a description-only line with a manual amount is silently accepted but produces a `netAmount: 0` line, not an error. Always verify a test draft's actual totals after creation, don't trust the 200 response alone.
- `SKU_TO_ECONOMIC_PRODUCT` maps this app's SKUs 1:1 to Dorte's real e-conomic product catalog (verified, not guessed) — shipping maps to her "TRANSPORT" product (#1001).
- `customerGroupNumber` (1=Danish/2=Foreign), `vatZoneNumber` (1=Domestic/2=EU/3=Abroad), `paymentTermsNumber: 4` ("Net 14 days"), `layoutNumber: 22` ("DEE APRIL Sort layout engelsk") were all reverse-engineered from her ~15 existing wholesale customers, not the account defaults — don't change these without re-checking against her live customer list.
- If `ECONOMIC_APP_SECRET_TOKEN` / `ECONOMIC_AGREEMENT_GRANT_TOKEN` are unset, every sync call is a silent no-op — safe for local dev.

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
