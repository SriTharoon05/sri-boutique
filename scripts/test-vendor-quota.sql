-- Test the actual trigger inside a rolled-back transaction. No customer orders,
-- payments or permanent quota reservations are created.
BEGIN;
CREATE TEMP TABLE quota_probe (order_id uuid, supplier_id uuid);
CREATE TRIGGER test_quota BEFORE INSERT ON quota_probe
FOR EACH ROW EXECUTE FUNCTION public.reserve_vendor_daily_slot();
DO $$
DECLARE
  remaining integer := (public.vendor_daily_quota()->>'remaining')::integer;
  test_order uuid;
  i integer;
BEGIN
  FOR i IN 1..remaining LOOP
    test_order := gen_random_uuid();
    INSERT INTO quota_probe VALUES(test_order, gen_random_uuid());
    INSERT INTO quota_probe VALUES(test_order, gen_random_uuid()); -- multi-item order uses one slot
  END LOOP;
  IF (public.vendor_daily_quota()->>'remaining')::integer <> 0 THEN
    RAISE EXCEPTION 'Expected zero slots after ten vendor orders';
  END IF;
  BEGIN
    INSERT INTO quota_probe VALUES(gen_random_uuid(), gen_random_uuid());
    RAISE EXCEPTION 'Eleventh vendor order was allowed';
  EXCEPTION WHEN SQLSTATE 'P0001' THEN
    IF SQLERRM NOT LIKE 'Vendor products are out of stock%' THEN RAISE; END IF;
  END;
  INSERT INTO quota_probe VALUES(gen_random_uuid(), NULL); -- own inventory unaffected
END;
$$;
ROLLBACK;
