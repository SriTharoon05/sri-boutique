import { Metadata } from 'next';
import Link from 'next/link';
import { MainLayout } from '@/components/layout/main-layout';
import { Card } from '@/components/ui/card';
import { Truck, RefreshCw, Ruler, HelpCircle, ArrowRight } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Support | Sri Boutique',
  description: 'Get help with shipping, returns, sizing, and frequently asked questions at Sri Boutique.',
};

const supportLinks = [
  {
    href: '/shipping',
    label: 'Shipping Info',
    description: 'Delivery timelines, charges, and tracking',
    icon: Truck,
  },
  {
    href: '/returns',
    label: 'Returns',
    description: 'How to return or exchange an item',
    icon: RefreshCw,
  },
  {
    href: '/size-guide',
    label: 'Size Guide',
    description: 'Find your perfect fit',
    icon: Ruler,
  },
  {
    href: '/faq',
    label: 'FAQ',
    description: 'Answers to common questions',
    icon: HelpCircle,
  },
];

export default function SupportPage() {
  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-12 md:py-20 max-w-3xl">
        <div className="text-center mb-12">
          <h1 className="font-display text-4xl font-semibold mb-4">Support</h1>
          <p className="text-muted-foreground">
            Find answers to common questions, or reach out directly if you need more help.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-6">
          {supportLinks.map((link) => (
            <Link key={link.href} href={link.href}>
              <Card className="p-6 hover:shadow-md transition-shadow cursor-pointer group h-full">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-full bg-primary/10 flex-shrink-0">
                    <link.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium group-hover:text-primary transition-colors flex items-center gap-1">
                      {link.label}
                      <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {link.description}
                    </p>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>

        <div className="text-center mt-12 pt-8 border-t">
          <p className="text-sm text-muted-foreground">
            Still need help?{' '}
            <Link href="/contact" className="text-primary hover:underline">
              Contact us directly
            </Link>
          </p>
        </div>
      </div>
    </MainLayout>
  );
}