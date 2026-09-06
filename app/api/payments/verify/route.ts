import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin-client';
import crypto from 'crypto';
import { dispatchDropshipOrder } from '@/lib/suppliers/orders';

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

    const expectedBuffer = Buffer.from(expectedSignature, 'hex');
    const receivedBuffer = Buffer.from(String(razorpay_signature), 'hex');
    if (receivedBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(expectedBuffer, receivedBuffer)) {
      console.error('Signature mismatch for order:', orderId);
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    // 4. Only reachable once the signature is genuinely verified.
    const adminSupabase = createAdminClient();

    const { data: existingOrder, error: fetchError } = await adminSupabase
      .from('orders')
      .select('id, user_id, status, email_sent, razorpay_order_id')
      .eq('id', orderId)
      .single();

    if (fetchError || !existingOrder) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (existingOrder.user_id !== user.id) {
      return NextResponse.json({ error: 'Order does not belong to this user' }, { status: 403 });
    }

    if (!existingOrder.razorpay_order_id || existingOrder.razorpay_order_id !== razorpay_order_id) {
      return NextResponse.json({ error: 'Payment does not match this order' }, { status: 400 });
    }

    // 5. Mark the order paid if it isn't already. This may have already
    //    happened via the razorpay-webhook (which often fires before this
    //    client-side callback runs) — that's fine, this is idempotent.
    if (existingOrder.status !== 'paid') {
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
    }

    const { data: userCart } = await adminSupabase
      .from('carts')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();
    if (userCart) await adminSupabase.from('cart_items').delete().eq('cart_id', userCart.id);

    // 6. Claim the right to send the confirmation email.
    //    This is an ATOMIC conditional update: it only succeeds (and only
    //    returns a row) if email_sent is still false at this exact moment.
    //    Whichever process — this route or the razorpay-webhook — wins this
    //    race is the one responsible for sending the email. The other one
    //    will see 0 rows affected and skip sending, so the email fires
    //    exactly once no matter which path reaches "paid" first.
    const { data: claimedOrder, error: claimError } = await adminSupabase
      .from('orders')
      .update({
        email_sent: true,
        email_sent_at: new Date().toISOString(),
      })
      .eq('id', orderId)
      .eq('email_sent', false)
      .select('id')
      .maybeSingle();

    if (claimError) {
      console.error('Error claiming email-send right:', claimError);
      // Don't fail the whole request over this — payment is already verified.
    }

    const wonEmailClaim = !!claimedOrder;

    // 7. Fetch full order details (needed for both the response and, if we
    //    won the claim, the email payload).
    const { data: order } = await adminSupabase
      .from('orders')
      .select(`*, items:order_items (*)`)
      .eq('id', orderId)
      .single();

    // Supplier submission is idempotent and recorded separately. Payment stays
    // successful even if a supplier is temporarily unavailable; admins can retry
    // failed dispatches from the supplier control centre.
    if (order?.items?.some((item: any) => item.supplier_id)) {
      try {
        await dispatchDropshipOrder(orderId);
      } catch (dispatchError) {
        console.error('Dropship dispatch queued for retry:', dispatchError);
      }
    }

    // 8. Send confirmation email via Edge Function — only if we won the
    //    claim above. Best-effort, non-blocking on failure.
    if (wonEmailClaim && order && process.env.NEXT_PUBLIC_SUPABASE_URL) {
      try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        const emailRes = await fetch(`${supabaseUrl}/functions/v1/send-order-email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${serviceRoleKey}`,
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

        if (!emailRes.ok) {
          const errText = await emailRes.text();
          console.error('send-order-email returned non-OK status:', emailRes.status, errText);
          // Release the claim so the webhook (or a retry) can still send it.
          await adminSupabase
            .from('orders')
            .update({ email_sent: false, email_sent_at: null })
            .eq('id', orderId);
        }
      } catch (emailError) {
        console.error('Failed to send order email:', emailError);
        console.error('Order items were:', JSON.stringify(order?.items));
        // Release the claim so it can be retried by the webhook path.
        await adminSupabase
          .from('orders')
          .update({ email_sent: false, email_sent_at: null })
          .eq('id', orderId);
      }
    }

    return NextResponse.json({ success: true, order, alreadyProcessed: existingOrder.status === 'paid' });
  } catch (error) {
    console.error('Error verifying payment:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
