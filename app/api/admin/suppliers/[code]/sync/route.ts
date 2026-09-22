import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { syncSupplierCatalog } from '@/lib/suppliers/sync';
export const maxDuration = 300;

export async function POST(request: NextRequest, context: { params: Promise<{ code: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { code } = await context.params;
  const body = await request.json().catch(() => ({}));
  try {
    const result = await syncSupplierCatalog(code, Boolean(body.fullSync));
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Catalogue sync failed' }, { status: 502 });
  }
}
