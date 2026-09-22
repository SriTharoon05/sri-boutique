# Manual fulfilment release check — 22 September 2026

## Implemented

- SheScale automatic dispatch and reconciliation disabled in the server adapter.
- Merchant collects prepaid or configured COD advance through their Razorpay.
- COD eligibility checked against supplier `codAvailable`, owner enable switch,
  and single-line cart restriction in both UI and transactional order creation.
- Defaults: COD advance ₹100; COD extra ₹100; COD switch OFF pending live testing.
- Customer total = retail subtotal − discount + store shipping + COD extra.
  For COD, courier balance = customer total − online advance. Admin sees both.
- Store shipping remains ₹99 at/below ₹2,000 subtotal, free above ₹2,000.
  This is NOT a destination-specific supplier courier quotation. Owner absorbs
  the actual supplier delivery cost and verifies the courier balance manually.
- Customer name, Indian mobile, optional email, address, landmark, city, state,
  pincode, and selected variant/quantity stored with the order.
- Admin can record the manually placed supplier order reference after payment.
- Encrypted Vault token replacement and authenticated product-access test.
- Payment amount/currency/capture checked; duplicate callbacks no longer regress
  shipped orders to paid. Customer direct order inserts are revoked.
- Terms, privacy, shipping and returns describe the reseller workflow.

## Verified

- Production compilation, typechecking and static page generation passed.
- TypeScript and targeted lint checks passed during implementation.
- Supplier normalization/pricing tests passed.
- Rolled-back database tests verified COD amount split, prepaid full amount,
  quantity preservation, disabled-COD rejection and daily capacity enforcement.
- Anonymous/customer Vault-read privilege checks returned false.
- Authenticated direct-order INSERT privilege check returned false.
- HTTP checks: homepage/cart/policies/quota 200; signed-out checkout redirects;
  protected admin and payment-options APIs return 401.
- Browser: product colour Black, size M, quantity 2 reached cart correctly.
  Mobile cart and homepage checked; sign-in required at checkout.

## Outstanding — do not call this a completed live-payment certification

1. Sign in as the owner to verify admin settings, secure token replacement,
   manual-reference entry and authenticated checkout in the browser.
2. Use Razorpay test credentials/environment for end-to-end capture, retries,
   failed payment, signed webhook, cancellation and refund tests. No real payment
   or supplier order was placed during this check.
3. Deploy the changed `razorpay-webhook` and `send-order-email` Edge Functions
   alongside the web app BEFORE enabling COD; old webhook amount checks expect
   the full order total and do not understand a partial advance.
   Configure `RAZORPAY_WEBHOOK_SECRET` to match the secret set on the Razorpay
   webhook (separate from the API key secret). Signature checks now require it.
4. Check live supplier serviceability/charges, advance rules and exact courier
   balance before enabling COD in Admin → Suppliers. Supplier quotas also apply
   to orders placed elsewhere and weekly limits remain external.
5. Have the owner/legal adviser review return promises, grievance-contact/legal
   entity details and applicable consumer-law disclosures before publication.
   Policy text is not a guarantee of legal compliance or no future disputes.

SQL migrations 014–016 were applied to the linked project. Web app and Edge
Function changes have NOT been deployed. Test SQL rolled back its fixtures.

## Storefront branding and social preview check

- Customer-facing checkout, availability labels and policy introductions use Sri
  Boutique branding. Generic fulfilment-partner data sharing remains disclosed;
  no manufacturer/original-supplier claim has been added.
- Public catalogue links use `-sb` aliases. Existing `-shescale` URLs permanently
  redirect while keeping query parameters such as `utm_source=instagram`.
  Database identifiers and private integration settings are unchanged.
- Default Open Graph/Twitter metadata now includes the 1200×630 `/social-card`
  image. Product pages retain their own product images and canonical URLs.
- `node scripts/test-storefront-brand.cjs` verifies public copy, metadata,
  image response, sitemap aliases, legacy redirects and product structured data.
- Signed-in checkout wording and the payment section were inspected at 390px
  mobile width. No payment or order was submitted.
- Before advertising, deploy the web changes, confirm `NEXT_PUBLIC_SITE_URL`
  matches the live canonical domain, submit its sitemap in Search Console and
  inspect live product URLs/social previews. Local checks cannot guarantee search
  rankings or that platforms have refreshed previously cached previews.
