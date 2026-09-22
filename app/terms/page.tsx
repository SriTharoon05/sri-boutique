import { Metadata } from 'next';
import { MainLayout } from '@/components/layout/main-layout';
import { buildPageMetadata } from '@/lib/seo';

export const metadata: Metadata = buildPageMetadata('Terms & Conditions', 'Terms and conditions for using the Sri Boutique website and placing orders.', '/terms');

export default function TermsPage() {
  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-12 md:py-20 max-w-2xl">
        <h1 className="font-display text-4xl font-semibold mb-2">
          Terms & Conditions
        </h1>
        <p className="text-sm text-muted-foreground mb-10">Last updated: September 2026</p>

        <div className="space-y-8 text-muted-foreground leading-relaxed">
          <section><h2 className="font-display text-xl text-foreground mb-3">Orders and payments</h2><p>Shop with Sri Boutique for support throughout your order, from checkout to delivery. Online payments are processed securely through Razorpay. Contact us for order support, cancellations and refunds. If we cannot fulfil your order, we will contact you and refund amounts collected for the unfulfilled order.</p><p className="mt-3">Where cash on delivery is available, the displayed advance is paid online and the remaining balance is collected on delivery. Any COD charges are shown before payment. COD is not available on every product or address. We will not change a confirmed amount or substitute products without your agreement.</p><p className="mt-3">Orders are subject to availability and daily ordering capacity. If ordering is unavailable, please check back later. This does not restrict your rights relating to defective, incorrect or undelivered goods.</p></section>
          <section>
            <h2 className="font-display text-xl font-medium text-foreground mb-3">
              1. About Us
            </h2>
            <p>
              Sri Boutique (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) operates the website
              sriboutique.com, offering sarees, lehengas, and ethnic wear for
              sale in India. By accessing or using our website, you agree to
              be bound by these Terms & Conditions.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-medium text-foreground mb-3">
              2. Orders and Acceptance
            </h2>
            <p>
              Placing an order on our website constitutes an offer to
              purchase. All orders are subject to acceptance and availability.
              We reserve the right to refuse or cancel any order at our
              discretion, including in cases of pricing errors, stock
              unavailability, or suspected fraud.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-medium text-foreground mb-3">
              3. Pricing and Payment
            </h2>
            <p>
              All prices are listed in Indian Rupees (INR) and are inclusive
              of applicable taxes unless stated otherwise. Payments are
              processed securely through Razorpay. We reserve the right to
              change prices at any time without prior notice, though changes
              will not affect orders already confirmed.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-medium text-foreground mb-3">
              4. Shipping
            </h2>
            <p>
              We currently ship within India only. Estimated delivery
              timelines are provided on our{' '}
              <a href="/shipping" className="text-primary hover:underline">
                Shipping Info
              </a>{' '}
              page and are not guaranteed, as they may be affected by factors
              outside our control.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-medium text-foreground mb-3">
              5. Returns and Refunds
            </h2>
            <p>
              Our return, exchange, and refund policy is detailed on our{' '}
              <a href="/returns" className="text-primary hover:underline">
                Returns & Exchanges
              </a>{' '}
              page and forms part of these Terms.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-medium text-foreground mb-3">
              6. Product Descriptions
            </h2>
            <p>
              We make every effort to display product colors, fabric, and
              details accurately. However, slight variations may occur due to
              screen display settings or the handmade nature of some
              products, particularly handwoven textiles.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-medium text-foreground mb-3">
              7. Account Responsibility
            </h2>
            <p>
              If you sign in using Google authentication, you are responsible
              for maintaining the confidentiality of your account and for all
              activity that occurs under it.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-medium text-foreground mb-3">
              8. Intellectual Property
            </h2>
            <p>
              All content on this website, including images, text, and
              branding, is the property of Sri Boutique and may not be
              reproduced without permission.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-medium text-foreground mb-3">
              9. Limitation of Liability
            </h2>
            <p>
              Sri Boutique is not liable for any indirect or consequential
              loss arising from the use of our website or products, to the
              maximum extent permitted by law.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-medium text-foreground mb-3">
              10. Governing Law
            </h2>
            <p>
              These Terms are governed by the laws of India, and any disputes
              shall be subject to the jurisdiction of the courts in Chennai,
              Tamil Nadu.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-medium text-foreground mb-3">
              11. Contact Us
            </h2>
            <p>
              For any questions about these Terms, contact us at{' '}
              <a
                href="mailto:sriboutiquestore@gmail.com"
                className="text-primary hover:underline"
              >
                sriboutiquestore@gmail.com
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </MainLayout>
  );
}
