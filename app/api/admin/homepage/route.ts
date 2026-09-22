import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/admin-auth';
import { createAdminClient } from '@/lib/supabase/admin-client';
import { homepageSchema, productImages } from '@/lib/homepage-settings';
import { PAYMENT_TEST_PRODUCT_ID } from '@/lib/payment-test-product';

async function catalogue() {
  const db = createAdminClient();
  const { data, error } = await db.from('products').select('*, category:categories(*), variants:product_variants(*)').eq('is_active', true).neq('id', PAYMENT_TEST_PRODUCT_ID).order('name').limit(1000);
  if (error) throw error;
  return data || [];
}
export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  try { return NextResponse.json({ products: await catalogue() }, { headers: { 'Cache-Control': 'no-store' } }); }
  catch { return NextResponse.json({ error: 'Unable to load product images' }, { status: 503 }); }
}
export async function PUT(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const parsed = homepageSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || Object.keys(parsed.data.covers).length > 12) return NextResponse.json({ error: 'Invalid homepage selections. Choose unique products.' }, { status: 400 });
  try {
    const products = await catalogue();
    for (const choice of [...Object.values(parsed.data.covers), ...parsed.data.featured]) {
      const product = products.find(p => p.id === choice.productId);
      if (!product || !productImages(product as any).includes(choice.image)) return NextResponse.json({ error: 'A selected product or image is no longer available. Choose another.' }, { status: 400 });
    }
    const { error } = await createAdminClient().from('homepage_settings' as any).update({ settings: parsed.data, updated_at: new Date().toISOString() } as never).eq('id', true);
    if (error) throw error;
    revalidatePath('/');
    return NextResponse.json({ success: true });
  } catch { return NextResponse.json({ error: 'Could not publish homepage changes' }, { status: 503 }); }
}
