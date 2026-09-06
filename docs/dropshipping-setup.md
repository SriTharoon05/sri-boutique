# Dropshipping production setup

The storefront now uses a supplier-neutral data model. SheScale is the first adapter; future suppliers can implement the same normalized product, variant, pricing, and order interfaces in `lib/suppliers` without changing customer-facing pages.

## Before enabling live orders

1. Apply `supabase/migrations/20260906000100_012_supplier_platform.sql` in the Supabase SQL editor or through your normal migration pipeline.
2. Add these server-only environment variables to the deployed website:
   - `SHESCALE_API_KEY=sk_live_…`
   - `DROPSHIP_DISPATCH_SECRET=<long random value>`
   - `CRON_SECRET=<different long random value>`
3. Add `SITE_URL=https://your-domain.com` and the same `DROPSHIP_DISPATCH_SECRET` to the Supabase Edge Function secrets, then redeploy `razorpay-webhook`.
4. Open **Admin → Suppliers**. Save the profit rules, enable the supplier, enable catalogue sync, and test the connection.
5. Run a full sync with **Auto publish** off. Review products, images, costs, stock, and calculated customer prices. Then enable auto publish and run the full sync again.
6. Schedule an authenticated `POST /api/cron/suppliers` request every 15–30 minutes with `Authorization: Bearer <CRON_SECRET>`. It performs delta catalogue sync and reconciles active supplier orders.
7. Place and refund a low-value end-to-end test order before advertising the store.

## Pricing protection

The customer price is rounded up from the higher of:

- the configured target-margin calculation; and
- supplier cost + shipping buffer + return reserve + minimum profit, grossed up for gateway fees and tax reserve.

The protected floor is stored with every product and variant. Coupon validation and the atomic checkout function cap discounts so an order cannot be sold below that floor.

The return reserve spreads expected return/RTO expense across successful sales. No honest system can guarantee profit on each fully refunded order because that order returns its revenue while shipping or return costs can remain payable. Set the reserve using your observed return rate and actual SheScale charges.

## Safety behaviour

- API keys never enter browser code or database rows.
- Supplier availability and cost are checked again before Razorpay opens.
- Supplier order creation uses a deterministic idempotency key, so payment callbacks and retries cannot create duplicate supplier orders.
- A supplier outage never reverses a verified customer payment. The failed dispatch is recorded and can be retried from Admin → Suppliers.
- Storefront mode can show dropship products only, own inventory only, or both without deleting either catalogue.
- The emergency checkout toggle pauses new order creation server-side.

## SheScale API limitation

The public OpenAPI document lists Partner API endpoints but currently publishes empty request and response schemas. The adapter therefore accepts common response envelopes and isolates outbound payloads in `lib/suppliers/shescale.ts` and `lib/suppliers/orders.ts`. Once a live key is available, confirm the returned product and order shapes with **Test connection** and one sandbox/low-value order before production promotion.

