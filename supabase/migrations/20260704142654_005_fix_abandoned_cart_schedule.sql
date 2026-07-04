/*
# Fix abandoned cart cron schedule

1. Changes
- Remove previous cron job that won't work
- Create a simpler cron job using cron.schedule with a direct function call approach

2. Notes
- The edge function will need to be called via a database function or pg_net
- For now, we'll create a simpler approach using a database function wrapper
*/

-- Remove the broken job if it exists
SELECT cron.unschedule('abandoned-cart-reminder');

-- Create the job using pg_net with anonymous access
-- Edge functions with verify_jwt=false can be called without auth
SELECT cron.schedule(
  'abandoned-cart-reminder',
  '0 * * * *',
  $job$
  SELECT net.http_post(
    url := 'https://txixptuyecqcmptrxgcy.supabase.co/functions/v1/abandoned-cart',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  );
  $job$
);

-- Note: Replace YOUR_PROJECT_REF in the URL above with your actual Supabase project reference
-- Example: if your project is at https://abcdefghijklmnop.supabase.co, use 'abcdefghijklmnop'
