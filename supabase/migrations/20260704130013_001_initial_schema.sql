/*
# Sri Boutique - Initial Database Schema

This migration creates the complete database schema for a premium e-commerce boutique store.

## Tables Created:
1. **profiles** - User profiles extending auth.users with role-based access (customer/admin)
2. **categories** - Product categories with hierarchical structure (parent_id for subcategories)
3. **products** - Main product catalog with pricing, ratings, and soft-delete (is_active)
4. **product_variants** - SKU-level variants with color, size, stock, and images
5. **carts** - Shopping carts supporting both guest (session_id) and authenticated (user_id) users
6. **cart_items** - Items in carts with quantity tracking
7. **coupons** - Discount codes with percentage/flat discounts and usage limits
8. **orders** - Customer orders with status tracking, shipping, and payment info
9. **order_items** - Line items for each order capturing price at purchase
10. **reviews** - Product reviews with verified purchase enforcement

## Security:
- RLS enabled on ALL tables
- Public read for products/categories/variants (browse catalog)
- User-scoped access for carts/orders/reviews
- Admin-only write for products/categories/coupons
- Review insert requires verified delivered order

## Triggers:
- Auto-create profile on user signup
- Auto-update product ratings on review changes
- Auto-decrement stock on paid orders
- Auto-generate order numbers
*/

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create sequence for order numbers (must be before orders table)
CREATE SEQUENCE IF NOT EXISTS order_number_seq START 1;

-- 1. PROFILES TABLE
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  email text,
  avatar_url text,
  phone text,
  role text NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'admin')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2. CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text,
  parent_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  image_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3. PRODUCTS TABLE
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text,
  base_price numeric NOT NULL CHECK (base_price >= 0),
  is_active boolean NOT NULL DEFAULT true,
  avg_rating numeric DEFAULT 0 CHECK (avg_rating >= 0 AND avg_rating <= 5),
  review_count integer DEFAULT 0 CHECK (review_count >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 4. PRODUCT_VARIANTS TABLE
CREATE TABLE IF NOT EXISTS product_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  sku text UNIQUE NOT NULL,
  color text,
  size text,
  price_override numeric CHECK (price_override >= 0),
  stock_quantity integer NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
  image_urls text[] DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 5. CARTS TABLE
CREATE TABLE IF NOT EXISTS carts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  session_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 6. CART_ITEMS TABLE
CREATE TABLE IF NOT EXISTS cart_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id uuid NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
  variant_id uuid NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 7. COUPONS TABLE
CREATE TABLE IF NOT EXISTS coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  discount_type text NOT NULL CHECK (discount_type IN ('percentage', 'flat')),
  discount_value numeric NOT NULL CHECK (discount_value > 0),
  min_order_value numeric NOT NULL DEFAULT 0 CHECK (min_order_value >= 0),
  expiry_date timestamptz,
  usage_limit integer CHECK (usage_limit IS NULL OR usage_limit > 0),
  times_used integer NOT NULL DEFAULT 0 CHECK (times_used >= 0),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 8. ORDERS TABLE
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  order_number text UNIQUE NOT NULL DEFAULT 'SB-' || to_char(now(), 'YYYY') || '-' || LPAD(nextval('order_number_seq')::text, 6, '0'),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'shipped', 'delivered', 'cancelled', 'refunded')),
  subtotal numeric NOT NULL CHECK (subtotal >= 0),
  shipping_cost numeric NOT NULL DEFAULT 0 CHECK (shipping_cost >= 0),
  discount_amount numeric NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
  total numeric NOT NULL CHECK (total >= 0),
  coupon_id uuid REFERENCES coupons(id) ON DELETE SET NULL,
  shipping_address jsonb NOT NULL,
  phone text NOT NULL,
  payment_id text,
  payment_status text NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'success', 'failed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 9. ORDER_ITEMS TABLE
