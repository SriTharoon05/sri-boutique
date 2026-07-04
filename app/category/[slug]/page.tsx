import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { CategoryPageContent } from './category-content';

interface CategoryPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ sort?: string; color?: string; size?: string; min?: string; max?: string; page?: string }>;
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: category } = await supabase
    .from('categories')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();

  if (!category) {
    return {
      title: 'Category Not Found',
    };
  }

  return {
    title: `${category.name} | Sri Boutique`,
    description: category.description || `Shop our collection of ${category.name.toLowerCase()} at Sri Boutique.`,
    openGraph: {
      title: `${category.name} | Sri Boutique`,
      description: category.description || `Shop our collection of ${category.name.toLowerCase()} at Sri Boutique.`,
      images: category.image_url ? [{ url: category.image_url }] : [],
    },
  };
}

export default async function CategoryPage({ params, searchParams }: CategoryPageProps) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: category } = await supabase
    .from('categories')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();

  if (!category) {
    notFound();
  }

  const filters = await searchParams;

  return <CategoryPageContent category={category} initialFilters={filters} />;
}
