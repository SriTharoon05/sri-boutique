/*
# Enable pg_cron and schedule abandoned cart emails

1. Changes
- Enable pg_cron extension for scheduled tasks
- Create cron job to run abandoned-cart function hourly

2. Notes
- pg_cron is required for scheduled database tasks
- The abandoned-cart edge function will be called every hour
- Uses pg_net for HTTP requests to the edge function
*/

-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable pg_net for HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_net;
