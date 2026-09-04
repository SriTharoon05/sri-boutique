/*
  Guest cart identity previously relied only on a non-null session_id. Because
  anonymous users cannot prove ownership of that value to Postgres, those RLS
  rules allowed one anonymous client to enumerate or mutate another guest cart.
  Guest carts now live in browser localStorage until login, then merge into the
  authenticated user's RLS-protected cart.
*/
DROP POLICY IF EXISTS "carts_select_anon" ON carts;
DROP POLICY IF EXISTS "carts_insert_anon" ON carts;
DROP POLICY IF EXISTS "carts_update_anon" ON carts;
DROP POLICY IF EXISTS "carts_delete_anon" ON carts;

DROP POLICY IF EXISTS "cart_items_select_anon" ON cart_items;
DROP POLICY IF EXISTS "cart_items_insert_anon" ON cart_items;
DROP POLICY IF EXISTS "cart_items_update_anon" ON cart_items;
DROP POLICY IF EXISTS "cart_items_delete_anon" ON cart_items;
