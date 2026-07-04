import Link from 'next/link';
import { Separator } from '@/components/ui/separator';

const footerLinks = {
  shop: [
    { label: 'Sarees', href: '/category/sarees' },
    { label: 'Ethnic Sets', href: '/category/ethnic-sets' },
    { label: 'Kurtas', href: '/category/kurtas' },
    { label: 'Accessories', href: '/category/accessories' },
  ],
  support: [
    { label: 'Shipping Info', href: '/shipping' },
    { label: 'Returns', href: '/returns' },
    { label: 'Size Guide', href: '/size-guide' },
    { label: 'FAQ', href: '/faq' },
  ],
  company: [
    { label: 'About Us', href: '/about' },
    { label: 'Contact', href: '/contact' },
    { label: 'Privacy Policy', href: '/privacy' },
    { label: 'Terms of Service', href: '/terms' },
  ],
};

export function Footer() {
  return (
    <footer className="bg-secondary/30 border-t">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <Link href="/" className="inline-block">
              <span className="font-display text-xl font-semibold text-primary">
                Sri Boutique
              </span>
            </Link>
            <p className="text-sm text-muted-foreground max-w-xs">
              Discover exquisite handcrafted sarees and ethnic wear.
              Timeless elegance for the modern woman.
            </p>
          </div>

          {/* Shop */}
          <div>
            <h3 className="font-display text-lg font-medium mb-4">Shop</h3>
            <ul className="space-y-2">
              {footerLinks.shop.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="font-display text-lg font-medium mb-4">Support</h3>
            <ul className="space-y-2">
              {footerLinks.support.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="font-display text-lg font-medium mb-4">Company</h3>
            <ul className="space-y-2">
              {footerLinks.company.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <Separator className="my-8" />

        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Sri Boutique. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">Secure Payments</span>
            <div className="flex items-center gap-2">
              <div className="h-6 px-2 bg-muted rounded text-xs flex items-center">
                Razorpay
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
