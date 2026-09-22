import { catalogSlugCandidates, categoryDescription } from '@/lib/storefront-brand';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createPublicClient } from '@/lib/supabase/public';
import { CategoryPageContent } from './category-content';
import { demoProducts, findDemoCategory } from '@/lib/demo-catalog';
import type { Product, ProductVariant } from '@/types/database';
import { absoluteUrl } from '@/lib/site';
import { getDisplayCategoryImage } from '@/lib/mock-images';
import { isDemoRecord } from '@/lib/seo';

export const revalidate = 300;

interface CategoryPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ sort?: string; color?: string; size?: string; min?: string; max?: string; page?: string }>;
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params;
  const supabase = createPublicClient();

  const { data: category } = supabase
    ? await supabase.from('categories').select('*').in('slug', catalogSlugCandidates(slug)).maybeSingle()
    : { data: null };
  const resolvedCategory = category || findDemoCategory(slug);

  if (!resolvedCategory) {
    return {
      title: 'Category Not Found',
    };
  }

  return {
    title: resolvedCategory.name,
    description: categoryDescription(resolvedCategory),
    alternates: { canonical: absoluteUrl(`/category/${resolvedCategory.slug}`) },
    robots: isDemoRecord(resolvedCategory) ? { index: false, follow: true } : undefined,
    openGraph: {
      title: `${resolvedCategory.name} | Sri Boutique`,
      description: categoryDescription(resolvedCategory),
      url: absoluteUrl(`/category/${resolvedCategory.slug}`),
      images: [{ url: getDisplayCategoryImage(resolvedCategory.slug, resolvedCategory.image_url) }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${resolvedCategory.name} | Sri Boutique`,
      description: categoryDescription(resolvedCategory),
      images: [getDisplayCategoryImage(resolvedCategory.slug, resolvedCategory.image_url)],
    },
  };
}

export default async function CategoryPage({ params, searchParams }: CategoryPageProps) {
  const { slug } = await params;
  const supabase = createPublicClient();

  const { data: category } = supabase
    ? await supabase.from('categories').select('*').in('slug', catalogSlugCandidates(slug)).maybeSingle()
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

  const breadcrumbData = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: absoluteUrl('/') },
      { '@type': 'ListItem', position: 2, name: resolvedCategory.name, item: absoluteUrl(`/category/${resolvedCategory.slug}`) },
    ],
  };

  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbData) }} />
    <CategoryPageContent category={{ ...resolvedCategory, description: categoryDescription(resolvedCategory) }} initialProducts={products} initialFilters={filters} />
  </>;
}
