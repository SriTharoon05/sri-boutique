import type { Metadata } from 'next';
import type { CatalogProduct } from '@/lib/demo-catalog';
import { absoluteUrl, SITE_NAME } from '@/lib/site';
import { PAYMENT_TEST_PRODUCT_ID } from '@/lib/payment-test-product';

export function buildPageMetadata(title: string, description: string, path: string): Metadata {
  const url = absoluteUrl(path);
  const socialTitle = `${title} | ${SITE_NAME}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: 'website',
      locale: 'en_IN',
      siteName: SITE_NAME,
      title: socialTitle,
      description,
      url,
      images: [{ url: absoluteUrl('/social-card'), width: 1200, height: 630, alt: 'Sri Boutique — style, your way.' }],
    },
    twitter: {
      card: 'summary_large_image',
      images: [absoluteUrl('/social-card')],
      title: socialTitle,
      description,
    },
  };
}

function plainText(value: string | null | undefined) {
  return String(value || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

export function productSeoDescription(product: CatalogProduct) {
  const variant = product.variants?.[0];
  const category = product.category?.name || 'Indian fashion';
  const detail = [variant?.color, category].filter(Boolean).join(' ');
  const intro = `Shop ${product.name}${detail ? `, a ${detail} style` : ''}, at Sri Boutique.`;
  const source = plainText(product.description);
  const description = source ? `${intro} ${source}` : `${intro} Secure checkout and Pan-India delivery.`;
  return description.length <= 160 ? description : `${description.slice(0, 157).trimEnd()}…`;
}

export function isDemoRecord(record: { id?: string; slug?: string }) {
  return record.id === PAYMENT_TEST_PRODUCT_ID || record.id?.startsWith('demo-') === true || record.slug?.endsWith('-preview') === true;
}

export const merchantReturnPolicy = {
  '@type': 'MerchantReturnPolicy',
  '@id': absoluteUrl('/#return-policy'),
  applicableCountry: 'IN',
  returnPolicyCountry: 'IN',
  returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
  merchantReturnDays: 7,
  returnMethod: 'https://schema.org/ReturnByMail',
  merchantReturnLink: absoluteUrl('/returns'),
};

export const shippingDetails = {
  '@type': 'OfferShippingDetails',
  shippingRate: {
    '@type': 'MonetaryAmount',
    value: 99,
    currency: 'INR',
  },
  shippingDestination: {
    '@type': 'DefinedRegion',
    addressCountry: 'IN',
  },
  deliveryTime: {
    '@type': 'ShippingDeliveryTime',
    handlingTime: {
      '@type': 'QuantitativeValue',
      minValue: 1,
      maxValue: 2,
      unitCode: 'DAY',
    },
    transitTime: {
      '@type': 'QuantitativeValue',
      minValue: 4,
      maxValue: 7,
      unitCode: 'DAY',
    },
  },
};
