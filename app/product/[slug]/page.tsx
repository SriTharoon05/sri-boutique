import { catalogSlugCandidates } from '@/lib/storefront-brand';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createPublicClient } from '@/lib/supabase/public';
import { createClient } from '@/lib/supabase/server';
import { PAYMENT_TEST_SLUG } from '@/lib/payment-test-product';
import { ProductPageContent } from './product-content';
import { findDemoProduct } from '@/lib/demo-catalog';
import { absoluteUrl } from '@/lib/site';
import { getDisplayProductGallery, getDisplayProductImage } from '@/lib/mock-images';
import type { CatalogProduct } from '@/lib/demo-catalog';
import { isDemoRecord, merchantReturnPolicy, productSeoDescription, shippingDetails } from '@/lib/seo';

// Force fresh data on every request — without this, Next.js may cache
// this page's Supabase query results, so stock/price changes in the DB
// don't show up until a hard refresh bypasses the cache.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface ProductPageProps {
  params: Promise<{ slug: string }>;
}

async function productClient(slug: string) {
  if (slug !== PAYMENT_TEST_SLUG) return createPublicClient();
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) notFound();
  const { data: profile } = await db.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') notFound();
  return db;
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await productClient(slug);

  const { data: product } = supabase
    ? await supabase
        .from('products')
        .select('*, category:categories (*), variants:product_variants (*)')
        .in('slug', catalogSlugCandidates(slug))
        .eq('is_active', true)
        .maybeSingle()
    : { data: null };
  const resolvedProduct = product || findDemoProduct(slug);

  if (!resolvedProduct) {
    return {
      title: 'Product Not Found',
    };
  }

  const catalogProduct = resolvedProduct as CatalogProduct;
  const description = productSeoDescription(catalogProduct);
  const image = getDisplayProductImage(catalogProduct.slug, catalogProduct.variants?.[0]?.image_urls?.[0]);

  return {
    title: catalogProduct.name,
    description,
    alternates: { canonical: absoluteUrl(`/product/${catalogProduct.slug}`) },
    robots: isDemoRecord(catalogProduct) ? { index: false, follow: true } : undefined,
    openGraph: {
      title: `${catalogProduct.name} | Sri Boutique`,
      description,
      type: 'website',
      url: absoluteUrl(`/product/${catalogProduct.slug}`),
      images: [{ url: image, alt: catalogProduct.name }],
    },
    twitter: { card: 'summary_large_image', title: `${catalogProduct.name} | Sri Boutique`, description, images: [image] },
  };
}

function productOffer(product: CatalogProduct, variant: CatalogProduct['variants'][number]) {
  const price = variant.price_override ?? product.base_price;
  const available = variant.is_active && variant.stock_quantity > 0;
  return {
      '@type': 'Offer',
      price,
      priceCurrency: 'INR',
      itemCondition: 'https://schema.org/NewCondition',
      availability: available ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      url: absoluteUrl(`/product/${product.slug}`),
      seller: { '@id': `${absoluteUrl('/')}#store` },
      shippingDetails: {
        ...shippingDetails,
        shippingRate: {
          ...shippingDetails.shippingRate,
          value: 0,
        },
      },
      hasMerchantReturnPolicy: { '@id': merchantReturnPolicy['@id'] },
  };
}

function generateStructuredData(product: CatalogProduct) {
  const variants = product.variants?.filter((variant) => variant.is_active) || [];
  const firstVariant = variants[0] || product.variants?.[0];
  const common = {
    name: product.name,
    description: productSeoDescription(product),
    image: getDisplayProductGallery(product.slug, firstVariant?.image_urls || []),
    brand: { '@type': 'Brand', name: 'Sri Boutique' },
    aggregateRating: product.avg_rating > 0 && product.review_count > 0 ? {
      '@type': 'AggregateRating',
      ratingValue: product.avg_rating,
      reviewCount: product.review_count,
    } : undefined,
  };

  const productData = variants.length > 1 ? {
    '@type': 'ProductGroup',
    '@id': absoluteUrl(`/product/${product.slug}#product`),
    productGroupID: product.supplier_product_id || product.id,
    variesBy: [variants.some((variant) => variant.color) ? 'https://schema.org/color' : null, variants.some((variant) => variant.size) ? 'https://schema.org/size' : null].filter(Boolean),
    ...common,
    hasVariant: variants.map((variant) => ({
      '@type': 'Product',
      name: `${product.name}${variant.color ? ` - ${variant.color}` : ''}${variant.size ? ` / ${variant.size}` : ''}`,
      sku: variant.sku,
      color: variant.color || undefined,
      size: variant.size || undefined,
      image: variant.image_urls?.length ? variant.image_urls : common.image,
      offers: productOffer(product, variant),
    })),
  } : {
    '@type': 'Product',
    '@id': absoluteUrl(`/product/${product.slug}#product`),
    ...common,
    sku: firstVariant?.sku,
    color: firstVariant?.color || undefined,
    size: firstVariant?.size || undefined,
    offers: firstVariant ? productOffer(product, firstVariant) : undefined,
  };

  return {
    '@context': 'https://schema.org',
    '@graph': [
      productData,
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: absoluteUrl('/') },
          ...(product.category ? [{ '@type': 'ListItem', position: 2, name: product.category.name, item: absoluteUrl(`/category/${product.category.slug}`) }] : []),
          { '@type': 'ListItem', position: product.category ? 3 : 2, name: product.name, item: absoluteUrl(`/product/${product.slug}`) },
        ],
      },
    ],
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const supabase = await productClient(slug);

  const { data: product } = supabase
    ? await supabase
        .from('products')
        .select('*, category:categories (*), variants:product_variants (*)')
        .in('slug', catalogSlugCandidates(slug))
        .eq('is_active', true)
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

  const structuredData = generateStructuredData(resolvedProduct as CatalogProduct);

  return (
    <>
      {!isDemoRecord(resolvedProduct) && <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, '\\u003c') }}
      />}
      <ProductPageContent
        product={resolvedProduct}
        reviews={reviews || []}
        relatedProducts={relatedProducts || []}
      />
    </>
  );
}
