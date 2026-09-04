import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { MainLayout } from '@/components/layout/main-layout';
import { Card } from '@/components/ui/card';
import { createPublicClient } from '@/lib/supabase/public';
import { demoProducts, type CatalogProduct } from '@/lib/demo-catalog';

export const metadata: Metadata = {
  title: 'Search',
  robots: { index: false, follow: true },
};

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const query = String((await searchParams).q || '').trim().slice(0, 80);
  let products: CatalogProduct[] = [];

  if (query) {
    const supabase = createPublicClient();
    if (supabase) {
      const escapedQuery = query.replace(/[%_]/g, (character) => `\\${character}`);
      const { data } = await supabase
        .from('products')
        .select('*, category:categories (*), variants:product_variants (*)')
        .eq('is_active', true)
        .ilike('name', `%${escapedQuery}%`)
        .limit(24);
      products = (data || []) as CatalogProduct[];
    }

    if (!products.length) {
      const normalized = query.toLowerCase();
      products = demoProducts.filter((product) =>
        `${product.name} ${product.description} ${product.category?.name}`.toLowerCase().includes(normalized),
      );
    }
  }

  return (
    <MainLayout>
      <main className="container mx-auto px-4 py-12 min-h-[60vh]">
        <h1 className="font-display text-3xl font-semibold">Search</h1>
        <p className="mt-2 text-muted-foreground">
          {query ? `${products.length} result${products.length === 1 ? '' : 's'} for “${query}”` : 'Enter a product name or style using the search button.'}
        </p>

        {query && products.length === 0 ? (
          <div className="py-20 text-center text-muted-foreground">No matching products found.</div>
        ) : (
          <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 md:gap-6">
            {products.map((product) => {
              const variant = product.variants?.[0];
              const image = variant?.image_urls?.[0];
              const price = variant?.price_override ?? product.base_price;
              return (
                <Link key={product.id} href={`/product/${product.slug}`}>
                  <Card className="group border-0 shadow-none">
                    <div className="relative aspect-[3/4] overflow-hidden rounded-lg bg-muted">
                      {image && <Image src={image} alt={product.name} fill sizes="(max-width: 768px) 50vw, 25vw" className="object-cover transition-transform duration-500 group-hover:scale-105" />}
                    </div>
                    <h2 className="mt-3 line-clamp-2 font-medium group-hover:text-primary">{product.name}</h2>
                    <p className="mt-1 font-display text-lg font-semibold">₹{Number(price).toLocaleString('en-IN')}</p>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </MainLayout>
  );
}
