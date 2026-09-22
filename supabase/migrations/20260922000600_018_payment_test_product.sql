BEGIN;
INSERT INTO public.products(id,name,slug,description,base_price,is_active,source_type)
VALUES('a214e165-6df2-4e31-bc87-aed605ff0101','₹1 Payment Test — No Delivery','payment-test-one-rupee',
  'Payment verification only. No physical product will be shipped. Total ₹1, no shipping charge. Buy separately, quantity one, online payment only. With live payment keys this is a real ₹1 charge.',1,true,'inventory');
INSERT INTO public.product_variants(id,product_id,sku,size,stock_quantity,image_urls,is_active)
VALUES('a214e165-6df2-4e31-bc87-aed605ff0102','a214e165-6df2-4e31-bc87-aed605ff0101','SRI-PAYMENT-TEST-1','Test only',1000,ARRAY['/images/payment-test.svg'],true);

-- Keep the existing supplier/COD/stock validations intact.
ALTER FUNCTION public.create_checkout_order(jsonb,text,uuid,text) RENAME TO create_checkout_order_standard;
REVOKE ALL ON FUNCTION public.create_checkout_order_standard(jsonb,text,uuid,text) FROM PUBLIC,anon,authenticated;
CREATE FUNCTION public.create_checkout_order(p_shipping_address jsonb,p_phone text,p_coupon_id uuid DEFAULT NULL,p_payment_method text DEFAULT 'online')
RETURNS public.orders LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE result public.orders;
BEGIN
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
REVOKE ALL ON FUNCTION public.create_checkout_order(jsonb,text,uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.create_checkout_order(jsonb,text,uuid,text) TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
