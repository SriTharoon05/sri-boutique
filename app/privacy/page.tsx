import { Metadata } from 'next';
import { MainLayout } from '@/components/layout/main-layout';
import { buildPageMetadata } from '@/lib/seo';

export const metadata: Metadata = buildPageMetadata('Privacy Policy', 'How Sri Boutique collects, uses, and protects your personal information.', '/privacy');

export default function PrivacyPolicyPage() {
  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-12 md:py-20 max-w-2xl">
        <h1 className="font-display text-4xl font-semibold mb-2">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground mb-10">Last updated: July 2026</p>

        <div className="space-y-8 text-muted-foreground leading-relaxed">
          <section>
            <h2 className="font-display text-xl font-medium text-foreground mb-3">
              1. Information We Collect
            </h2>
            <p>
              When you use Sri Boutique, we collect information you provide
              directly, such as your name, email address, phone number, and
              shipping address when you create an account, place an order, or
              contact us. If you sign in with Google, we receive your name,
              email, and profile picture from your Google account.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-medium text-foreground mb-3">
              2. How We Use Your Information
            </h2>
            <p>We use the information we collect to:</p>
            <ul className="list-disc list-inside space-y-1 mt-2">
              <li>Process and fulfill your orders</li>
              <li>Communicate with you about your orders, including shipping and delivery updates</li>
              <li>Respond to your customer support requests</li>
              <li>Send order confirmation and, if applicable, promotional emails</li>
              <li>Improve our website and services</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-xl font-medium text-foreground mb-3">
              3. Payment Information
            </h2>
            <p>
              All payments are processed securely through Razorpay, our
              payment gateway partner. We do not store your card, UPI, or
              banking details on our servers — this information is handled
              directly and securely by Razorpay in compliance with PCI DSS
              standards.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-medium text-foreground mb-3">
              4. Data Sharing
            </h2>
            <p>
              We do not sell your personal information. We share your
              information only with trusted third parties necessary to
              operate our business, including:
            </p>
            <ul className="list-disc list-inside space-y-1 mt-2">
              <li>Razorpay, for payment processing</li>
              <li>Our shipping/logistics partners, to deliver your order</li>
              <li>Supabase, our database and authentication provider</li>
              <li>Resend, for sending transactional emails</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-xl font-medium text-foreground mb-3">
              5. Data Security
            </h2>
            <p>
              We take reasonable technical and organizational measures to
              protect your personal information, including encrypted data
              storage and secure authentication. However, no method of
              transmission over the internet is 100% secure, and we cannot
              guarantee absolute security.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-medium text-foreground mb-3">
              6. Your Rights
            </h2>
            <p>
              You can access, update, or request deletion of your personal
              information at any time by contacting us at{' '}
              <a
                href="mailto:sriboutiquestore@gmail.com"
                className="text-primary hover:underline"
              >
                sriboutiquestore@gmail.com
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-medium text-foreground mb-3">
              7. Cookies
            </h2>
            <p>
              We use essential cookies to keep you signed in and to remember
              your cart. We do not use third-party advertising cookies.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-medium text-foreground mb-3">
              8. Changes to This Policy
            </h2>
            <p>
              We may update this Privacy Policy from time to time. Changes
              will be posted on this page with an updated revision date.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-medium text-foreground mb-3">
              9. Contact Us
            </h2>
            <p>
              If you have questions about this Privacy Policy, contact us at{' '}
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
