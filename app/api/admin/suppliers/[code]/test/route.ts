import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { createAdminClient } from '@/lib/supabase/admin-client';
import { getSheScaleClient } from '@/lib/suppliers/shescale';

export async function POST(_request: Request, context: { params: Promise<{ code: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { code } = await context.params;
  const db: any = createAdminClient();
  const { data: supplier } = await db.from('suppliers').select('*').eq('code', code).single();
  if (!supplier) return NextResponse.json({ error: 'Supplier not found' }, { status: 404 });
  try {
    if (supplier.adapter !== 'shescale_partner_v1') throw new Error(`Unsupported supplier adapter: ${supplier.adapter}`);
    const result = await getSheScaleClient(supplier.base_url).listProducts(1, 1);
    return NextResponse.json({ success: true, message: `Connected. Received ${result.products.length} product record(s) in the test response.` });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Connection failed' }, { status: 502 });
  }
}

