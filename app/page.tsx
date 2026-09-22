import { MainLayout } from '@/components/layout/main-layout';
import { HomePageContent } from './home-content';
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

  if (supabase) {
    const [{ data: categoryData }, { data: productData }] = await Promise.all([
      supabase.from('categories').select('*').is('parent_id', null).order('synced_at', { ascending: false, nullsFirst: false }).limit(4),
      supabase
        .from('products')
        .select('*, category:categories (*), variants:product_variants (*)')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(4),
    ]);

    if (categoryData?.length) categories = categoryData;
    if (productData?.length) products = productData as CatalogProduct[];
  }

  return (
    <MainLayout>
      <HomePageContent categories={categories} products={products} />
    </MainLayout>
  );
}
