BEGIN;
-- Preserve all existing validation, inventory and quota logic; change only freight.
DO $$
DECLARE definition text;
BEGIN
  SELECT pg_get_functiondef('public.create_checkout_order_base(jsonb,text,uuid)'::regprocedure) INTO definition;
  IF position('v_shipping := CASE WHEN v_subtotal > 2000 THEN 0 ELSE 99 END;' IN definition) = 0 THEN
    RAISE EXCEPTION 'Unexpected checkout shipping definition; migration aborted';
  END IF;
  EXECUTE replace(definition,
    'v_shipping := CASE WHEN v_subtotal > 2000 THEN 0 ELSE 99 END;',
    'v_shipping := 0; -- Delivery included in online product prices; COD adds its shipping fee separately.');
END $$;
UPDATE public.suppliers SET config=config || '{"cod_advance":100,"cod_fee":100}'::jsonb WHERE code='shescale';
NOTIFY pgrst,'reload schema';
COMMIT;
