import './globals.css';
import type { Metadata } from 'next';
import localFont from 'next/font/local';
import { Providers } from './providers';

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
  title: {
    default: 'Sri Boutique | Premium Ethnic Wear & Sarees',
    template: '%s | Sri Boutique',
  },
  description: 'Discover exquisite handcrafted sarees, ethnic wear, and timeless elegance at Sri Boutique. Premium quality Indian fashion for the modern woman.',
  keywords: ['sarees', 'ethnic wear', 'Indian fashion', 'boutique', 'handloom', 'silk sarees', 'designer wear'],
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    url: 'https://sriboutique.com',
    siteName: 'Sri Boutique',
    title: 'Sri Boutique | Premium Ethnic Wear & Sarees',
    description: 'Discover exquisite handcrafted sarees, ethnic wear, and timeless elegance at Sri Boutique.',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Sri Boutique - Premium Ethnic Wear',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Sri Boutique | Premium Ethnic Wear & Sarees',
    description: 'Discover exquisite handcrafted sarees, ethnic wear, and timeless elegance at Sri Boutique.',
    images: ['/og-image.jpg'],
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
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${cormorant.variable}`}>
      <body className="font-body min-h-screen bg-background antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}