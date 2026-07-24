-- Dee B2B — Railway Postgres schema
-- Replaces Supabase (Postgres + Auth). Plain SQL, no RLS —
-- authorization now happens exclusively in Next.js API routes.

create extension if not exists pgcrypto; -- for gen_random_uuid()

-- ═══════════════════════════════════════════
-- USERS (replaces Supabase auth.users)
-- ═══════════════════════════════════════════

-- No password_hash — every account (buyer and admin) signs in passwordless
-- via an emailed one-time code (see login_otps below). There's nothing to
-- reset, so no password_reset_tokens table either.
create table users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  company text,                        -- convenience only; buyer_profiles.company is the source of truth for display
  role text not null default 'buyer' check (role in ('buyer', 'admin')),
  created_at timestamptz not null default now()
);

-- One-time login codes emailed to every account (register + every sign-in).
-- Not hashed: 6 digits is brute-forceable regardless of hash, so the real
-- protections are expiry + attempt-limiting + single-use, enforced in
-- lib/auth.js — hashing here would be theater, not a real defense.
create table login_otps (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  code text not null,
  expires_at timestamptz not null,
  attempts integer not null default 0,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index login_otps_email_idx on login_otps(email);

-- ═══════════════════════════════════════════
-- BUYER PROFILES
-- ═══════════════════════════════════════════

create table buyer_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references users(id) on delete cascade,
  company text,
  contact text,
  address text,
  city text,
  country text,
  zip text,
  vat text,
  email text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ═══════════════════════════════════════════
-- INVENTORY
-- ═══════════════════════════════════════════

create table inventory (
  sku text primary key,
  product_name text not null default '',
  size text not null default '',
  stock integer not null default 0,
  updated_at timestamptz default now()
);

-- ═══════════════════════════════════════════
-- ORDERS
-- Order IDs stay in the existing "DA-YYMM-NNNN" shape for continuity,
-- but NNNN now comes from a real sequence instead of Math.random() —
-- fixes the collision risk and gives strictly-increasing invoice numbers.
-- (Whether this satisfies DK bookkeeping's sequential-numbering rule in the
-- legal sense is a question for Dorte's accountant, not resolved here —
-- this only fixes the engineering bug: guaranteed-unique, ordered IDs.)
-- ═══════════════════════════════════════════

create sequence orders_id_seq start 1000;

create or replace function next_order_id() returns text as $$
declare
  seq_val bigint;
begin
  seq_val := nextval('orders_id_seq');
  return 'DA-' || to_char(now(), 'YYMM') || '-' || lpad(seq_val::text, 4, '0');
end;
$$ language plpgsql;

create table orders (
  id text primary key default next_order_id(),
  user_id uuid references users(id),
  buyer_company text,
  buyer_contact text,
  buyer_address text,
  buyer_city text,
  buyer_country text,
  buyer_zip text,
  buyer_vat text,
  buyer_email text,
  lines jsonb not null default '[]',
  total_wsp numeric not null default 0,
  vat_rate numeric not null default 0,
  vat_label text,
  vat_note text,
  vat_amount numeric not null default 0,
  shipping_amount numeric not null default 0,
  total_with_vat numeric not null default 0,
  -- No more 30/70 split — deposit_amount now holds the shipping-only first
  -- invoice, balance_amount the full order value (goods + VAT). Column
  -- names kept as-is to avoid a migration; see lib/pricing.js.
  deposit_amount numeric not null default 0,
  balance_amount numeric not null default 0,
  status_deposit_invoiced boolean default true,
  status_deposit_paid boolean default false,
  status_packed boolean default false,
  status_balance_invoiced boolean default false,
  status_balance_paid boolean default false,
  status_shipped boolean default false,
  status_received boolean default false,
  cancelled boolean default false,
  promo_code text,
  promo_label text,
  created_at timestamptz default now()
);

create index orders_user_id_idx on orders(user_id);

-- ═══════════════════════════════════════════
-- ORDER NOTES
-- ═══════════════════════════════════════════

create table order_notes (
  id uuid primary key default gen_random_uuid(),
  order_id text references orders(id) on delete cascade,
  text text not null,
  author text not null,
  is_admin boolean default false,
  created_at timestamptz default now()
);

create index order_notes_order_id_idx on order_notes(order_id);

-- ═══════════════════════════════════════════
-- PROMO CODES
-- ═══════════════════════════════════════════

create table promo_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  label text not null default '',
  discount_type text not null default 'fixed_prices',
  prices jsonb not null default '{}',
  created_at timestamptz default now()
);
