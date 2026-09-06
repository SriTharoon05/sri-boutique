import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { dispatchDropshipOrder } from '@/lib/suppliers/orders';

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { id } = await context.params;
  try {
    return NextResponse.json({ results: await dispatchDropshipOrder(id) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Dispatch failed' }, { status: 502 });
  }
}

