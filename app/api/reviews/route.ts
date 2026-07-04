import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { product_id, order_id, rating, comment, image_urls } = body;

  if (!product_id || !order_id || !rating) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  // Verify the order belongs to the user and is delivered
  const { data: order } = await supabase
    .from('orders')
    .select('id, status')
    .eq('id', order_id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!order || order.status !== 'delivered') {
    return NextResponse.json(
      { error: 'You can only review products from delivered orders' },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from('reviews')
    .insert({
      product_id,
      user_id: user.id,
      order_id,
      rating,
      comment: comment || null,
      image_urls: image_urls || [],
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ review: data });
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const productId = searchParams.get('product_id');

  if (!productId) {
    return NextResponse.json({ error: 'Product ID required' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('reviews')
    .select(`
      *,
      user:profiles (full_name, avatar_url)
    `)
    .eq('product_id', productId)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ reviews: data });
}
