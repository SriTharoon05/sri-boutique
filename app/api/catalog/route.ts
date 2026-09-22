import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin-client';
import { syncSupplierCatalog } from '@/lib/suppliers/sync';
import { getVendorDailyQuota } from '@/lib/suppliers/daily-quota';

export const maxDuration = 300;

// Fixed supplier only. Never accept arbitrary upstream URLs or forward cookies.
export async function GET(request: NextRequest) {
  const page = Number(request.nextUrl.searchParams.get('page') || 1);
  const limit = Number(request.nextUrl.searchParams.get('limit') || 15);
  if (!Number.isInteger(page) || page < 1 || page > 10000 || !Number.isInteger(limit) || limit < 1 || limit > 50) {
    return NextResponse.json({ error: 'Invalid pagination' }, { status: 400 });
  }
  try {
    const db: any = createAdminClient();
    const { data: supplier, error } = await db.from('suppliers').select('*').eq('code', 'shescale').single();
    if (error) throw error;
    const refreshSeconds = Math.max(15, Math.min(3600, Number(supplier.config?.refresh_seconds) || 15));
    if (supplier.enabled && supplier.sync_enabled && Date.now() - Date.parse(supplier.updated_at) >= refreshSeconds * 1000) {
      try { await syncSupplierCatalog('shescale', true); } catch { /* Serve last known catalogue; admin sees sync failure. */ }
    }
    const [{ data: products, error: productError, count }, { data: categories }, { data: status }] = await Promise.all([
      db.from('products').select('id, name, slug, description, base_price, category_id, compare_at_price, variants:product_variants(id, color, size, stock_quantity, image_urls, price_override, is_active)', { count: 'exact' })
        .eq('supplier_id', supplier.id).eq('is_active', true).order('created_at', { ascending: false }).order('id').range((page - 1) * limit, page * limit - 1),
      db.from('categories').select('id, name, slug, image_url').eq('supplier_id', supplier.id).order('name'),
      db.from('suppliers').select('last_sync_at, last_sync_status').eq('id', supplier.id).single(),
    ]);
    if (productError) throw productError;
    const quota = await getVendorDailyQuota();
    const visibleProducts = (products || []).map((product: any) => ({ ...product, variants: product.variants.map((v: any) => ({ ...v, stock_quantity: quota.ready && quota.remaining > 0 ? v.stock_quantity : 0 })) }));
    return NextResponse.json({ products: supplier.enabled ? visibleProducts : [], quota, categories: supplier.enabled ? categories : [], total: supplier.enabled ? count : 0, page, limit, refreshSeconds, revision: status?.last_sync_at, stale: status?.last_sync_status !== 'success' }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ error: 'Catalogue temporarily unavailable' }, { status: 503, headers: { 'Retry-After': '30' } });
  }
}
