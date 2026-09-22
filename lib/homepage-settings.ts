import { z } from 'zod';
import type { Category } from '@/types/database';
import type { CatalogProduct } from '@/lib/demo-catalog';

const selection = z.object({ productId: z.string().uuid(), image: z.string().url().max(2048) });
export const homepageSchema = z.object({
  covers: z.record(selection).default({}),
  featured: z.array(selection).max(4).refine(items => new Set(items.map(i => i.productId)).size === items.length, 'Choose different featured products').default([]),
});
export type HomepageSettings = z.infer<typeof homepageSchema>;
export const defaultHomepageSettings: HomepageSettings = { covers: {}, featured: [] };
export function productImages(product: CatalogProduct) {
  return Array.from(new Set(product.variants.flatMap(v => v.image_urls || [])));
}
export function applyHomepageSettings(categories: Category[], defaults: CatalogProduct[], catalogue: CatalogProduct[], settings: HomepageSettings) {
  const usable = (choice: { productId: string; image: string }) => catalogue.find(p => p.id === choice.productId && p.is_active && productImages(p).includes(choice.image));
  const featured = settings.featured.flatMap(choice => {
    const product = usable(choice);
    return product ? [{ ...product, variants: product.variants.map((v, i) => i === 0 ? { ...v, image_urls: [choice.image, ...(v.image_urls || [])] } : v) }] : [];
  });
  return {
    categories: categories.map(category => {
      const choice = settings.covers[category.slug];
      return choice && usable(choice) ? { ...category, image_url: choice.image } : category;
    }),
    products: [...featured, ...defaults.filter(p => !featured.some(f => f.id === p.id))].slice(0, 4),
  };
}
