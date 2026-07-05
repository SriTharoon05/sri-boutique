import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// FIX: validate the id looks like a UUID before ever touching the DB.
// Without this, passing something like "checkout" causes Postgres to
// throw an "invalid input syntax for type uuid" error, which was being
// swallowed and returned as a generic 500 — making the real problem
// (bad navigation upstream) impossible to see from the client.
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id || !UUID_REGEX.test(id)) {
      return NextResponse.json({ error: 'Invalid order id' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: order, error } = await supabase
      .from('orders')
      .select(`
        *,
        items:order_items (*)
      `)
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error('Error fetching order from DB:', error);
      return NextResponse.json({ error: 'Failed to fetch order' }, { status: 500 });
    }

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Check ownership or admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (order.user_id !== user.id && profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    return NextResponse.json({ order });
  } catch (error) {
    console.error('Error fetching order:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}