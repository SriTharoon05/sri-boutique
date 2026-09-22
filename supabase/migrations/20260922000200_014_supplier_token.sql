BEGIN;
CREATE FUNCTION public.read_shescale_token() RETURNS text
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'sri_shescale_access_token' LIMIT 1;
$$;
CREATE FUNCTION public.save_shescale_token(token text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE secret_id uuid;
BEGIN
  IF length(token) < 20 OR length(token) > 8192 THEN RAISE EXCEPTION 'Invalid token length'; END IF;
  PERFORM pg_advisory_xact_lock(137924, 14);
  SELECT id INTO secret_id FROM vault.secrets WHERE name = 'sri_shescale_access_token';
  IF secret_id IS NULL THEN
    PERFORM vault.create_secret(token, 'sri_shescale_access_token', 'SheScale product read token');
  ELSE
    PERFORM vault.update_secret(secret_id, token);
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.read_shescale_token() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.save_shescale_token(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.read_shescale_token() TO service_role;
GRANT EXECUTE ON FUNCTION public.save_shescale_token(text) TO service_role;
COMMIT;
