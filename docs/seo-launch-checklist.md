# SEO launch checklist

The codebase generates canonical metadata, robots rules, a production sitemap,
product/variant merchant structured data, and organisation return-policy data.
The remaining steps require ownership of the live domain or external accounts.

## Before promotion

1. Set `NEXT_PUBLIC_SITE_URL` to the one preferred HTTPS domain. Redirect every
   HTTP and alternate `www`/non-`www` URL to it.
2. Add the Google Search Console HTML-tag token as
   `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION`, redeploy, and verify the property.
3. Submit `https://your-domain.example/sitemap.xml` in Search Console.
4. Test one category and at least two live product URLs with Google's Rich
   Results Test. Confirm that page-visible price, stock, shipping, and returns
   match the structured data.
5. Connect the live catalogue to Google Merchant Center. Use the same product
   IDs, prices, availability, images, shipping, and returns supplied by the site.
6. Check Search Console's Core Web Vitals report after real traffic is available.
   Target LCP at or below 2.5 seconds, INP below 200 milliseconds, and CLS below
   0.1 at the 75th percentile.

## Catalogue rules

- Never publish supplier demo/preview products as live catalogue records.
- Write useful product-specific titles and descriptions; do not copy one generic
  supplier description across multiple products.
- Keep supplier stock, selling price, images, and availability synchronized.
- Add redirects when a live product or category slug changes.
