/* Atomic, server-priced checkout and payment-order binding. */
ALTER TABLE orders ADD COLUMN IF NOT EXISTS razorpay_order_id text UNIQUE;
ALTER TABLE order_items ALTER COLUMN variant_id DROP NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_razorpay_order_id ON orders(razorpay_order_id);

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
  v_discount numeric := 0;
  v_shipping numeric := 0;
  v_coupon coupons%ROWTYPE;
  v_order orders%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF p_phone !~ '^[0-9]{10}$' THEN RAISE EXCEPTION 'Invalid phone number'; END IF;
  IF coalesce(trim(p_shipping_address->>'fullName'), '') = ''
    OR coalesce(trim(p_shipping_address->>'addressLine1'), '') = ''
    OR coalesce(trim(p_shipping_address->>'city'), '') = ''
    OR coalesce(trim(p_shipping_address->>'state'), '') = ''
    OR coalesce(p_shipping_address->>'pincode', '') !~ '^[0-9]{6}$'
  THEN
    RAISE EXCEPTION 'Invalid shipping address';
  END IF;

  SELECT id INTO v_cart_id
  FROM carts
  WHERE user_id = v_user_id
  ORDER BY updated_at DESC
  LIMIT 1
  FOR UPDATE;
  IF v_cart_id IS NULL THEN RAISE EXCEPTION 'Cart not found'; END IF;

  IF NOT EXISTS (SELECT 1 FROM cart_items WHERE cart_id = v_cart_id) THEN
    RAISE EXCEPTION 'Cart is empty';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM cart_items ci
    JOIN product_variants pv ON pv.id = ci.variant_id
    JOIN products p ON p.id = pv.product_id
    WHERE ci.cart_id = v_cart_id
      AND (NOT pv.is_active OR NOT p.is_active OR ci.quantity > pv.stock_quantity)
  ) THEN
    RAISE EXCEPTION 'One or more items are unavailable in the requested quantity';
  END IF;

  SELECT coalesce(sum((coalesce(pv.price_override, p.base_price)) * ci.quantity), 0)
    INTO v_subtotal
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
    THEN
      RAISE EXCEPTION 'Coupon is no longer valid';
    END IF;

    IF v_coupon.discount_type = 'percentage' THEN
      v_discount := round(v_subtotal * (v_coupon.discount_value / 100));
    ELSE
      v_discount := v_coupon.discount_value;
    END IF;
    v_discount := least(v_discount, v_subtotal);
  END IF;

  v_shipping := CASE WHEN v_subtotal > 2000 THEN 0 ELSE 99 END;

  INSERT INTO orders (
    user_id, subtotal, shipping_cost, discount_amount, total,
    coupon_id, shipping_address, phone, status, payment_status
  ) VALUES (
    v_user_id, v_subtotal, v_shipping, v_discount,
    v_subtotal - v_discount + v_shipping, p_coupon_id,
    p_shipping_address, p_phone, 'pending', 'pending'
  ) RETURNING * INTO v_order;

  INSERT INTO order_items (
    order_id, variant_id, product_name, variant_info, quantity, price_at_purchase
  )
  SELECT
    v_order.id, pv.id, p.name,
    jsonb_build_object('color', pv.color, 'size', pv.size),
    ci.quantity, coalesce(pv.price_override, p.base_price)
  FROM cart_items ci
  JOIN product_variants pv ON pv.id = ci.variant_id
  JOIN products p ON p.id = pv.product_id
  WHERE ci.cart_id = v_cart_id;

  RETURN v_order;
END;
$$;

REVOKE ALL ON FUNCTION public.create_checkout_order(jsonb, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_checkout_order(jsonb, text, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.decrement_stock_on_paid()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'paid' AND OLD.status != 'paid' THEN
    UPDATE product_variants pv
    SET stock_quantity = stock_quantity - oi.quantity
    FROM order_items oi
    WHERE oi.order_id = NEW.id AND oi.variant_id = pv.id;

    IF NEW.coupon_id IS NOT NULL THEN
      UPDATE coupons SET times_used = times_used + 1 WHERE id = NEW.coupon_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
