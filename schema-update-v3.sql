-- ═══════════════════════════════════════════
-- DEE APRIL B2B — SCHEMA UPDATE V3: Delete policies
-- Run this in Supabase SQL Editor AFTER schema-update-v2.sql
-- ═══════════════════════════════════════════

-- Allow deleting orders (needed for admin permanent delete)
create policy "Delete any order" on orders for delete using (true);

-- Allow deleting order notes directly (cascade handles FK, but explicit policy needed for direct deletes)
create policy "Delete notes" on order_notes for delete using (true);

-- (promo_codes DELETE policy already exists from schema-update.sql)
