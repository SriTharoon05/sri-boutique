import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin-client';
export async function GET() {
  const session = await createClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const db: any = createAdminClient();
  const { data: cart } = await db.from('carts').select('id').eq('user_id', user.id).maybeSingle();
  const { data: items, error } = await db.from('cart_items').select('variant:product_variants(product:products(supplier_id,supplier_payload))').eq('cart_id', cart?.id || '00000000-0000-0000-0000-000000000000');
  if (error) return NextResponse.json({ error: 'Unable to load payment methods' }, { status: 503 });
  const product = items?.length === 1 ? items[0].variant?.product : null;
  const { data: supplier } = await db.from('suppliers').select('config,enabled').eq('code', 'shescale').eq('id', product?.supplier_id || '00000000-0000-0000-0000-000000000000').maybeSingle();
  return NextResponse.json({ codAvailable: Boolean(supplier?.enabled && supplier.config?.cod_enabled && product?.supplier_payload?.codAvailable), codAdvance: Number(supplier?.config?.cod_advance ?? 100), codFee: Number(supplier?.config?.cod_fee ?? 100) }, { headers: { 'Cache-Control': 'no-store' } });
}
