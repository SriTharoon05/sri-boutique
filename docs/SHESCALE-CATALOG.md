# SheScale catalogue

- Browser polling uses `/api/catalog?page=1&limit=15`. The backend imports every public supplier page into local products, categories and variants. Customer responses omit upstream purchase costs and account data.
- Public imports send no authorization or cookies. Authenticated detail checks use `/api/catalog/<local-product-slug>` and `SHESCALE_ACCESS_TOKEN` in the server environment. Replace expiring tokens; never expose them through `NEXT_PUBLIC_`. Rotate credentials pasted into chat. No refresh cookie is stored or replayed.
- Admin → Suppliers → Profit rules: minimum markup defaults to 25%, adjustable upward. ₹1,000 becomes at least ₹1,250, potentially higher for existing shipping/return/fee reserves and rounding. Coupons cannot reduce below this floor. This is markup, not a guaranteed net profit on returns.
- Enable Supplier, Catalogue sync, Auto publish, then Full sync. Existing supplier tables (migration 012) are required; these changes require no additional schema migration.
- Visible catalogue pages poll every 15 seconds by default; admin can increase this. A shared database lease prevents overlapping imports. An import can take longer than the interval; this is not a promise of 15-second stock freshness. Failed imports serve the last catalogue and report failure in admin. Checkout separately validates upstream stock and price before payment.
- Unlimited supplier variants use a conservative local purchase cap of 99, reduced by `maxOrderUnits` when supplied. This is not a physical stock count.
- Hosting must support the 300-second import route duration. For updates without visitors, configure an external scheduler to POST `/api/cron/suppliers` with server-side `Authorization: Bearer <CRON_SECRET>`; the scheduler is not installed by this change. Check supplier rate limits before increasing frequency.
- Product-detail credentials do not establish order submission access. `SHESCALE_API_KEY` is still used separately for partner order APIs. Verify supplier order submission, payments and returns before accepting live purchases.

Verification: `node scripts/test-supplier.cjs`, `npm run typecheck`.

## Temporary daily order cap

Migration 013 installs a database trigger that reserves one of ten daily slots
when a checkout first inserts a vendor order item. Multiple vendor items in that
order consume one slot; own-stock-only orders consume none. The insert and slot
reservation are atomic, with a transaction-level advisory lock to prevent races.
Existing vendor orders are backfilled. Deleting or cancelling an order does not
restore its slot, and abandoned checkouts also keep their slot until midnight IST.
This conservative policy prevents reuse while a payment might still arrive.

The public `/api/vendor-quota` endpoint returns only remaining slots and reset time.
The UI polls every 15 seconds; backend enforcement is immediate. A quota outage
fails closed for vendor checkout. Supplier sync never changes the quota, and no
supplier stock quantities are overwritten to enforce this store-level limit.
At midnight IST a new date bucket opens automatically, without a cron job.
An unpaid order from an earlier day must start a new checkout to initialise payment.

This is a local checkout reservation limit, not SheScale's live allowance. It does
not count purchases made outside this store or enforce their weekly limit. Already
initialised gateway payments can settle later; confirm supplier counting/reset
rules and implement supplier reconciliation before relying on this as an exact
match for their fulfilment quota.

Database test: `supabase db query --linked --file scripts/test-vendor-quota.sql`.
It checks the cap, multiple items per order and own-stock exemption, then rolls
back every test reservation. Never run a database reset to apply this migration.
