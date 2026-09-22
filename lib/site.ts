import { storefrontSlug } from './storefront-brand';

export const SITE_NAME = 'Sri Boutique';
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://sriboutique.com').replace(/\/$/, '');
export const STORE_ADDRESS = 'Sidco Nagar 9th Street, Villivakkam, Chennai, Tamil Nadu, India';

export function absoluteUrl(path = '/') {
  return new URL(storefrontSlug(path), `${SITE_URL}/`).toString();
}
