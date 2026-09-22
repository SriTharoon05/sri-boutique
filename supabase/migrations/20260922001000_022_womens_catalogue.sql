BEGIN;
CREATE FUNCTION public.exclude_menswear(product_name text, payload jsonb)
RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path=public AS $$
  SELECT upper(trim(coalesce(payload->>'gender',''))) IN ('MEN','MALE','MAN','BOYS','BOY','UNISEX')
    OR coalesce(product_name,'') ~* '\m(men|mens|man|male|boy|boys|unisex)\M';
$$;
CREATE FUNCTION public.enforce_womens_catalogue() RETURNS trigger
LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
  IF public.exclude_menswear(NEW.name,NEW.supplier_payload) THEN NEW.is_active:=false; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER womens_catalogue_before_write BEFORE INSERT OR UPDATE ON public.products
FOR EACH ROW EXECUTE FUNCTION public.enforce_womens_catalogue();
UPDATE public.products SET is_active=false WHERE public.exclude_menswear(name,supplier_payload);
COMMIT;
