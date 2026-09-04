/* Repair legacy duplicates, then enforce one item per variant and one cart per user. */
WITH grouped AS (
  SELECT min(id::text)::uuid AS keep_id, cart_id, variant_id, sum(quantity)::integer AS total_quantity
  FROM cart_items
  GROUP BY cart_id, variant_id
)
UPDATE cart_items ci
SET quantity = grouped.total_quantity
FROM grouped
WHERE ci.id = grouped.keep_id;

WITH ranked AS (
  SELECT id, row_number() OVER (PARTITION BY cart_id, variant_id ORDER BY created_at, id) AS row_number
  FROM cart_items
)
DELETE FROM cart_items ci USING ranked
WHERE ci.id = ranked.id AND ranked.row_number > 1;

CREATE UNIQUE INDEX IF NOT EXISTS idx_cart_items_cart_variant ON cart_items(cart_id, variant_id);

WITH ranked_carts AS (
  SELECT id, user_id, first_value(id) OVER (PARTITION BY user_id ORDER BY updated_at DESC, id) AS keep_id,
    row_number() OVER (PARTITION BY user_id ORDER BY updated_at DESC, id) AS row_number
  FROM carts
  WHERE user_id IS NOT NULL
), merged AS (
  INSERT INTO cart_items (cart_id, variant_id, quantity)
  SELECT rc.keep_id, ci.variant_id, sum(ci.quantity)::integer
  FROM ranked_carts rc
  JOIN cart_items ci ON ci.cart_id = rc.id
  WHERE rc.row_number > 1
  GROUP BY rc.keep_id, ci.variant_id
  ON CONFLICT (cart_id, variant_id)
  DO UPDATE SET quantity = cart_items.quantity + excluded.quantity
)
DELETE FROM carts c
USING ranked_carts rc
WHERE c.id = rc.id AND rc.row_number > 1;

CREATE UNIQUE INDEX IF NOT EXISTS idx_carts_one_per_user ON carts(user_id) WHERE user_id IS NOT NULL;
