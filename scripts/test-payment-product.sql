-- Transactional fixtures only. Does not call Razorpay or create a real payment.
BEGIN;
DO $$
DECLARE customer uuid:=gen_random_uuid(); cart uuid:=gen_random_uuid(); result public.orders;
  address jsonb:='{"fullName":"Payment fixture","addressLine1":"Test only","city":"Chennai","state":"Tamil Nadu","pincode":"600001","country":"India"}';
BEGIN
  INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES(customer,'test-'||customer||'@example.com','{}');
  INSERT INTO profiles(id,email) VALUES(customer,'test-'||customer||'@example.com') ON CONFLICT(id) DO NOTHING;
  PERFORM set_config('request.jwt.claim.sub',customer::text,true);
  INSERT INTO carts(id,user_id) VALUES(cart,customer);
  INSERT INTO cart_items(cart_id,variant_id,quantity) VALUES(cart,'a214e165-6df2-4e31-bc87-aed605ff0102',1);
  BEGIN
    PERFORM public.create_checkout_order(address,'9876543210',NULL,'online');
    RAISE EXCEPTION 'Non-admin checkout was accepted';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM <> 'Payment test item is available to administrators only' THEN RAISE; END IF;
  END;
  UPDATE profiles SET role='admin' WHERE id=customer;
  result:=public.create_checkout_order(address,'9876543210',NULL,'online');
  IF result.total<>1 OR result.amount_due_now<>1 OR result.shipping_cost<>0 OR result.discount_amount<>0 THEN RAISE EXCEPTION 'Wrong test amount'; END IF;
  IF EXISTS(SELECT 1 FROM order_items WHERE order_id=result.id AND supplier_id IS NOT NULL) THEN RAISE EXCEPTION 'Test order has supplier'; END IF;
  IF EXISTS(SELECT 1 FROM vendor_daily_reservations WHERE order_id=result.id) THEN RAISE EXCEPTION 'Test order consumed supplier quota'; END IF;
  UPDATE cart_items SET quantity=2 WHERE cart_id=cart;
  BEGIN
    PERFORM public.create_checkout_order(address,'9876543210',NULL,'online');
    RAISE EXCEPTION 'Quantity restriction failed';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE 'Buy the payment test item%' THEN RAISE; END IF;
  END;
  UPDATE cart_items SET quantity=1 WHERE cart_id=cart;
  UPDATE products SET is_active=false WHERE id='a214e165-6df2-4e31-bc87-aed605ff0101';
  BEGIN
    PERFORM public.create_checkout_order(address,'9876543210',NULL,'online');
    RAISE EXCEPTION 'Private product checkout was accepted';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM = 'Private product checkout was accepted' THEN RAISE; END IF;
  END;
END;
$$;
ROLLBACK;
