import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ProductPageContent } from './product-content';

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
  const supabase = await createClient();

  const { data: product } = await supabase
    .from('products')
    .select(`
      *,
      category:categories (*)
    `)
    .eq('slug', slug)
    .maybeSingle();

  if (!product) {
    return {
      title: 'Product Not Found',
    };
  }

  return {
    title: `${product.name} | Sri Boutique`,
    description: product.description || `Shop ${product.name} at Sri Boutique.`,
    openGraph: {
      title: `${product.name} | Sri Boutique`,
      description: product.description || `Shop ${product.name} at Sri Boutique.`,
      type: 'website',
      images: product.variants?.[0]?.image_urls?.[0] ? [{ url: product.variants[0].image_urls[0] }] : [],
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
      url: `https://sriboutique.com/product/${product.slug}`,
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
  const supabase = await createClient();

  const { data: product } = await supabase
    .from('products')
    .select(`
      *,
      category:categories (*),
      variants:product_variants (*)
    `)
    .eq('slug', slug)
    .maybeSingle();

  if (!product) {
    notFound();
  }

  // Get reviews
  const { data: reviews } = await supabase
    .from('reviews')
    .select(`
      *,
      user:profiles (full_name, avatar_url)
    `)
    .eq('product_id', product.id)
    .order('created_at', { ascending: false })
    .limit(10);

  // Get related products
  const { data: relatedProducts } = await supabase
    .from('products')
    .select(`
      *,
      category:categories (*),
      variants:product_variants (*)
    `)
    .eq('category_id', product.category_id)
    .neq('id', product.id)
    .eq('is_active', true)
    .limit(4);

  const structuredData = generateStructuredData(product);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <ProductPageContent
        product={product}
        reviews={reviews || []}
        relatedProducts={relatedProducts || []}
      />
    </>
  );
}