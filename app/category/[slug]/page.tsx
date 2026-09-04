import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createPublicClient } from '@/lib/supabase/public';
import { CategoryPageContent } from './category-content';
import { demoProducts, findDemoCategory } from '@/lib/demo-catalog';
import type { Product, ProductVariant } from '@/types/database';
import { absoluteUrl } from '@/lib/site';

export const revalidate = 300;

interface CategoryPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ sort?: string; color?: string; size?: string; min?: string; max?: string; page?: string }>;
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params;
  const supabase = createPublicClient();

  const { data: category } = supabase
    ? await supabase.from('categories').select('*').eq('slug', slug).maybeSingle()
    : { data: null };
  const resolvedCategory = category || findDemoCategory(slug);

  if (!resolvedCategory) {
    return {
      title: 'Category Not Found',
    };
  }

  return {
    title: resolvedCategory.name,
    description: resolvedCategory.description || `Shop our collection of ${resolvedCategory.name.toLowerCase()} at Sri Boutique.`,
    alternates: { canonical: absoluteUrl(`/category/${resolvedCategory.slug}`) },
    openGraph: {
      title: `${resolvedCategory.name} | Sri Boutique`,
      description: resolvedCategory.description || `Shop our collection of ${resolvedCategory.name.toLowerCase()} at Sri Boutique.`,
      url: absoluteUrl(`/category/${resolvedCategory.slug}`),
      images: resolvedCategory.image_url ? [{ url: resolvedCategory.image_url }] : [],
    },
  };
}

export default async function CategoryPage({ params, searchParams }: CategoryPageProps) {
  const { slug } = await params;
  const supabase = createPublicClient();

  const { data: category } = supabase
    ? await supabase.from('categories').select('*').eq('slug', slug).maybeSingle()
    : { data: null };
  const resolvedCategory = category || findDemoCategory(slug);

  if (!resolvedCategory) {
    notFound();
  }

  const { data: productData } = supabase && category
    ? await supabase
        .from('products')
        .select('*, variants:product_variants (*)')
        .eq('category_id', category.id)
        .eq('is_active', true)
    : { data: null };

  const fallbackProducts = demoProducts.filter((product) =>
    product.category?.slug === resolvedCategory.slug,
  );
  const products = productData?.length
    ? productData as (Product & { variants: ProductVariant[] })[]
    : fallbackProducts;

  const filters = await searchParams;

  return (
    <CategoryPageContent
      category={resolvedCategory}
      initialProducts={products}
      initialFilters={filters}
    />
  );
}