CREATE TABLE IF NOT EXISTS order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  variant_id uuid NOT NULL REFERENCES product_variants(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  variant_info jsonb,
  quantity integer NOT NULL CHECK (quantity > 0),
  price_at_purchase numeric NOT NULL CHECK (price_at_purchase >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 10. REVIEWS TABLE
CREATE TABLE IF NOT EXISTS reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text,
  image_urls text[] DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_id, user_id, order_id)
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_variants_product ON product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_carts_user ON carts(user_id);
CREATE INDEX IF NOT EXISTS idx_carts_session ON carts(session_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_cart ON cart_items(cart_id);
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_reviews_product ON reviews(product_id);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

-- PROFILES: Users can read/update own profile, admins can read all
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
CREATE POLICY "profiles_select_own" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = id OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- CATEGORIES: Public read, admin write
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "categories_public_read" ON categories;
CREATE POLICY "categories_public_read" ON categories FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "categories_admin_write" ON categories;
CREATE POLICY "categories_admin_write" ON categories FOR ALL
  TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- PRODUCTS: Public read for active products, admin write
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "products_public_read" ON products;
CREATE POLICY "products_public_read" ON products FOR SELECT
  TO anon, authenticated USING (is_active = true OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "products_admin_write" ON products;
CREATE POLICY "products_admin_write" ON products FOR ALL
  TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- PRODUCT_VARIANTS: Public read for active variants, admin write
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "variants_public_read" ON product_variants;
CREATE POLICY "variants_public_read" ON product_variants FOR SELECT
  TO anon, authenticated USING (is_active = true OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "variants_admin_write" ON product_variants;
CREATE POLICY "variants_admin_write" ON product_variants FOR ALL
  TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- CARTS: Users access own carts, guests access by session
ALTER TABLE carts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "carts_select_own" ON carts;
CREATE POLICY "carts_select_own" ON carts FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "carts_select_anon" ON carts;
CREATE POLICY "carts_select_anon" ON carts FOR SELECT
  TO anon USING (session_id IS NOT NULL);

DROP POLICY IF EXISTS "carts_insert_own" ON carts;
CREATE POLICY "carts_insert_own" ON carts FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "carts_insert_anon" ON carts;
CREATE POLICY "carts_insert_anon" ON carts FOR INSERT
  TO anon WITH CHECK (session_id IS NOT NULL AND user_id IS NULL);

DROP POLICY IF EXISTS "carts_update_own" ON carts;
CREATE POLICY "carts_update_own" ON carts FOR UPDATE
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "carts_update_anon" ON carts;
CREATE POLICY "carts_update_anon" ON carts FOR UPDATE
  TO anon USING (session_id IS NOT NULL AND user_id IS NULL);

DROP POLICY IF EXISTS "carts_delete_own" ON carts;
CREATE POLICY "carts_delete_own" ON carts FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "carts_delete_anon" ON carts;
CREATE POLICY "carts_delete_anon" ON carts FOR DELETE
  TO anon USING (session_id IS NOT NULL AND user_id IS NULL);

-- CART_ITEMS: Access through cart ownership
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cart_items_select_own" ON cart_items;
CREATE POLICY "cart_items_select_own" ON cart_items FOR SELECT
  TO authenticated USING (EXISTS (SELECT 1 FROM carts WHERE carts.id = cart_items.cart_id AND carts.user_id = auth.uid()));

DROP POLICY IF EXISTS "cart_items_select_anon" ON cart_items;
CREATE POLICY "cart_items_select_anon" ON cart_items FOR SELECT
  TO anon USING (EXISTS (SELECT 1 FROM carts WHERE carts.id = cart_items.cart_id AND carts.session_id IS NOT NULL AND carts.user_id IS NULL));

DROP POLICY IF EXISTS "cart_items_insert_own" ON cart_items;
CREATE POLICY "cart_items_insert_own" ON cart_items FOR INSERT
  TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM carts WHERE carts.id = cart_items.cart_id AND carts.user_id = auth.uid()));

DROP POLICY IF EXISTS "cart_items_insert_anon" ON cart_items;
CREATE POLICY "cart_items_insert_anon" ON cart_items FOR INSERT
  TO anon WITH CHECK (EXISTS (SELECT 1 FROM carts WHERE carts.id = cart_items.cart_id AND carts.session_id IS NOT NULL AND carts.user_id IS NULL));

DROP POLICY IF EXISTS "cart_items_update_own" ON cart_items;
CREATE POLICY "cart_items_update_own" ON cart_items FOR UPDATE
  TO authenticated USING (EXISTS (SELECT 1 FROM carts WHERE carts.id = cart_items.cart_id AND carts.user_id = auth.uid()));

DROP POLICY IF EXISTS "cart_items_update_anon" ON cart_items;
CREATE POLICY "cart_items_update_anon" ON cart_items FOR UPDATE
  TO anon USING (EXISTS (SELECT 1 FROM carts WHERE carts.id = cart_items.cart_id AND carts.session_id IS NOT NULL AND carts.user_id IS NULL));

DROP POLICY IF EXISTS "cart_items_delete_own" ON cart_items;
CREATE POLICY "cart_items_delete_own" ON cart_items FOR DELETE
  TO authenticated USING (EXISTS (SELECT 1 FROM carts WHERE carts.id = cart_items.cart_id AND carts.user_id = auth.uid()));

DROP POLICY IF EXISTS "cart_items_delete_anon" ON cart_items;
CREATE POLICY "cart_items_delete_anon" ON cart_items FOR DELETE
  TO anon USING (EXISTS (SELECT 1 FROM carts WHERE carts.id = cart_items.cart_id AND carts.session_id IS NOT NULL AND carts.user_id IS NULL));

-- COUPONS: Public read for active coupons, admin write
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "coupons_public_read" ON coupons;
CREATE POLICY "coupons_public_read" ON coupons FOR SELECT
  TO anon, authenticated USING (is_active = true);

DROP POLICY IF EXISTS "coupons_admin_write" ON coupons;
CREATE POLICY "coupons_admin_write" ON coupons FOR ALL
  TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- ORDERS: Users see own orders, admin sees all
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "orders_select_own" ON orders;
CREATE POLICY "orders_select_own" ON orders FOR SELECT
  TO authenticated USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "orders_insert_own" ON orders;
CREATE POLICY "orders_insert_own" ON orders FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "orders_update_admin" ON orders;
CREATE POLICY "orders_update_admin" ON orders FOR UPDATE
  TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- ORDER_ITEMS: Access through order ownership
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "order_items_select_own" ON order_items;
CREATE POLICY "order_items_select_own" ON order_items FOR SELECT
  TO authenticated USING (EXISTS (SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND (orders.user_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))));

DROP POLICY IF EXISTS "order_items_insert_own" ON order_items;
CREATE POLICY "order_items_insert_own" ON order_items FOR INSERT
  TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid()));

