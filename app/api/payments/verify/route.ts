import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin-client';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId } = await request.json();

    // 1. Basic input validation
    if (!orderId) {
      return NextResponse.json({ error: 'Missing orderId' }, { status: 400 });
    }

    // 2. Confirm the request is coming from a logged-in user (identity check only —
    //    authorization to mark the order paid comes from the signature check below,
    //    not from this session).
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 3. MANDATORY signature verification — no fallback path, no silent skip.
    //    If any of these fields are missing, reject outright.
    const key_secret = process.env.RAZORPAY_KEY_SECRET;

    if (!key_secret) {
      console.error('RAZORPAY_KEY_SECRET is not configured on the server');
      return NextResponse.json({ error: 'Payment verification not configured' }, { status: 500 });
    }

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json({ error: 'Missing payment verification data' }, { status: 400 });
    }

    const body = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto
      .createHmac('sha256', key_secret)
      .update(body)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      console.error('Signature mismatch for order:', orderId);
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    // 4. Only reachable once the signature is genuinely verified.
    //    Use the ADMIN (service-role) client here — this bypasses RLS,
    //    which is fine because trust is established by the signature check
    //    above, not by the caller's own row-level permissions.
    const adminSupabase = createAdminClient();

    // 4a. Confirm the order actually belongs to this user AND is still pending,
    //     before touching it — prevents replay against someone else's order
    //     or double-processing an already-paid order.
    const { data: existingOrder, error: fetchError } = await adminSupabase
      .from('orders')
      .select('id, user_id, status')
      .eq('id', orderId)
      .single();

    if (fetchError || !existingOrder) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (existingOrder.user_id !== user.id) {
      return NextResponse.json({ error: 'Order does not belong to this user' }, { status: 403 });
    }

    if (existingOrder.status === 'paid') {
      // Already processed (e.g. webhook got there first) — treat as success, don't error.
      return NextResponse.json({ success: true, alreadyProcessed: true });
    }

    // 5. Update order status — real payment ID only, no demo fallback.
    const { error: updateError } = await adminSupabase
      .from('orders')
      .update({
        status: 'paid',
        payment_status: 'success',
        payment_id: razorpay_payment_id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId);

    if (updateError) {
      console.error('Error updating order:', updateError);
      return NextResponse.json({ error: 'Failed to update order' }, { status: 500 });
    }

    // 6. Fetch full order details for the confirmation email
    const { data: order } = await adminSupabase
      .from('orders')
      .select(`*, items:order_items (*)`)
      .eq('id', orderId)
      .single();

    // 7. Send confirmation email via Edge Function (best-effort, non-blocking on failure)
    if (order && process.env.NEXT_PUBLIC_SUPABASE_URL) {
      try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        await fetch(`${supabaseUrl}/functions/v1/send-order-email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${supabaseAnonKey}`,
          },
          body: JSON.stringify({
            to: user.email,
            subject: `Order Confirmed - ${order.order_number}`,
            orderNumber: order.order_number,
            total: order.total,
            items: order.items.map((item: any) => ({
              name: item.product_name,
              quantity: item.quantity,
              price: item.price_at_purchase,
            })),
            shippingAddress: order.shipping_address,
          }),
        });
      } catch (emailError) {
        console.error('Failed to send order email:', emailError);
        // Don't fail the payment verification if email fails
      }
    }

    return NextResponse.json({ success: true, order });
  } catch (error) {
    console.error('Error verifying payment:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}