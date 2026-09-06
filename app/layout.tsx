import './globals.css';
import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import { Providers } from './providers';
import { SITE_NAME, SITE_URL } from '@/lib/site';
import { merchantReturnPolicy } from '@/lib/seo';

const inter = localFont({
  src: [
    { path: '../public/fonts/inter-v20-latin-300.woff2', weight: '300', style: 'normal' },
    { path: '../public/fonts/inter-v20-latin-regular.woff2', weight: '400', style: 'normal' },
    { path: '../public/fonts/inter-v20-latin-500.woff2', weight: '500', style: 'normal' },
    { path: '../public/fonts/inter-v20-latin-600.woff2', weight: '600', style: 'normal' },
    { path: '../public/fonts/inter-v20-latin-700.woff2', weight: '700', style: 'normal' },
  ],
  variable: '--font-inter',
  display: 'swap',
});

const cormorant = localFont({
  src: [
    { path: '../public/fonts/cormorant-garamond-v21-latin-300.woff2', weight: '300', style: 'normal' },
    { path: '../public/fonts/cormorant-garamond-v21-latin-regular.woff2', weight: '400', style: 'normal' },
    { path: '../public/fonts/cormorant-garamond-v21-latin-500.woff2', weight: '500', style: 'normal' },
    { path: '../public/fonts/cormorant-garamond-v21-latin-600.woff2', weight: '600', style: 'normal' },
    { path: '../public/fonts/cormorant-garamond-v21-latin-700.woff2', weight: '700', style: 'normal' },
  ],
  variable: '--font-cormorant',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: SITE_NAME,
  title: {
    default: 'Sri Boutique | Sarees & Indian Fashion, Remixed',
    template: '%s | Sri Boutique',
  },
  description: 'Shop statement sarees and fresh Indian fashion edits from Sri Boutique in Chennai. Secure checkout, transparent pricing, and Pan-India delivery.',
  category: 'shopping',
  creator: SITE_NAME,
  publisher: SITE_NAME,
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    url: SITE_URL,
    siteName: 'Sri Boutique',
    title: 'Sri Boutique | Sarees & Indian Fashion, Remixed',
    description: 'Statement sarees and fresh Indian fashion edits, curated in Chennai and delivered across India.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Sri Boutique | Sarees & Indian Fashion, Remixed',
    description: 'Statement sarees and fresh Indian fashion edits, curated in Chennai and delivered across India.',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
    ? { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION }
    : undefined,
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#49253b',
};

const localBusinessSchema = {
  '@context': 'https://schema.org',
  '@type': ['OnlineStore', 'ClothingStore'],
  '@id': `${SITE_URL}/#store`,
  name: SITE_NAME,
  url: SITE_URL,
  email: 'sriboutiquestore@gmail.com',
  priceRange: '₹₹',
  address: {
    '@type': 'PostalAddress',
    streetAddress: 'Sidco Nagar 9th Street, Villivakkam',
    addressLocality: 'Chennai',
    addressRegion: 'Tamil Nadu',
    addressCountry: 'IN',
  },
  contactPoint: {
    '@type': 'ContactPoint',
    contactType: 'customer service',
    email: 'sriboutiquestore@gmail.com',
    areaServed: 'IN',
    availableLanguage: ['English', 'Tamil'],
  },
  hasMerchantReturnPolicy: merchantReturnPolicy,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en-IN" className={`${inter.variable} ${cormorant.variable}`}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessSchema) }}
        />
      </head>
      <body className="font-body min-h-screen bg-background antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
