-- Repair the missing payment binding without replaying migration 007, whose
-- checkout function has since been superseded by the manual-COD implementation.
BEGIN;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS razorpay_order_id text;
CREATE UNIQUE INDEX IF NOT EXISTS orders_razorpay_order_id_unique
  ON public.orders (razorpay_order_id);
NOTIFY pgrst, 'reload schema';
COMMIT;
