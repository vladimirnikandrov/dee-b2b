# Dee B2B

B2B wholesale ordering portal for **DEE** — a Danish niche perfume brand.

- **Live:** [order.deeapril.com](https://order.deeapril.com) / [order.maison-dee.com](https://order.maison-dee.com) (same app, two domains)
- **Client:** Dorte — `da@deeapril.com`
- **Built by:** [PROJECT 1804](mailto:hello@vladimirnikandrov.com)

For deep architecture notes, file-by-file responsibilities, and known patterns/gotchas see [`CLAUDE.md`](./CLAUDE.md). For release history see [`CHANGELOG.md`](./CHANGELOG.md).

---

## Tech stack

| Layer      | Tech                                                                 |
| ---------- | --------------------------------------------------------------------- |
| Frontend   | React 19, Next.js 15 (App Router, `"use client"`), inline styles only |
| Backend    | Railway Postgres (plain SQL, no ORM), Next.js API Routes (all auth/authorization in code, no RLS) |
| Auth       | Passwordless — emailed 6-digit OTP for every account (buyer + admin), JWT session cookie |
| Email      | Resend (`order@deeapril.com`, domain verified)                        |
| PDF        | jsPDF (server-side, dark mode)                                        |
| Accounting | e-conomic REST API — live sync to the client's real bookkeeping        |
| Hosting    | Railway (Next.js app + Postgres addon, one project)                   |
| DNS        | Cloudflare                                                             |

No Vercel, no Supabase — fully migrated off both in 2026-07.

## Local setup

Requires Node ≥ 20 (pinned via [`.nvmrc`](./.nvmrc) to LTS 22).

```bash
nvm use            # picks up .nvmrc
npm install
cp .env.local.example .env.local   # then fill in the secrets
npm run dev
```

Open <http://localhost:3000>.

### Environment variables

Set in **Railway → Project → Variables** for production, mirrored locally in `.env.local`. Full descriptions in [`.env.local.example`](./.env.local.example).

| Variable                         | Required? | Notes                                                                 |
| --------------------------------- | --------- | ---------------------------------------------------------------------- |
| `DATABASE_URL`                    | Yes       | Railway auto-injects this when the Postgres addon is linked — don't set manually in production. |
| `JWT_SECRET`                      | Yes       | Session signing. `openssl rand -hex 32` to generate.                  |
| `RESEND_API_KEY`                  | Yes       | Without it, OTP emails and all transactional emails fail.             |
| `RESEND_FROM_EMAIL`               | Yes       | `DEE <order@deeapril.com>`                                            |
| `SITE_URL`                        | No        | Defaults to `https://order.deeapril.com`. Point at the Railway temp domain for pre-cutover testing. |
| `ECONOMIC_APP_SECRET_TOKEN`       | No        | e-conomic sync — no-op (silent) if unset. Live and verified when set. |
| `ECONOMIC_AGREEMENT_GRANT_TOKEN`  | No        | ↑ Obtained via the InstallationURL flow — see `app/api/economic/callback/route.js`. |

## Layout

```
app/
  DeeB2B.js            — Main monolith: all views, state, client-side logic
  layout.js, page.js   — Next.js App Router entry points
  privacy-policy/, eula/, dpa/, legal-layout.js — Legal pages
  api/                 — auth, admin, orders, inventory, promo-codes, profile,
                          generate-invoice, economic — see CLAUDE.md for the full route map
lib/                    — shared logic: db, auth, pricing, vat, countries, products,
                          seller, format, email, invoice-pdf, economic, orders, migrate
db/
  schema.sql            — canonical current schema (apply to a fresh DB)
  migrations/           — applied automatically at boot; append new ones to index.js
  migration-*.sql        — historical, applied by hand before the runner existed
instrumentation.js      — Next.js boot hook: runs pending migrations
CHANGELOG.md            — release history
CLAUDE.md               — full architecture notes
.env.local.example      — env var template
```

### Database migrations

There's nothing to run by hand. `instrumentation.js` applies anything pending on boot — locally on `npm run dev`, in production on deploy — inside one transaction under an advisory lock, tracked in a `schema_migrations` table. To add one, write `db/migrations/00N-name.js` exporting `{ id, async run(tx) }` and append it to `db/migrations/index.js`.

Two rules worth knowing before you write one: migrations are **append-only** (never edit or renumber one that has shipped), and each must be safe to apply **while the previous release is still serving traffic**, because Railway overlaps deployments. The reasoning, and what happens when a migration fails, is documented at the top of [`lib/migrate.js`](./lib/migrate.js).

Full file-by-file breakdown and the reasoning behind key decisions: [`CLAUDE.md`](./CLAUDE.md).

## Deployment

Pushing to `main` deploys automatically — Railway's `web` service is connected directly to this repo (since 2026-07-24):

```bash
git add <files>
git commit -m "description"
git push origin main   # builds and deploys on Railway automatically, no token needed
```

Verify locally before pushing anything non-trivial:

```bash
npm run build
```

**Every deployed change gets a `CHANGELOG.md` entry and a GitHub push in the same session** — see the standing workflow rule at the top of `CLAUDE.md`.

## Order flow

1. Buyer signs up / logs in via a 6-digit code emailed to them — no passwords anywhere.
2. Browses the range at wholesale prices, fills cart, opens checkout.
3. Submits order → server re-derives pricing, decrements stock atomically, inserts the order → **shipping invoice** PDF generated and emailed to the buyer (+ admin alert) → synced to e-conomic.
4. Admin advances status from the admin panel: shipping invoiced (automatic) → shipping paid → packed → **full order invoiced** (second and final invoice, synced to e-conomic) → full order paid → shipped → received. Each step emails the buyer.
5. Deep links `?order=DA-XXXX-XXXX` in email CTAs land the buyer on their specific order after auth.

VAT: Danish 25% for DK, EU reverse charge (0%) when buyer provides a VAT ID, Danish 25% for EU buyers without a VAT ID, 0% export outside EU.

No 30/70 deposit split — see [`CHANGELOG.md`](./CHANGELOG.md) for when/why this changed.

## Status

Production, live on Railway. See [`CHANGELOG.md`](./CHANGELOG.md) for the full release history and the current backlog.
