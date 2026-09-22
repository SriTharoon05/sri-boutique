import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { createAdminClient } from '@/lib/supabase/admin-client';
import { z } from 'zod';
import { getSheScaleClient } from '@/lib/suppliers/shescale';

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  try {
    const db: any = createAdminClient();
    const { data } = await db.from('products').select('supplier_payload').eq('source_type', 'dropship').eq('is_active', true).limit(1).single();
    if (!data?.supplier_payload?.slug) throw new Error('No product');
    await getSheScaleClient().getProduct(data.supplier_payload.slug);
    return NextResponse.json({ valid: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ error: 'Product access failed. Replace the token or check supplier availability.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const parsed = z.object({ token: z.string().trim().min(20).max(8192) }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Enter a valid access token' }, { status: 400 });
  const token = parsed.data.token.replace(/^Bearer\s+/i, '');
  if (/\s/.test(token)) return NextResponse.json({ error: 'Paste only the access token, not request headers' }, { status: 400 });
  const db: any = createAdminClient();
  const { error } = await db.rpc('save_shescale_token', { token });
  if (error) return NextResponse.json({ error: 'Could not securely save token. Check Vault migration.' }, { status: 503 });
  return NextResponse.json({ saved: true }, { headers: { 'Cache-Control': 'no-store' } });
}
