/*
# Add abandoned cart email tracking

1. Changes
- Add `abandoned_email_sent_at` column to carts table to track when abandoned cart emails were sent
- This allows the abandoned-cart edge function to only send one email per abandoned cart

2. Notes
- This is a nullable timestamp column
- NULL means no email has been sent yet
- Once set, the cart won't receive another abandoned cart email
*/

ALTER TABLE carts ADD COLUMN IF NOT EXISTS abandoned_email_sent_at timestamptz;
