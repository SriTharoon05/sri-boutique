import { catalogSlugCandidates } from '@/lib/storefront-brand';
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin-client';
import { getSheScaleClient } from '@/lib/suppliers/shescale';
import { calculateProtectedPrice } from '@/lib/suppliers/pricing';
import { getVendorDailyQuota } from '@/lib/suppliers/daily-quota';

// Only proxy a known, published local product. Never expose raw supplier data,
// purchase costs, credentials, cookies, or account information to shoppers.
export async function GET(_request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  if (slug.length > 240) return NextResponse.json({ error: 'Invalid product' }, { status: 400 });
  try {
    const db: any = createAdminClient();
    const { data: local } = await db.from('products').select('id, slug, supplier_id, supplier_payload').in('slug', catalogSlugCandidates(slug)).eq('is_active', true).single();
    if (!local?.supplier_payload?.slug) return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    const { data: supplier } = await db.from('suppliers').select('*').eq('id', local.supplier_id).eq('enabled', true).single();
    if (!supplier || supplier.code !== 'shescale') return NextResponse.json({ error: 'Product unavailable' }, { status: 404 });
    const product = await getSheScaleClient(supplier.base_url).getNormalizedProduct(local.supplier_payload.slug);
    const quota = await getVendorDailyQuota();
    const allowed = quota.ready && quota.remaining > 0;
    return NextResponse.json({ id: local.id, slug: local.slug, name: product.name, description: product.description, images: product.images,
      available: allowed && product.active && product.variants.some(v => v.active && v.stock > 0),
      variants: product.variants.map(v => ({ supplierVariantId: v.externalId, color: v.color, size: v.size, images: v.images, available: allowed && product.active && v.active && v.stock > 0, maxQuantity: allowed ? v.stock : 0, price: calculateProtectedPrice(v.cost, supplier).sellingPrice })),
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ error: 'Live availability check unavailable. Please try again shortly.' }, { status: 503, headers: { 'Retry-After': '30' } });
  }
}
