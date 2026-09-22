import { MainLayout } from '@/components/layout/main-layout';
import { groupCategories } from '@/lib/category-groups';
import { HomepageEditor } from '@/components/homepage-editor';
import { homepageSchema, defaultHomepageSettings } from '@/lib/homepage-settings';
import { createPublicClient } from '@/lib/supabase/public';
import { demoCategories, demoProducts, type CatalogProduct } from '@/lib/demo-catalog';
import type { Category } from '@/types/database';
import { buildPageMetadata } from '@/lib/seo';

export const metadata = {
  ...buildPageMetadata(
  'Sarees & Indian Fashion, Remixed',
  'Shop statement sarees and fresh Indian fashion edits from Sri Boutique in Chennai. Secure checkout, transparent pricing, and Pan-India delivery.',
  '/',
  ),
  title: { absolute: 'Sri Boutique | Sarees & Indian Fashion, Remixed' },
};

export const revalidate = 300;

export default async function HomePage() {
  const supabase = createPublicClient();
  let categories = demoCategories as (Category & { _count?: number })[];
  let products = demoProducts;
  let settings = defaultHomepageSettings;
  let selectedProducts: CatalogProduct[] = [];

  if (supabase) {
    const [{ data: categoryData }, { data: productData }] = await Promise.all([
      supabase.from('categories').select('*').is('parent_id', null).order('name'),
      supabase
        .from('products')
        .select('*, category:categories (*), variants:product_variants (*)')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(4),
    ]);

    if (categoryData?.length) categories = groupCategories(categoryData as Category[]).slice(0, 4);
    if (productData?.length) products = productData as CatalogProduct[];
    const { data: saved } = await supabase.from('homepage_settings').select('settings').eq('id', true).maybeSingle();
    const parsed = homepageSchema.safeParse(saved?.settings);
    if (parsed.success) settings = parsed.data;
    const ids = Array.from(new Set([...Object.values(settings.covers), ...settings.featured].map(p => p.productId)));
    if (ids.length) {
      const { data } = await supabase.from('products').select('*, category:categories(*), variants:product_variants(*)').eq('is_active', true).in('id', ids);
      selectedProducts = (data || []) as CatalogProduct[];
    }
  }

  return (
    <MainLayout>
      <HomepageEditor categories={categories} products={products} initialSettings={settings} selectedProducts={selectedProducts} />
    </MainLayout>
  );
}
