BEGIN;
-- Checkout's SECURITY DEFINER function calculates totals and reserves quota.
-- Browsers must not insert self-priced or already-paid orders directly.
DROP POLICY IF EXISTS orders_insert_own ON public.orders;
DROP POLICY IF EXISTS order_items_insert_own ON public.order_items;
REVOKE INSERT ON public.orders, public.order_items FROM anon, authenticated;
COMMIT;
