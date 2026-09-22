BEGIN;
ALTER TABLE public.orders ADD COLUMN payment_method text NOT NULL DEFAULT 'online' CHECK (payment_method IN ('online','cod'));
ALTER TABLE public.orders ADD COLUMN amount_due_now numeric;
ALTER TABLE public.orders ADD COLUMN cod_balance numeric NOT NULL DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN cod_fee numeric NOT NULL DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN supplier_reference text;
ALTER FUNCTION public.create_checkout_order(jsonb,text,uuid) RENAME TO create_checkout_order_base;
REVOKE ALL ON FUNCTION public.create_checkout_order_base(jsonb,text,uuid) FROM PUBLIC, anon, authenticated;
CREATE FUNCTION public.create_checkout_order(p_shipping_address jsonb, p_phone text, p_coupon_id uuid DEFAULT NULL, p_payment_method text DEFAULT 'online')
RETURNS public.orders LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  result public.orders;
  supplier_config jsonb;
  advance numeric;
  extra numeric;
BEGIN
  IF p_payment_method NOT IN ('online','cod') THEN RAISE EXCEPTION 'Unsupported payment method'; END IF;
  IF length(coalesce(p_shipping_address->>'email','')) > 254 OR (coalesce(p_shipping_address->>'email','') <> '' AND p_shipping_address->>'email' !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$') THEN RAISE EXCEPTION 'Invalid email'; END IF;
  result := public.create_checkout_order_base(p_shipping_address,p_phone,p_coupon_id);
  IF p_payment_method = 'cod' THEN
    -- One product per COD checkout makes the manual supplier advance and
    -- courier balance unambiguous; quantities of that variant remain supported.
    IF (SELECT count(*) FROM order_items WHERE order_id=result.id) <> 1 THEN RAISE EXCEPTION 'COD requires a single product per order'; END IF;
    SELECT s.config INTO supplier_config FROM order_items oi JOIN suppliers s ON s.id=oi.supplier_id
      WHERE oi.order_id=result.id AND s.enabled AND s.code='shescale';
    IF NOT coalesce((supplier_config->>'cod_enabled')::boolean,false) THEN RAISE EXCEPTION 'COD is not enabled'; END IF;
    IF EXISTS (SELECT 1 FROM order_items oi JOIN product_variants pv ON pv.id=oi.variant_id JOIN products p ON p.id=pv.product_id WHERE oi.order_id=result.id AND NOT coalesce((p.supplier_payload->>'codAvailable')::boolean,false)) THEN RAISE EXCEPTION 'COD is unavailable for this product'; END IF;
    advance := coalesce((supplier_config->>'cod_advance')::numeric,100);
    extra := coalesce((supplier_config->>'cod_fee')::numeric,100);
    IF advance < 1 OR extra < 0 OR advance > result.total + extra THEN RAISE EXCEPTION 'Invalid COD configuration'; END IF;
    UPDATE orders SET payment_method='cod', total=total+extra, cod_fee=extra, amount_due_now=advance, cod_balance=total+extra-advance WHERE id=result.id RETURNING * INTO result;
  ELSE
    UPDATE orders SET amount_due_now=total WHERE id=result.id RETURNING * INTO result;
  END IF;
  RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION public.create_checkout_order(jsonb,text,uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_checkout_order(jsonb,text,uuid,text) TO authenticated;
-- Enabled only by the owner after checking courier/serviceability/settlement.
UPDATE suppliers SET config=config || '{"cod_enabled":false,"cod_advance":100,"cod_fee":100}'::jsonb WHERE code='shescale';
COMMIT;
