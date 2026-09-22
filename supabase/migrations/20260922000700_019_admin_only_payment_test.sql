BEGIN;
CREATE POLICY payment_test_admin_only ON public.products AS RESTRICTIVE FOR SELECT TO anon,authenticated
  USING (id <> 'a214e165-6df2-4e31-bc87-aed605ff0101' OR public.is_admin());
CREATE POLICY payment_test_variant_admin_only ON public.product_variants AS RESTRICTIVE FOR SELECT TO anon,authenticated
  USING (product_id <> 'a214e165-6df2-4e31-bc87-aed605ff0101' OR public.is_admin());

CREATE OR REPLACE FUNCTION public.create_checkout_order(p_shipping_address jsonb,p_phone text,p_coupon_id uuid DEFAULT NULL,p_payment_method text DEFAULT 'online')
RETURNS public.orders LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE result public.orders;
BEGIN
  IF NOT coalesce(public.is_admin(),false) AND EXISTS(
    SELECT 1 FROM cart_items ci JOIN carts c ON c.id=ci.cart_id
    WHERE c.user_id=auth.uid() AND ci.variant_id='a214e165-6df2-4e31-bc87-aed605ff0102'
  ) THEN RAISE EXCEPTION 'Payment test item is available to administrators only'; END IF;
  result := public.create_checkout_order_standard(p_shipping_address,p_phone,p_coupon_id,p_payment_method);
  IF EXISTS(SELECT 1 FROM order_items WHERE order_id=result.id AND variant_id='a214e165-6df2-4e31-bc87-aed605ff0102') THEN
    IF (SELECT count(*) FROM order_items WHERE order_id=result.id) <> 1
       OR EXISTS(SELECT 1 FROM order_items WHERE order_id=result.id AND quantity<>1)
       OR p_coupon_id IS NOT NULL OR p_payment_method <> 'online' THEN
      RAISE EXCEPTION 'Buy the payment test item separately, quantity one, without coupons, using online payment';
    END IF;
    UPDATE order_items SET price_at_purchase=1 WHERE order_id=result.id;
    UPDATE orders SET subtotal=1,shipping_cost=0,discount_amount=0,total=1,amount_due_now=1
      WHERE id=result.id RETURNING * INTO result;
  END IF;
  RETURN result;
END;
$$;
NOTIFY pgrst,'reload schema';
COMMIT;
