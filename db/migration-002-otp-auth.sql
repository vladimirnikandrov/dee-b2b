-- Migration 002: passwordless buyer login (email + OTP) + admin management.
-- Run once against an already-provisioned database (local + Railway).
-- Safe to re-run: every statement is idempotent.

alter table users alter column password_hash drop not null;

create table if not exists login_otps (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  code text not null,
  expires_at timestamptz not null,
  attempts integer not null default 0,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists login_otps_email_idx on login_otps(email);
