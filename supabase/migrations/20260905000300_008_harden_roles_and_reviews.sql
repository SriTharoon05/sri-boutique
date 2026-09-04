/* Prevent customer role escalation and require the reviewed product in the delivered order. */
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin');
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated;

DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
CREATE POLICY "profiles_select_own" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = id OR public.is_admin());

REVOKE UPDATE ON profiles FROM authenticated;
GRANT UPDATE (full_name, avatar_url, phone) ON profiles TO authenticated;

DROP POLICY IF EXISTS "reviews_insert_verified" ON reviews;
CREATE POLICY "reviews_insert_verified" ON reviews FOR INSERT
  TO authenticated WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1
      FROM orders o
      JOIN order_items oi ON oi.order_id = o.id
      JOIN product_variants pv ON pv.id = oi.variant_id
      WHERE o.id = reviews.order_id
        AND o.user_id = auth.uid()
        AND o.status = 'delivered'
        AND pv.product_id = reviews.product_id
    )
  );
