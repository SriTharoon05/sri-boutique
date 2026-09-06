/* Supplier-neutral dropshipping foundation. Secrets stay in server environment variables. */

CREATE TABLE IF NOT EXISTS suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL CHECK (code ~ '^[a-z0-9_-]+$'),
  name text NOT NULL,
  adapter text NOT NULL,
  base_url text NOT NULL,
  api_key_env text NOT NULL,
  enabled boolean NOT NULL DEFAULT false,
  sync_enabled boolean NOT NULL DEFAULT false,
  auto_publish boolean NOT NULL DEFAULT false,
  target_margin_percent numeric NOT NULL DEFAULT 30 CHECK (target_margin_percent >= 0 AND target_margin_percent < 80),
  minimum_profit numeric NOT NULL DEFAULT 250 CHECK (minimum_profit >= 0),
  forward_shipping_buffer numeric NOT NULL DEFAULT 120 CHECK (forward_shipping_buffer >= 0),
  return_cost_buffer numeric NOT NULL DEFAULT 180 CHECK (return_cost_buffer >= 0),
  payment_fee_percent numeric NOT NULL DEFAULT 2.5 CHECK (payment_fee_percent >= 0 AND payment_fee_percent < 25),
  tax_reserve_percent numeric NOT NULL DEFAULT 5 CHECK (tax_reserve_percent >= 0 AND tax_reserve_percent < 50),
  price_rounding integer NOT NULL DEFAULT 10 CHECK (price_rounding BETWEEN 1 AND 1000),
  max_sync_pages integer NOT NULL DEFAULT 25 CHECK (max_sync_pages BETWEEN 1 AND 250),
  last_sync_at timestamptz,
  last_sync_status text NOT NULL DEFAULT 'never' CHECK (last_sync_status IN ('never', 'running', 'success', 'failed')),
  last_sync_error text,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO suppliers (code, name, adapter, base_url, api_key_env)
VALUES ('shescale', 'SheScale', 'shescale_partner_v1', 'https://api.shescale.in', 'SHESCALE_API_KEY')
ON CONFLICT (code) DO NOTHING;

CREATE TABLE IF NOT EXISTS commerce_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  catalog_mode text NOT NULL DEFAULT 'dropship' CHECK (catalog_mode IN ('dropship', 'hybrid', 'inventory')),
  checkout_enabled boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO commerce_settings (id, catalog_mode) VALUES (true, 'dropship') ON CONFLICT (id) DO NOTHING;

ALTER TABLE categories ADD COLUMN IF NOT EXISTS supplier_id uuid REFERENCES suppliers(id) ON DELETE SET NULL;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS supplier_category_id text;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS synced_at timestamptz;

ALTER TABLE products ADD COLUMN IF NOT EXISTS source_type text NOT NULL DEFAULT 'inventory' CHECK (source_type IN ('inventory', 'dropship'));
ALTER TABLE products ADD COLUMN IF NOT EXISTS supplier_id uuid REFERENCES suppliers(id) ON DELETE SET NULL;
ALTER TABLE products ADD COLUMN IF NOT EXISTS supplier_product_id text;
ALTER TABLE products ADD COLUMN IF NOT EXISTS source_cost numeric CHECK (source_cost IS NULL OR source_cost >= 0);
ALTER TABLE products ADD COLUMN IF NOT EXISTS price_floor numeric NOT NULL DEFAULT 0 CHECK (price_floor >= 0);
ALTER TABLE products ADD COLUMN IF NOT EXISTS compare_at_price numeric CHECK (compare_at_price IS NULL OR compare_at_price >= 0);
ALTER TABLE products ADD COLUMN IF NOT EXISTS supplier_payload jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE products ADD COLUMN IF NOT EXISTS synced_at timestamptz;

ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS supplier_variant_id text;
ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS source_cost numeric CHECK (source_cost IS NULL OR source_cost >= 0);
ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS price_floor numeric NOT NULL DEFAULT 0 CHECK (price_floor >= 0);
ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS synced_at timestamptz;

ALTER TABLE order_items ADD COLUMN IF NOT EXISTS supplier_id uuid REFERENCES suppliers(id) ON DELETE SET NULL;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS supplier_product_id text;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS supplier_variant_id text;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS source_cost numeric CHECK (source_cost IS NULL OR source_cost >= 0);
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS estimated_profit numeric;

