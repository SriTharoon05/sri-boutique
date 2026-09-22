import { Metadata } from 'next';
import { MainLayout } from '@/components/layout/main-layout';
import Link from 'next/link';
import { buildPageMetadata } from '@/lib/seo';

export const metadata: Metadata = buildPageMetadata('Shipping Information', 'Sri Boutique shipping charges, delivery timelines, and tracking information for orders across India.', '/shipping');

export default function ShippingPage() {
  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-12 md:py-20 max-w-2xl">
        <h1 className="font-display text-4xl font-semibold mb-8">Shipping Information</h1>

        <div className="space-y-8 text-muted-foreground leading-relaxed">
          <section><h2 className="font-display text-xl text-foreground mb-3">Delivery of your order</h2><p>Your delivery charge is displayed at checkout before payment. Delivery dates are estimates and depend on your address and product availability. If your address cannot be served, we will contact you and refund the unfulfilled order. We will not add undisclosed delivery charges to a confirmed order.</p></section>
          <section>
            <h2 className="font-display text-xl font-medium text-foreground mb-3">
              Delivery Timelines
            </h2>
            <p>
              Orders are typically processed within 1–2 business days. Once
              shipped, delivery usually takes 4–7 business days depending on
              your location within India. Metro cities generally receive
              orders faster than remote areas.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-medium text-foreground mb-3">
              Shipping Charges
            </h2>
            <p>
              We offer <strong>free delivery on online payments</strong>, with no
              minimum order value. Where COD is available, pay ₹100 online in
              advance for shipping and the remaining balance on delivery. The
              shipping advance is included in the displayed total, not charged twice.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-medium text-foreground mb-3">
              Order Tracking
            </h2>
            <p>
              Once your order ships, you&apos;ll receive a tracking link via email
              and it will also be available on your{' '}
              <Link href="/account/orders" className="text-primary hover:underline">
                Orders page
              </Link>
              . You can track your shipment&apos;s progress in real time from
              there.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-medium text-foreground mb-3">
              Serviceable Areas
            </h2>
            <p>
              We currently ship across India. If your pincode is not
              serviceable for any reason, our team will reach out to you
              directly to resolve it.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-medium text-foreground mb-3">
              Questions?
            </h2>
            <p>
              If you have any questions about your shipment, reach out to us
              at{' '}
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
