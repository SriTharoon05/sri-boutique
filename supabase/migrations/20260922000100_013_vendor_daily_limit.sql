-- One reservation per vendor-containing checkout; cancellations do not release it.
BEGIN;
CREATE TABLE public.vendor_daily_reservations (
  order_id uuid PRIMARY KEY,
  quota_day date NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Kolkata')::date,
  reserved_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX vendor_reservations_day ON public.vendor_daily_reservations(quota_day);
ALTER TABLE public.vendor_daily_reservations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.vendor_daily_reservations FROM anon, authenticated;
GRANT ALL ON public.vendor_daily_reservations TO service_role;
-- No FK: deleting an order must not restore a consumed slot.
INSERT INTO public.vendor_daily_reservations(order_id, quota_day, reserved_at)
SELECT DISTINCT o.id, (o.created_at AT TIME ZONE 'Asia/Kolkata')::date, o.created_at
FROM public.orders o JOIN public.order_items oi ON oi.order_id = o.id
WHERE oi.supplier_id IS NOT NULL;

CREATE FUNCTION public.reserve_vendor_daily_slot() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  today date := (now() AT TIME ZONE 'Asia/Kolkata')::date;
  used integer;
BEGIN
  IF NEW.supplier_id IS NULL THEN RETURN NEW; END IF;
  PERFORM pg_advisory_xact_lock(137924, 10);
  IF EXISTS (SELECT 1 FROM vendor_daily_reservations WHERE order_id = NEW.order_id)
    THEN RETURN NEW; END IF;
  SELECT count(*) INTO used FROM vendor_daily_reservations WHERE quota_day = today;
  IF used >= 10 THEN
    RAISE EXCEPTION 'Vendor products are out of stock for today. Please try again after midnight IST.' USING ERRCODE = 'P0001';
  END IF;
  INSERT INTO vendor_daily_reservations(order_id, quota_day) VALUES (NEW.order_id, today);
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.reserve_vendor_daily_slot() FROM PUBLIC;
CREATE TRIGGER enforce_vendor_daily_limit BEFORE INSERT ON public.order_items
FOR EACH ROW EXECUTE FUNCTION public.reserve_vendor_daily_slot();

CREATE FUNCTION public.vendor_daily_quota() RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'limit', 10, 'remaining', greatest(0, 10 - count(*)),
    'day', (now() AT TIME ZONE 'Asia/Kolkata')::date,
    'resetsAt', (((now() AT TIME ZONE 'Asia/Kolkata')::date + 1)::timestamp AT TIME ZONE 'Asia/Kolkata')
  ) FROM vendor_daily_reservations
  WHERE quota_day = (now() AT TIME ZONE 'Asia/Kolkata')::date;
$$;
REVOKE ALL ON FUNCTION public.vendor_daily_quota() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.vendor_daily_quota() TO anon, authenticated, service_role;
COMMIT;
