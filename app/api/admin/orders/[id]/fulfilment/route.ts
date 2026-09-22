import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/admin-auth';
import { createAdminClient } from '@/lib/supabase/admin-client';
export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { id } = await context.params;
  const parsed = z.object({ reference: z.string().trim().min(1).max(160) }).safeParse(await request.json().catch(() => null));
  if (!z.string().uuid().safeParse(id).success || !parsed.success) return NextResponse.json({ error: 'Invalid order reference' }, { status: 400 });
  const db: any = createAdminClient();
  const { data, error } = await db.from('orders').update({ supplier_reference: parsed.data.reference, updated_at: new Date().toISOString() }).eq('id', id).eq('payment_status', 'success').select('id').maybeSingle();
  if (error || !data) return NextResponse.json({ error: 'Order must have a verified online payment or COD advance first' }, { status: 409 });
  return NextResponse.json({ saved: true });
}
