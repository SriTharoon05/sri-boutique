import type { Category, Product, ProductVariant } from '@/types/database';
import { mockImages } from '@/lib/mock-images';

export type CatalogProduct = Product & {
  category: Category | null;
  variants: ProductVariant[];
};

const createdAt = '2026-07-04T00:00:00.000Z';
const demoCategorySource = { supplier_id: null, supplier_category_id: null, synced_at: null };

export const demoCategories: Category[] = [
  {
    id: 'demo-category-silk',
    name: 'New Arrivals',
    slug: 'new-arrivals-preview',
    description: 'A temporary preview collection shown until the live supplier catalogue is connected.',
    parent_id: null,
    image_url: mockImages.categories['silk-sarees'],
    ...demoCategorySource,
    created_at: createdAt,
  },
  {
    id: 'demo-category-cotton',
    name: 'Everyday Styles',
    slug: 'everyday-styles-preview',
    description: 'Easy everyday fashion shown as a preview before supplier synchronisation.',
    parent_id: null,
    image_url: mockImages.categories['cotton-sarees'],
    ...demoCategorySource,
    created_at: createdAt,
  },
  {
    id: 'demo-category-designer',
    name: 'Trending Now',
    slug: 'trending-now-preview',
    description: 'A temporary showcase that will be replaced by current supplier products.',
    parent_id: null,
    image_url: mockImages.products[5],
    ...demoCategorySource,
    created_at: createdAt,
  },
  {
    id: 'demo-category-lehenga',
    name: 'Festive Edit',
    slug: 'festive-edit-preview',
    description: 'Celebration-ready preview pieces until the supplier catalogue goes live.',
    parent_id: null,
    image_url: mockImages.categories.lehengas,
    ...demoCategorySource,
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
  source_type: 'inventory',
  supplier_id: null,
  supplier_product_id: null,
  source_cost: null,
  price_floor: 0,
  compare_at_price: null,
  supplier_payload: {},
  synced_at: null,
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
    supplier_variant_id: null,
    source_cost: null,
    price_floor: 0,
    synced_at: null,
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
    mockImages.products[0],
  ),
  makeProduct(
    'demo-banarasi-peacock',
    'Peacock Blue Banarasi Silk Saree',
    'peacock-blue-banarasi-silk-saree',
    'A rich peacock-blue Banarasi silk saree with luminous gold floral brocade and an ornate woven pallu.',
    15999,
    demoCategories[0],
    'Peacock Blue',
    mockImages.products[1],
  ),
  makeProduct(
    'demo-handloom-mustard',
    'Mustard Handloom Cotton Saree',
    'mustard-handloom-cotton-saree',
    'A breathable mustard handloom cotton saree with a vivid magenta woven border and striped pallu.',
    3999,
    demoCategories[1],
    'Mustard',
    mockImages.products[2],
  ),
  makeProduct(
    'demo-royal-blue-silk',
    'Royal Blue Mysore Silk Saree',
    'royal-blue-mysore-silk-saree',
    'A fluid royal-blue silk saree with a refined gold border, styled for receptions and evening celebrations.',
    8999,
    demoCategories[0],
    'Royal Blue',
    mockImages.products[3],
  ),
  makeProduct(
    'demo-red-bridal-silk',
    'Bridal Red Zari Silk Saree',
    'bridal-red-zari-silk-saree',
    'A statement bridal-red silk saree with traditional zari detailing and a richly finished pallu.',
    21999,
    demoCategories[0],
    'Bridal Red',
    mockImages.products[4],
  ),
  makeProduct(
    'demo-pastel-designer',
    'Pastel Rose Designer Saree',
    'pastel-rose-designer-saree',
    'A contemporary pastel-rose drape with delicate detailing for daytime celebrations and modern occasions.',
    7499,
    demoCategories[2],
    'Pastel Rose',
    mockImages.products[5],
  ),
];

export function findDemoProduct(slug: string) {
  return demoProducts.find((product) => product.slug === slug) || null;
}

export function findDemoCategory(slug: string) {
  return demoCategories.find((category) => category.slug === slug) || null;
}
