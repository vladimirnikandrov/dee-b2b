-- Migration 003: remove password auth entirely — admins now sign in via the
-- same emailed one-time code as buyers. Nothing in the app reads passwords
-- after this; safe to re-run.

drop table if exists password_reset_tokens;
alter table users drop column if exists password_hash;
