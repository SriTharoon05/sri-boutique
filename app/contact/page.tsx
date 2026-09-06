import { Metadata } from 'next';
import { MainLayout } from '@/components/layout/main-layout';
import { STORE_ADDRESS } from '@/lib/site';
import { Card } from '@/components/ui/card';
import { Mail, MapPin, Instagram, Clock } from 'lucide-react';
import { buildPageMetadata } from '@/lib/seo';

export const metadata: Metadata = buildPageMetadata('Contact Us', 'Get in touch with Sri Boutique for order support or visit us in Villivakkam, Chennai, Tamil Nadu.', '/contact');

export default function ContactPage() {
  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-12 md:py-20 max-w-3xl">
        <div className="text-center mb-12">
          <h1 className="font-display text-4xl font-semibold mb-4">Contact Us</h1>
          <p className="text-muted-foreground">
            We&apos;d love to hear from you — reach out anytime.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-6">
          <Card className="p-6 flex items-start gap-4">
            <div className="p-3 rounded-full bg-primary/10">
              <Mail className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-medium mb-1">Email</h3>
              <a
                href="mailto:sriboutiquestore@gmail.com"
                className="text-sm text-muted-foreground hover:text-primary"
              >
                sriboutiquestore@gmail.com
              </a>
            </div>
          </Card>

          <Card className="p-6 flex items-start gap-4">
            <div className="p-3 rounded-full bg-primary/10">
              <Instagram className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-medium mb-1">Instagram</h3>
              <a
                href="https://instagram.com/sriboutiquestore"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-muted-foreground hover:text-primary"
              >
                @sriboutiquestore
              </a>
            </div>
          </Card>

          <Card className="p-6 flex items-start gap-4">
            <div className="p-3 rounded-full bg-primary/10">
              <MapPin className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-medium mb-1">Location</h3>
              <p className="text-sm text-muted-foreground">
                {STORE_ADDRESS}
              </p>
            </div>
          </Card>

          <Card className="p-6 flex items-start gap-4">
            <div className="p-3 rounded-full bg-primary/10">
              <Clock className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-medium mb-1">Response Time</h3>
              <p className="text-sm text-muted-foreground">
                We usually reply within 24 hours
              </p>
            </div>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
