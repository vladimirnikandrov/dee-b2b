-- Migration 004: sync_failures table — admin-visible record of failed
-- transactional emails / e-conomic syncs (previously only a server log
-- line). Safe to re-run.

create table if not exists sync_failures (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('email', 'economic')),
  order_id text references orders(id) on delete set null,
  context text not null,
  error text not null,
  resolved boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists sync_failures_unresolved_idx on sync_failures(resolved, created_at) where resolved = false;
