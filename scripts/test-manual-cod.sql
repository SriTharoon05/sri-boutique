-- All fixtures and setting changes roll back; never sends a payment or order.
BEGIN;
DO $$
DECLARE
  customer uuid := gen_random_uuid();
  cart uuid := gen_random_uuid();
  variant uuid;
  result public.orders;
  address jsonb := '{"fullName":"Checkout Test","addressLine1":"Test address","city":"Chennai","state":"Tamil Nadu","pincode":"600001","country":"India","email":"qa@example.com"}';
BEGIN
  INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES(customer,'checkout-test-'||customer||'@example.com','{}');
  INSERT INTO public.profiles(id,email) VALUES(customer,'checkout-test-'||customer||'@example.com') ON CONFLICT(id) DO NOTHING;
  PERFORM set_config('request.jwt.claim.sub',customer::text,true);
  INSERT INTO public.carts(id,user_id) VALUES(cart,customer);
  SELECT pv.id INTO variant FROM product_variants pv JOIN products p ON p.id=pv.product_id
    WHERE p.is_active AND pv.is_active AND pv.stock_quantity>1 AND p.source_type='dropship' AND (p.supplier_payload->>'codAvailable')::boolean LIMIT 1;
  IF variant IS NULL THEN RAISE EXCEPTION 'No eligible COD test fixture'; END IF;
  INSERT INTO cart_items(cart_id,variant_id,quantity) VALUES(cart,variant,2);
  UPDATE suppliers SET config=config || '{"cod_enabled":true,"cod_advance":100,"cod_fee":100}'::jsonb WHERE code='shescale';
  result := public.create_checkout_order(address,'9876543210',NULL,'cod');
  IF result.payment_method <> 'cod' OR result.amount_due_now <> 100 OR result.cod_balance <> result.total-100 OR result.cod_fee <> 100 THEN RAISE EXCEPTION 'Incorrect COD split'; END IF;
  IF result.payment_status <> 'pending' THEN RAISE EXCEPTION 'Unpaid advance was marked paid'; END IF;
  IF (SELECT quantity FROM order_items WHERE order_id=result.id) <> 2 THEN RAISE EXCEPTION 'Lost selected quantity'; END IF;
  UPDATE suppliers SET config=config || '{"cod_enabled":false}'::jsonb WHERE code='shescale';
  BEGIN
    PERFORM public.create_checkout_order(address,'9876543210',NULL,'cod');
    RAISE EXCEPTION 'Disabled COD was accepted';
  EXCEPTION WHEN SQLSTATE 'P0001' THEN
    IF SQLERRM <> 'COD is not enabled' THEN RAISE; END IF;
  END;
  result := public.create_checkout_order(address,'9876543210',NULL,'online');
  IF result.amount_due_now <> result.total OR result.cod_balance <> 0 THEN RAISE EXCEPTION 'Incorrect prepaid split'; END IF;
END;
$$;
ROLLBACK;
