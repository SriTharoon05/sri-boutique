# Razorpay Standard Checkout

This Next.js App Router application uses the existing Supabase orders table.
No duplicate endpoints or new tables were added. The local `.env` has test-mode
credentials and is ignored by Git. Never put the secret in a `NEXT_PUBLIC_*`
variable. The server returns the publishable key ID with the payment order.

## Existing endpoints

- `POST /api/payments/create-razorpay-order`: signed-in customer sends `{ orderId }`.
  The server checks ownership, availability, daily capacity and the stored amount
  due, then creates a Razorpay order. The browser cannot choose the amount.
  Response includes `order_id`, `id` (compatibility), `amount`, `currency`, `key_id`.
- `POST /api/payments/verify`: sends `orderId`, `razorpay_order_id`,
  `razorpay_payment_id`, `razorpay_signature`. Server verifies HMAC-SHA256 against
  the stored gateway order ID, ownership, captured status, currency and amount
  before marking the order paid. COD uses its advance amount, not the full total.

## Test locally

1. Run `npm run dev` (restart after changing environment values).
2. Sign in at http://localhost:3000, choose an available variant and quantity,
   add it to the bag, then open checkout and enter a delivery address.
3. Click **Pay online** / the payment button. Confirm the Razorpay modal is in
   test mode. Use the test payment methods documented by Razorpay, never real
   card credentials. Enable automatic capture in the Razorpay test dashboard.
4. Verify success lands on your order details and the paid amount is correct.
5. Also test closing the modal, a failed payment and retrying verification after
   a network failure. Dismissal/failure must not mark an order paid.

`node scripts/test-razorpay.cjs` runs local signature and endpoint checks.
Optional `--gateway` also creates an unpaid INR 1 test gateway order, never a
local customer order or actual payment. It refuses live keys.

## Before going live

- Rotate credentials that were shared in chat. Configure live keys only in the
  hosting provider's server-side environment; never commit them.
- Configure automatic capture in the live dashboard. This app confirms only
  captured payments, not merely authorised ones.
- Deploy the updated Supabase `razorpay-webhook` and `send-order-email` functions.
  Set their environment secrets as required. Set `RAZORPAY_WEBHOOK_SECRET` to the
  separate dashboard webhook secret (not the API key secret). Subscribe the
  deployed webhook to `payment.captured`; use matching test/live mode.
- Verify a signed webhook can recover a payment when the browser closes before
  the callback. Webhooks cannot reach localhost without a secure public tunnel.
- Keep COD disabled until the advance-payment/webhook flow has been tested.
- Check the saved product-read token in Admin → Suppliers: checkout deliberately
  stops before payment if live product availability cannot be confirmed.

Reference: https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/integration-steps/

## Files changed for this integration

- `package.json`, `package-lock.json`: official Razorpay SDK.
- `.env` (local, ignored): supplied test credentials; other settings preserved.
- `lib/razorpay.ts`: server-only SDK and signature/amount helpers.
- `lib/razorpay-checkout.ts`: retryable, single-load checkout script loader.
- `app/api/payments/create-razorpay-order/route.ts`: SDK order creation and validation.
- `app/api/payments/verify/route.ts`: strict payload/signature validation.
- `app/checkout/page.tsx`: modal lifecycle, failure/cancellation and verification retries.
- `scripts/test-razorpay.cjs`: signature, endpoint and optional gateway smoke tests.
- `docs/RAZORPAY-TESTING.md`: setup and testing guide.

Verification: production build, TypeScript, targeted ESLint and automated tests
passed. A 100-paise unpaid test-mode gateway order was created successfully.
No payment or local customer order was made. Browser-bundle scan found no API
secret. End-to-end payment and webhook recovery remain manual tests.
