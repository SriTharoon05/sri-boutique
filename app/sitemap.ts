import { MetadataRoute } from 'next';
import { createPublicClient } from '@/lib/supabase/public';
import { SITE_URL } from '@/lib/site';
import { demoCategories, demoProducts } from '@/lib/demo-catalog';

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = SITE_URL;
  const includeDemoCatalogue = process.env.NODE_ENV !== 'production';

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${baseUrl}/about`,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/contact`,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/shipping`,
      changeFrequency: 'monthly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/returns`,
      changeFrequency: 'monthly',
      priority: 0.3,
    },
    { url: `${baseUrl}/faq`, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${baseUrl}/size-guide`, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${baseUrl}/support`, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${baseUrl}/privacy`, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${baseUrl}/terms`, changeFrequency: 'yearly', priority: 0.2 },
  ];

  try {
    const supabase = createPublicClient();
    if (!supabase) {
      return includeDemoCatalogue ? [
        ...staticPages,
        ...demoCategories.map((category) => ({ url: `${baseUrl}/category/${category.slug}`, lastModified: new Date(category.created_at), changeFrequency: 'weekly' as const, priority: 0.8 })),
        ...demoProducts.map((product) => ({ url: `${baseUrl}/product/${product.slug}`, lastModified: new Date(product.created_at), changeFrequency: 'weekly' as const, priority: 0.9 })),
      ] : staticPages;
    }

    // Get all categories
    const { data: categories } = await supabase
      .from('categories')
      .select('slug, created_at, synced_at');

    const sitemapCategories = categories?.length ? categories : includeDemoCatalogue ? demoCategories : [];
    const categoryPages: MetadataRoute.Sitemap = sitemapCategories.map((category: { slug: string; created_at: string; synced_at?: string | null }) => ({
      url: `${baseUrl}/category/${category.slug}`,
      lastModified: new Date(category.synced_at || category.created_at),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }));

    // Get all products
    const { data: products } = await supabase
      .from('products')
      .select('slug, created_at, synced_at')
      .eq('is_active', true);

    const sitemapProducts = products?.length ? products : includeDemoCatalogue ? demoProducts : [];
    const productPages: MetadataRoute.Sitemap = sitemapProducts.map((product: { slug: string; created_at: string; synced_at?: string | null }) => ({
      url: `${baseUrl}/product/${product.slug}`,
      lastModified: new Date(product.synced_at || product.created_at),
      changeFrequency: 'weekly' as const,
      priority: 0.9,
    }));

    return [...staticPages, ...categoryPages, ...productPages];
  } catch (error) {
    console.error('Error generating sitemap:', error);
    return staticPages;
  }
}
