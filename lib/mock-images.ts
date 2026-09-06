/**
 * Temporary, verified Pexels/Unsplash imagery for client demos.
 * The set intentionally contains no real people: only mannequins and textiles.
 * Replace product image URLs through the admin area as real inventory arrives.
 * Hero source: https://www.pexels.com/photo/37806869/
 * Featured mannequin source: https://www.pexels.com/photo/35027434/
 * Textile source: https://unsplash.com/photos/0taSQwyJa00
 */
export const mockImages = {
  hero: 'https://images.pexels.com/photos/37806869/pexels-photo-37806869.jpeg?auto=compress&cs=tinysrgb&w=1600&h=1800&fit=crop',
  heritage: 'https://images.pexels.com/photos/4219611/pexels-photo-4219611.jpeg?auto=compress&cs=tinysrgb&w=2200&h=1100&fit=crop',
  products: [
    'https://images.pexels.com/photos/37806869/pexels-photo-37806869.jpeg?auto=compress&cs=tinysrgb&w=1200&h=1600&fit=crop',
    'https://images.unsplash.com/photo-1707177197994-153e671df346?auto=format&fit=crop&w=1200&h=1600&q=80',
    'https://images.unsplash.com/photo-1770795264256-d14ad7bc120e?auto=format&fit=crop&w=1200&h=1600&q=80',
    'https://images.unsplash.com/photo-1676696663276-d556eea4f577?auto=format&fit=crop&w=1200&h=1600&q=80',
    'https://images.pexels.com/photos/8887279/pexels-photo-8887279.jpeg?auto=compress&cs=tinysrgb&w=1200&h=1600&fit=crop',
    'https://images.unsplash.com/photo-1776969824728-d1023af75226?auto=format&fit=crop&w=1200&h=1600&q=80',
  ],
  categories: {
    'silk-sarees': 'https://images.pexels.com/photos/35027434/pexels-photo-35027434.jpeg?auto=compress&cs=tinysrgb&w=1200&h=1500&fit=crop',
    'cotton-sarees': 'https://images.pexels.com/photos/28762830/pexels-photo-28762830.jpeg?auto=compress&cs=tinysrgb&w=1200&h=1500&fit=crop',
    lehengas: 'https://images.pexels.com/photos/18600914/pexels-photo-18600914.jpeg?auto=compress&cs=tinysrgb&w=1200&h=1500&fit=crop',
    'salwar-suits': 'https://images.pexels.com/photos/21051718/pexels-photo-21051718.jpeg?auto=compress&cs=tinysrgb&w=1200&h=1500&fit=crop',
  } as Record<string, string>,
} as const;

function stableIndex(value: string, length: number) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) - hash + value.charCodeAt(index)) | 0;
  }
  return Math.abs(hash) % length;
}

export function getMockProductImage(key: string, offset = 0) {
  const images = mockImages.products;
  return images[(stableIndex(key || 'saree', images.length) + offset) % images.length];
}

export function getMockProductGallery(key: string) {
  return [0, 1, 2].map((offset) => getMockProductImage(key, offset));
}

export function getMockCategoryImage(slug: string, index = 0) {
  return mockImages.categories[slug] || getMockProductImage(slug, index);
}

/**
 * Mock images now act only as a fallback. Synced supplier and inventory photos
 * take priority as soon as they exist.
 */
export const USE_MOCK_CATALOG_IMAGES = false;

export function getDisplayProductImage(key: string, actual?: string | null, offset = 0) {
  return USE_MOCK_CATALOG_IMAGES ? getMockProductImage(key, offset) : actual || getMockProductImage(key, offset);
}

export function getDisplayProductGallery(key: string, actual: string[] = []) {
  return USE_MOCK_CATALOG_IMAGES
    ? getMockProductGallery(key)
    : actual.length > 0
      ? actual
      : getMockProductGallery(key);
}

export function getDisplayCategoryImage(slug: string, actual?: string | null, index = 0) {
  return USE_MOCK_CATALOG_IMAGES ? getMockCategoryImage(slug, index) : actual || getMockCategoryImage(slug, index);
}
