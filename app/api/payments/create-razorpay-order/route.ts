import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin-client';
import { validateDropshipOrderAvailability } from '@/lib/suppliers/orders';
import { paymentAmountInPaise, razorpayClient } from '@/lib/razorpay';

export const runtime = 'nodejs';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const orderId = body?.orderId;

    if (typeof orderId !== 'string' || !UUID_REGEX.test(orderId)) {
      return NextResponse.json({ error: 'Invalid order id' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const adminSupabase = createAdminClient();
    const { data: order, error: orderLookupError } = await adminSupabase
      .from('orders')
      .select('id, user_id, total, amount_due_now, status, payment_status, razorpay_order_id')
      .eq('id', orderId)
      .maybeSingle();

    if (orderLookupError) {
      console.error('Payment order lookup failed:', orderLookupError.code);
      return NextResponse.json({ error: 'Unable to load your order for payment. Please try again shortly.' }, { status: 503 });
    }
    if (!order || order.user_id !== user.id) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }
    if (order.status !== 'pending' || order.payment_status === 'success') {
      return NextResponse.json({ error: 'This order cannot be paid again' }, { status: 409 });
    }

    try {
      await validateDropshipOrderAvailability(orderId);
    } catch (availabilityError) {
      console.error('Checkout availability check failed:', availabilityError);
      return NextResponse.json({ error: 'We could not confirm the latest price and availability. Please refresh your cart and try again.' }, { status: 409 });
    }

    const key_id = process.env.RAZORPAY_KEY_ID;
    const key_secret = process.env.RAZORPAY_KEY_SECRET;

    if (!key_id || !key_secret) {
      return NextResponse.json({ error: 'Payment service is not configured' }, { status: 503 });
    }

    let amountInPaise: number;
    try { amountInPaise = paymentAmountInPaise(order.amount_due_now ?? order.total); } catch {
      return NextResponse.json({ error: 'Invalid order total' }, { status: 400 });
    }

    if (order.razorpay_order_id) {
      return NextResponse.json({ id: order.razorpay_order_id, order_id: order.razorpay_order_id, amount: amountInPaise, currency: 'INR', key_id });
    }

    let data;
    try {
      data = await razorpayClient().orders.create({
        amount: amountInPaise,
        currency: 'INR',
        receipt: orderId,
        notes: {
          order_id: orderId, // Include order ID for webhook lookup
        },
      });
    } catch (error: any) {
      // Never log an SDK error object: it may contain Basic Auth headers.
      console.error('Razorpay order creation failed:', error?.statusCode || 'network');
      return NextResponse.json({ error: 'Unable to initialise payment. Please try again shortly.' }, { status: error?.statusCode === 401 ? 401 : 500 });
    }

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
        return NextResponse.json({ id: concurrentlyBoundOrder.razorpay_order_id, order_id: concurrentlyBoundOrder.razorpay_order_id, amount: amountInPaise, currency: 'INR', key_id });
      }
      return NextResponse.json({ error: 'Failed to initialise payment' }, { status: 500 });
    }

    return NextResponse.json({
      id: data.id,
      order_id: data.id,
      amount: data.amount,
      currency: data.currency,
      key_id,
    });
  } catch (error) {
    console.error('Error creating Razorpay order:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
