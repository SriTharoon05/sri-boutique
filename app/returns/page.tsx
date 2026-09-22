import { Metadata } from 'next';
import { MainLayout } from '@/components/layout/main-layout';
import { buildPageMetadata } from '@/lib/seo';

export const metadata: Metadata = buildPageMetadata('Returns & Exchanges', 'Read Sri Boutique’s 7-day return and exchange policy, eligibility requirements, and refund timelines.', '/returns');

export default function ReturnsPage() {
  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-12 md:py-20 max-w-2xl">
        <h1 className="font-display text-4xl font-semibold mb-8">
          Returns & Exchanges
        </h1>

        <div className="space-y-8 text-muted-foreground leading-relaxed">
          <section><h2 className="font-display text-xl text-foreground mb-3">Returns and COD advances</h2><p>Contact Sri Boutique for returns, cancellations and refunds. Please wait for our return instructions and the correct return address before sending an item back. If we cannot fulfil your order, amounts collected for the unfulfilled order, including any COD advance, will be refunded. We do not apply a blanket non-refundable-advance rule to defective, incorrect or undelivered goods. Any lawful deduction for a customer-requested cancellation or refused delivery must be disclosed and explained. Your statutory consumer rights remain unaffected.</p></section>
          <section>
            <h2 className="font-display text-xl font-medium text-foreground mb-3">
              Return Window
            </h2>
            <p>
              We accept returns within <strong>7 days</strong> of delivery.
              To be eligible, the item must be unused, unwashed, and in its
              original condition with all tags attached.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-medium text-foreground mb-3">
              How to Initiate a Return
            </h2>
            <p>
              Email us at{' '}
              <a
                href="mailto:sriboutiquestore@gmail.com"
                className="text-primary hover:underline"
              >
                sriboutiquestore@gmail.com
              </a>{' '}
              with your order number and reason for return. Our team will
              guide you through the pickup or shipping process.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-medium text-foreground mb-3">
              Exchanges
            </h2>
            <p>
              Need a different size or color? We&apos;re happy to exchange your
              item, subject to availability. Exchanges follow the same 7-day
              window and condition requirements as returns.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-medium text-foreground mb-3">
              Refund Processing
            </h2>
            <p>
              Once we receive and inspect your returned item, refunds are
              processed within <strong>5–7 business days</strong> to your
              original payment method. You&apos;ll receive an email confirmation
              once the refund is initiated.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-medium text-foreground mb-3">
              Non-Returnable Items
            </h2>
            <p>
              For hygiene reasons, certain items such as blouses that have
              been altered or stitched to custom measurements cannot be
              returned unless defective or damaged on arrival.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-medium text-foreground mb-3">
              Damaged or Incorrect Items
            </h2>
            <p>
              If you receive a damaged, defective, or incorrect item, please
              contact us within 48 hours of delivery with photos of the
              product, and we&apos;ll arrange a free replacement or full refund.
            </p>
          </section>
        </div>
      </div>
    </MainLayout>
  );
}
