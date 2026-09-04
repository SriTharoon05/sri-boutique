/* The previous scheduled request was unauthenticated and hard-coded to one project. */
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'abandoned-cart-reminder') THEN
    PERFORM cron.unschedule('abandoned-cart-reminder');
  END IF;
END $$;
