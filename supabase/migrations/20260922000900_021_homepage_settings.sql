BEGIN;
CREATE TABLE public.homepage_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  settings jsonb NOT NULL DEFAULT '{"covers":{},"featured":[]}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.homepage_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY homepage_public_read ON public.homepage_settings FOR SELECT USING (true);
CREATE POLICY homepage_admin_write ON public.homepage_settings FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
INSERT INTO public.homepage_settings(id) VALUES(true);
COMMIT;
