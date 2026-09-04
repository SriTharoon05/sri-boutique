import type { Category, Product, ProductVariant } from '@/types/database';

export type CatalogProduct = Product & {
  category: Category | null;
  variants: ProductVariant[];
};

const createdAt = '2026-07-04T00:00:00.000Z';

export const demoCategories: Category[] = [
  {
    id: 'demo-category-silk',
    name: 'Silk Sarees',
    slug: 'silk-sarees',
    description: 'Kanchipuram and Banarasi silks selected for weddings, celebrations, and heirloom wardrobes.',
    parent_id: null,
    image_url: '/images/sarees/kanchipuram-maroon.png',
    created_at: createdAt,
  },
  {
    id: 'demo-category-cotton',
    name: 'Cotton Sarees',
    slug: 'cotton-sarees',
    description: 'Breathable handloom cotton sarees for effortless everyday elegance.',
    parent_id: null,
    image_url: '/images/sarees/handloom-mustard.png',
    created_at: createdAt,
  },
  {
    id: 'demo-category-designer',
    name: 'Designer Sarees',
    slug: 'designer-sarees',
    description: 'Statement drapes that pair traditional weaving with a modern point of view.',
    parent_id: null,
    image_url: '/images/sarees/banarasi-peacock.png',
    created_at: createdAt,
  },
];

const makeProduct = (
  id: string,
  name: string,
  slug: string,
  description: string,
  price: number,
  category: Category,
  color: string,
  image: string,
): CatalogProduct => ({
  id,
  name,
  slug,
  description,
  base_price: price,
  category_id: category.id,
  is_active: true,
  avg_rating: 0,
  review_count: 0,
  created_at: createdAt,
  category,
  variants: [{
    id: `${id}-variant`,
    product_id: id,
    sku: `${id.toUpperCase()}-001`,
    color,
    size: 'Free Size',
    stock_quantity: 0,
    image_urls: [image],
    is_active: true,
    created_at: createdAt,
    price_override: null,
  }],
});

export const demoProducts: CatalogProduct[] = [
  makeProduct(
    'demo-kanchipuram-maroon',
    'Maroon Kanchipuram Silk Saree',
    'maroon-kanchipuram-silk-saree',
    'A deep maroon Kanchipuram silk saree finished with an antique-gold zari border and traditional woven motifs.',
    18999,
    demoCategories[0],
    'Maroon',
    '/images/sarees/kanchipuram-maroon.png',
  ),
  makeProduct(
    'demo-banarasi-peacock',
    'Peacock Blue Banarasi Silk Saree',
    'peacock-blue-banarasi-silk-saree',
    'A rich peacock-blue Banarasi silk saree with luminous gold floral brocade and an ornate woven pallu.',
    15999,
    demoCategories[0],
    'Peacock Blue',
    '/images/sarees/banarasi-peacock.png',
  ),
  makeProduct(
    'demo-handloom-mustard',
    'Mustard Handloom Cotton Saree',
    'mustard-handloom-cotton-saree',
    'A breathable mustard handloom cotton saree with a vivid magenta woven border and striped pallu.',
    3999,
    demoCategories[1],
    'Mustard',
    '/images/sarees/handloom-mustard.png',
  ),
];

export function findDemoProduct(slug: string) {
  return demoProducts.find((product) => product.slug === slug) || null;
}

export function findDemoCategory(slug: string) {
  return demoCategories.find((category) => category.slug === slug) || null;
}