-- REVIEWS: Public read, insert only for verified purchases
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reviews_public_read" ON reviews;
CREATE POLICY "reviews_public_read" ON reviews FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "reviews_insert_verified" ON reviews;
CREATE POLICY "reviews_insert_verified" ON reviews FOR INSERT
  TO authenticated WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = reviews.order_id
        AND orders.user_id = auth.uid()
        AND orders.status = 'delivered'
    )
  );

DROP POLICY IF EXISTS "reviews_update_own" ON reviews;
CREATE POLICY "reviews_update_own" ON reviews FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "reviews_delete_own" ON reviews;
CREATE POLICY "reviews_delete_own" ON reviews FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============================================
-- FUNCTIONS AND TRIGGERS
-- ============================================

-- Function to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.email,
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update product rating aggregates
CREATE OR REPLACE FUNCTION public.update_product_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE products
  SET avg_rating = (
    SELECT COALESCE(AVG(rating), 0) FROM reviews WHERE product_id = COALESCE(NEW.product_id,OLD.product_id)
  ),
  review_count = (
    SELECT COUNT(*) FROM reviews WHERE product_id = COALESCE(NEW.product_id, OLD.product_id)
  )
  WHERE id = COALESCE(NEW.product_id, OLD.product_id);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_review_change ON reviews;
CREATE TRIGGER on_review_change
  AFTER INSERT OR UPDATE OR DELETE ON reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_product_rating();

-- Function to decrement stock on paid order
CREATE OR REPLACE FUNCTION public.decrement_stock_on_paid()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'paid' AND OLD.status != 'paid' THEN
    UPDATE product_variants pv
    SET stock_quantity = stock_quantity - oi.quantity
    FROM order_items oi
    WHERE oi.order_id = NEW.id AND oi.variant_id = pv.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_order_paid ON orders;
CREATE TRIGGER on_order_paid
  AFTER UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION public.decrement_stock_on_paid();

-- Function to update cart updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_cart_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE carts SET updated_at = now() WHERE id = COALESCE(NEW.cart_id, OLD.cart_id);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_cart_item_change ON cart_items;
CREATE TRIGGER on_cart_item_change
  AFTER INSERT OR UPDATE OR DELETE ON cart_items
  FOR EACH ROW EXECUTE FUNCTION public.update_cart_timestamp();