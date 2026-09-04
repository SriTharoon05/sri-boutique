import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createPublicClient } from '@/lib/supabase/public';
import { ProductPageContent } from './product-content';
import { findDemoProduct } from '@/lib/demo-catalog';
import { absoluteUrl } from '@/lib/site';

// Force fresh data on every request — without this, Next.js may cache
// this page's Supabase query results, so stock/price changes in the DB
// don't show up until a hard refresh bypasses the cache.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface ProductPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const supabase = createPublicClient();

  const { data: product } = supabase
    ? await supabase
        .from('products')
        .select('*, category:categories (*), variants:product_variants (*)')
        .eq('slug', slug)
        .maybeSingle()
    : { data: null };
  const resolvedProduct = product || findDemoProduct(slug);

  if (!resolvedProduct) {
    return {
      title: 'Product Not Found',
    };
  }

  return {
    title: resolvedProduct.name,
    description: resolvedProduct.description || `Shop ${resolvedProduct.name} at Sri Boutique.`,
    alternates: { canonical: absoluteUrl(`/product/${resolvedProduct.slug}`) },
    openGraph: {
      title: `${resolvedProduct.name} | Sri Boutique`,
      description: resolvedProduct.description || `Shop ${resolvedProduct.name} at Sri Boutique.`,
      type: 'website',
      url: absoluteUrl(`/product/${resolvedProduct.slug}`),
      images: resolvedProduct.variants?.[0]?.image_urls?.[0] ? [{ url: resolvedProduct.variants[0].image_urls[0] }] : [],
    },
  };
}

// Generate JSON-LD structured data
function generateStructuredData(product: any) {
  const variant = product.variants?.[0];
  const price = variant?.price_override ?? product.base_price;

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description,
    image: variant?.image_urls || [],
    offers: {
      '@type': 'Offer',
      price: price,
      priceCurrency: 'INR',
      availability: variant?.stock_quantity > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      url: absoluteUrl(`/product/${product.slug}`),
    },
    aggregateRating: product.avg_rating > 0 ? {
      '@type': 'AggregateRating',
      ratingValue: product.avg_rating,
      reviewCount: product.review_count,
    } : undefined,
    brand: {
      '@type': 'Brand',
      name: 'Sri Boutique',
    },
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const supabase = createPublicClient();

  const { data: product } = supabase
    ? await supabase
        .from('products')
        .select('*, category:categories (*), variants:product_variants (*)')
        .eq('slug', slug)
        .maybeSingle()
    : { data: null };
  const resolvedProduct = product || findDemoProduct(slug);

  if (!resolvedProduct) {
    notFound();
  }

  // Get reviews
  const { data: reviews } = supabase && product ? await supabase
    .from('reviews')
    .select(`
      *,
      user:profiles (full_name, avatar_url)
    `)
    .eq('product_id', product.id)
    .order('created_at', { ascending: false })
    .limit(10) : { data: [] };

  // Get related products
  const { data: relatedProducts } = supabase && product ? await supabase
    .from('products')
    .select(`
      *,
      category:categories (*),
      variants:product_variants (*)
    `)
    .eq('category_id', product.category_id)
    .neq('id', product.id)
    .eq('is_active', true)
    .limit(4) : { data: [] };

  const structuredData = generateStructuredData(resolvedProduct);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <ProductPageContent
        product={resolvedProduct}
        reviews={reviews || []}
        relatedProducts={relatedProducts || []}
      />
    </>
  );
}
