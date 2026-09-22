import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { PAYMENT_TEST_PRODUCT_ID, PAYMENT_TEST_SLUG } from '@/lib/payment-test-product';

export async function PATCH(request: NextRequest) {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: profile } = await db.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const body = await request.json().catch(() => null);
  if (typeof body?.is_active !== 'boolean') return NextResponse.json({ error: 'Visibility is required' }, { status: 400 });
  const { error } = await db.from('products').update({ is_active: body.is_active }).eq('id', PAYMENT_TEST_PRODUCT_ID);
  if (error) return NextResponse.json({ error: 'Unable to change visibility' }, { status: 500 });
  revalidatePath('/');
  revalidatePath('/search');
  revalidatePath(`/product/${PAYMENT_TEST_SLUG}`);
  return NextResponse.json({ success: true });
}
