import { Metadata } from 'next';
import { MainLayout } from '@/components/layout/main-layout';

export const metadata: Metadata = {
  title: 'Shipping Info | Sri Boutique',
  description: 'Shipping timelines, charges, and tracking information for Sri Boutique orders.',
};

export default function ShippingPage() {
  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-12 md:py-20 max-w-2xl">
        <h1 className="font-display text-4xl font-semibold mb-8">Shipping Information</h1>

        <div className="space-y-8 text-muted-foreground leading-relaxed">
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
              We offer <strong>free shipping</strong> on all orders above
              ₹2,000. For orders below this amount, a flat shipping charge of
              ₹99 applies at checkout.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-medium text-foreground mb-3">
              Order Tracking
            </h2>
            <p>
              Once your order ships, you&apos;ll receive a tracking link via email
              and it will also be available on your{' '}
              <a href="/account/orders" className="text-primary hover:underline">
                Orders page
              </a>
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