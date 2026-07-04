/*
# Schedule abandoned cart email job

1. Changes
- Create a cron job that runs hourly to call the abandoned-cart edge function
- The job checks for carts older than 24 hours without email sent

2. Notes
- Runs every hour at minute 0
- Calls the abandoned-cart Edge Function via HTTP
- Replace YOUR_PROJECT_REF with your actual Supabase project reference
*/

-- Schedule the abandoned cart job
-- Note: You'll need to update the URL with your actual project reference
SELECT cron.schedule(
  'abandoned-cart-reminder',
  '0 * * * *', -- Every hour at minute 0
  $job$
  SELECT net.http_post(
    url := 'https://txixptuyecqcmptrxgcy.supabase.co/functions/v1/abandoned-cart',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.jwt_secret', true)
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
  $job$
);
