import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin-client';
import { validateDropshipOrderAvailability } from '@/lib/suppliers/orders';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: NextRequest) {
  try {
    const { orderId } = await request.json();

    if (!orderId || !UUID_REGEX.test(orderId)) {
      return NextResponse.json({ error: 'Invalid order id' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const adminSupabase = createAdminClient();
    const { data: order } = await adminSupabase
      .from('orders')
      .select('id, user_id, total, status, payment_status, razorpay_order_id')
      .eq('id', orderId)
      .maybeSingle();

    if (!order || order.user_id !== user.id) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }
    if (order.status !== 'pending' || order.payment_status === 'success') {
      return NextResponse.json({ error: 'This order cannot be paid again' }, { status: 409 });
    }

    try {
      await validateDropshipOrderAvailability(orderId);
    } catch (availabilityError) {
      return NextResponse.json({ error: availabilityError instanceof Error ? availabilityError.message : 'A supplier item is unavailable' }, { status: 409 });
    }

    const key_id = process.env.RAZORPAY_KEY_ID;
    const key_secret = process.env.RAZORPAY_KEY_SECRET;

    if (!key_id || !key_secret) {
      return NextResponse.json({ error: 'Payment service is not configured' }, { status: 503 });
    }

    const amountInPaise = Math.round(Number(order.total) * 100);
    if (!Number.isSafeInteger(amountInPaise) || amountInPaise < 100) {
      return NextResponse.json({ error: 'Invalid order total' }, { status: 400 });
    }

    if (order.razorpay_order_id) {
      return NextResponse.json({ id: order.razorpay_order_id, amount: amountInPaise, currency: 'INR', key_id });
    }

    const response = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${Buffer.from(`${key_id}:${key_secret}`).toString('base64')}`,
      },
      body: JSON.stringify({
        amount: amountInPaise,
        currency: 'INR',
        receipt: orderId,
        payment_capture: 1,
        notes: {
          order_id: orderId, // Include order ID for webhook lookup
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Razorpay error:', error);
      return NextResponse.json({ error: 'Failed to create Razorpay order' }, { status: 500 });
    }

    const data = await response.json();

    const { data: boundOrder, error: bindError } = await adminSupabase
      .from('orders')
      .update({ razorpay_order_id: data.id, updated_at: new Date().toISOString() })
      .eq('id', orderId)
      .is('razorpay_order_id', null)
      .select('razorpay_order_id')
      .maybeSingle();

    if (bindError) {
      console.error('Could not bind Razorpay order:', bindError);
      return NextResponse.json({ error: 'Failed to initialise payment' }, { status: 500 });
    }

    if (!boundOrder) {
      const { data: concurrentlyBoundOrder } = await adminSupabase
        .from('orders')
        .select('razorpay_order_id')
        .eq('id', orderId)
        .single();
      if (concurrentlyBoundOrder?.razorpay_order_id) {
        return NextResponse.json({ id: concurrentlyBoundOrder.razorpay_order_id, amount: amountInPaise, currency: 'INR', key_id });
      }
      return NextResponse.json({ error: 'Failed to initialise payment' }, { status: 500 });
    }

    return NextResponse.json({
      id: data.id,
      amount: data.amount,
      currency: data.currency,
      key_id,
    });
  } catch (error) {
    console.error('Error creating Razorpay order:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