CREATE UNIQUE INDEX IF NOT EXISTS idx_categories_supplier_external
  ON categories (supplier_id, supplier_category_id) WHERE supplier_id IS NOT NULL AND supplier_category_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_supplier_external
  ON products (supplier_id, supplier_product_id) WHERE supplier_id IS NOT NULL AND supplier_product_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_variants_supplier_external
  ON product_variants (product_id, supplier_variant_id) WHERE supplier_variant_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_source_active ON products (source_type, is_active);

CREATE TABLE IF NOT EXISTS supplier_sync_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'success', 'failed')),
  products_seen integer NOT NULL DEFAULT 0,
  products_upserted integer NOT NULL DEFAULT 0,
  variants_upserted integer NOT NULL DEFAULT 0,
  error_message text,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz
);

CREATE TABLE IF NOT EXISTS supplier_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  supplier_id uuid NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
  idempotency_key text UNIQUE NOT NULL,
  external_order_id text,
  external_order_number text,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'submitting', 'submitted', 'accepted', 'shipped', 'delivered', 'cancelled', 'failed', 'manual_review')),
  request_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  response_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  attempt_count integer NOT NULL DEFAULT 0,
  last_error text,
  last_attempt_at timestamptz,
  next_retry_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (order_id, supplier_id)
);

ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_sync_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE commerce_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS commerce_settings_public_read ON commerce_settings;
CREATE POLICY commerce_settings_public_read ON commerce_settings FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS commerce_settings_admin_write ON commerce_settings;
CREATE POLICY commerce_settings_admin_write ON commerce_settings FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS categories_public_read ON categories;
DROP POLICY IF EXISTS "categories_public_read" ON categories;
CREATE POLICY categories_public_read ON categories FOR SELECT TO anon, authenticated USING (
  EXISTS (
    SELECT 1 FROM products p, commerce_settings cs
    WHERE p.category_id = categories.id AND p.is_active
      AND (cs.catalog_mode = 'hybrid'
        OR (cs.catalog_mode = 'dropship' AND p.source_type = 'dropship')
        OR (cs.catalog_mode = 'inventory' AND p.source_type = 'inventory'))
  ) OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS products_public_read ON products;
DROP POLICY IF EXISTS "products_public_read" ON products;
CREATE POLICY products_public_read ON products FOR SELECT TO anon, authenticated USING (
  is_active AND EXISTS (
    SELECT 1 FROM commerce_settings cs
    WHERE cs.catalog_mode = 'hybrid'
      OR (cs.catalog_mode = 'dropship' AND products.source_type = 'dropship')
      OR (cs.catalog_mode = 'inventory' AND products.source_type = 'inventory')
  ) OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS variants_public_read ON product_variants;
DROP POLICY IF EXISTS "variants_public_read" ON product_variants;
CREATE POLICY variants_public_read ON product_variants FOR SELECT TO anon, authenticated USING (
  is_active AND EXISTS (SELECT 1 FROM products p WHERE p.id = product_variants.product_id)
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS suppliers_admin_all ON suppliers;
CREATE POLICY suppliers_admin_all ON suppliers FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS supplier_sync_runs_admin_all ON supplier_sync_runs;
CREATE POLICY supplier_sync_runs_admin_all ON supplier_sync_runs FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS supplier_orders_admin_read ON supplier_orders;
CREATE POLICY supplier_orders_admin_read ON supplier_orders FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE OR REPLACE FUNCTION public.create_checkout_order(
  p_shipping_address jsonb,
  p_phone text,
  p_coupon_id uuid DEFAULT NULL
)
RETURNS orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_cart_id uuid;
  v_subtotal numeric := 0;
  v_floor_total numeric := 0;
  v_discount numeric := 0;
  v_shipping numeric := 0;
  v_coupon coupons%ROWTYPE;
  v_order orders%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF NOT coalesce((SELECT checkout_enabled FROM commerce_settings WHERE id = true), true)
    THEN RAISE EXCEPTION 'Checkout is temporarily paused'; END IF;
  IF p_phone !~ '^[0-9]{10}$' THEN RAISE EXCEPTION 'Invalid phone number'; END IF;
  IF coalesce(trim(p_shipping_address->>'fullName'), '') = ''
    OR coalesce(trim(p_shipping_address->>'addressLine1'), '') = ''
    OR coalesce(trim(p_shipping_address->>'city'), '') = ''
    OR coalesce(trim(p_shipping_address->>'state'), '') = ''
    OR coalesce(p_shipping_address->>'pincode', '') !~ '^[0-9]{6}$'
  THEN RAISE EXCEPTION 'Invalid shipping address'; END IF;

  SELECT id INTO v_cart_id FROM carts WHERE user_id = v_user_id
    ORDER BY updated_at DESC LIMIT 1 FOR UPDATE;
  IF v_cart_id IS NULL THEN RAISE EXCEPTION 'Cart not found'; END IF;
  IF NOT EXISTS (SELECT 1 FROM cart_items WHERE cart_id = v_cart_id) THEN RAISE EXCEPTION 'Cart is empty'; END IF;

  IF EXISTS (
    SELECT 1 FROM cart_items ci
    JOIN product_variants pv ON pv.id = ci.variant_id
    JOIN products p ON p.id = pv.product_id
    WHERE ci.cart_id = v_cart_id
      AND (NOT pv.is_active OR NOT p.is_active OR ci.quantity > pv.stock_quantity)
  ) THEN RAISE EXCEPTION 'One or more items are unavailable in the requested quantity'; END IF;

  SELECT coalesce(sum(coalesce(pv.price_override, p.base_price) * ci.quantity), 0),
         coalesce(sum(greatest(p.price_floor, pv.price_floor) * ci.quantity), 0)
    INTO v_subtotal, v_floor_total
  FROM cart_items ci
  JOIN product_variants pv ON pv.id = ci.variant_id
  JOIN products p ON p.id = pv.product_id
  WHERE ci.cart_id = v_cart_id;

  IF p_coupon_id IS NOT NULL THEN
    SELECT * INTO v_coupon FROM coupons WHERE id = p_coupon_id FOR UPDATE;
    IF NOT FOUND OR NOT v_coupon.is_active
      OR (v_coupon.expiry_date IS NOT NULL AND v_coupon.expiry_date <= now())
      OR v_subtotal < v_coupon.min_order_value
      OR (v_coupon.usage_limit IS NOT NULL AND v_coupon.times_used >= v_coupon.usage_limit)
    THEN RAISE EXCEPTION 'Coupon is no longer valid'; END IF;
    IF v_coupon.discount_type = 'percentage' THEN
      v_discount := round(v_subtotal * (v_coupon.discount_value / 100));
    ELSE v_discount := v_coupon.discount_value; END IF;
    v_discount := greatest(0, least(v_discount, v_subtotal - v_floor_total));
  END IF;

  v_shipping := CASE WHEN v_subtotal > 2000 THEN 0 ELSE 99 END;
  INSERT INTO orders (user_id, subtotal, shipping_cost, discount_amount, total, coupon_id, shipping_address, phone, status, payment_status)
  VALUES (v_user_id, v_subtotal, v_shipping, v_discount, v_subtotal - v_discount + v_shipping,
          p_coupon_id, p_shipping_address, p_phone, 'pending', 'pending') RETURNING * INTO v_order;

  INSERT INTO order_items (
    order_id, variant_id, product_name, variant_info, quantity, price_at_purchase,
    supplier_id, supplier_product_id, supplier_variant_id, source_cost, estimated_profit
  )
  SELECT v_order.id, pv.id, p.name,
    jsonb_build_object('color', pv.color, 'size', pv.size, 'sku', pv.sku),
    ci.quantity, coalesce(pv.price_override, p.base_price), p.supplier_id,
    p.supplier_product_id, pv.supplier_variant_id, coalesce(pv.source_cost, p.source_cost),
    (coalesce(pv.price_override, p.base_price) - coalesce(pv.source_cost, p.source_cost, 0)) * ci.quantity
  FROM cart_items ci
  JOIN product_variants pv ON pv.id = ci.variant_id
  JOIN products p ON p.id = pv.product_id
  WHERE ci.cart_id = v_cart_id;
  RETURN v_order;
END;
$$;

REVOKE ALL ON FUNCTION public.create_checkout_order(jsonb, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_checkout_order(jsonb, text, uuid) TO authenticated;
