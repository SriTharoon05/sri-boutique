import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createAdminClient } from '@/lib/supabase/admin-client';
import { syncSupplierCatalog } from '@/lib/suppliers/sync';
import { reconcileSupplierOrders } from '@/lib/suppliers/reconcile';

function validSecret(received: string, expected: string) {
  const a = Buffer.from(received);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export async function POST(request: NextRequest) {
  const expected = process.env.CRON_SECRET || '';
  const received = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || '';
  if (!expected || !received || !validSecret(received, expected)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const db: any = createAdminClient();
  const { data: suppliers } = await db.from('suppliers').select('code').eq('enabled', true).eq('sync_enabled', true);
  const syncResults = [];
  for (const supplier of suppliers || []) {
    try { syncResults.push({ code: supplier.code, ok: true, result: await syncSupplierCatalog(supplier.code) }); }
    catch (error) { syncResults.push({ code: supplier.code, ok: false, error: error instanceof Error ? error.message : 'Sync failed' }); }
  }
  return NextResponse.json({ syncResults, orders: await reconcileSupplierOrders() });
}

