import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin-client';
import { z } from 'zod';
import { verifyCheckoutSignature } from '@/lib/razorpay';
import { dispatchDropshipOrder } from '@/lib/suppliers/orders';

export const runtime = 'nodejs';
const verificationSchema = z.object({
  orderId: z.string().uuid(),
  razorpay_order_id: z.string().regex(/^order_[a-zA-Z0-9]+$/).max(100),
  razorpay_payment_id: z.string().regex(/^pay_[a-zA-Z0-9]+$/).max(100),
  razorpay_signature: z.string().regex(/^[a-f0-9]{64}$/i),
});

export async function POST(request: NextRequest) {
  try {
    const input = verificationSchema.safeParse(await request.json().catch(() => null));
    if (!input.success) return NextResponse.json({ error: 'Missing or invalid payment verification data' }, { status: 400 });
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId } = input.data;

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

    if (!key_secret || !process.env.RAZORPAY_KEY_ID) {
      console.error('RAZORPAY_KEY_SECRET is not configured on the server');
      return NextResponse.json({ error: 'Payment verification not configured' }, { status: 500 });
    }

    // Bind verification to our stored order, never a client-supplied amount.
    const adminSupabase = createAdminClient();

    const { data: existingOrder, error: fetchError } = await adminSupabase
      .from('orders')
      .select('id, user_id, status, email_sent, razorpay_order_id, total, amount_due_now')
      .eq('id', orderId)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Payment verification order lookup failed:', fetchError.code);
      return NextResponse.json({ error: 'Unable to load your payment status. Please retry verification shortly.' }, { status: 503 });
    }
    if (!existingOrder) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (existingOrder.user_id !== user.id) {
      return NextResponse.json({ error: 'Order does not belong to this user' }, { status: 403 });
    }

    if (!existingOrder.razorpay_order_id || existingOrder.razorpay_order_id !== razorpay_order_id) {
      return NextResponse.json({ error: 'Payment does not match this order' }, { status: 400 });
    }

    if (!verifyCheckoutSignature(existingOrder.razorpay_order_id, razorpay_payment_id, razorpay_signature, key_secret)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }
    if (['cancelled', 'refunded'].includes(existingOrder.status)) {
      return NextResponse.json({ error: 'This order is closed. Contact support if a payment was deducted.' }, { status: 409 });
    }

    // 5. Mark the order paid if it isn't already. This may have already
    //    happened via the razorpay-webhook (which often fires before this
    //    client-side callback runs) — that's fine, this is idempotent.
    const paymentResponse = await fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(razorpay_payment_id)}`, {
      headers: { Authorization: `Basic ${Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${key_secret}`).toString('base64')}` },
      cache: 'no-store', signal: AbortSignal.timeout(15000),
    });
    if (!paymentResponse.ok) return NextResponse.json({ error: 'Unable to verify captured payment' }, { status: 503 });
    const captured = await paymentResponse.json();
    if (captured.status !== 'captured' || captured.order_id !== razorpay_order_id || captured.currency !== 'INR' || captured.amount !== Math.round(Number(existingOrder.amount_due_now ?? existingOrder.total) * 100)) {
      return NextResponse.json({ error: 'Payment is not captured for the expected amount' }, { status: 409 });
    }
    if (existingOrder.status === 'pending') {
      const { error: updateError } = await adminSupabase
        .from('orders')
        .update({
          status: 'paid',
          payment_status: 'success',
          payment_id: razorpay_payment_id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderId).eq('status', 'pending');

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
    // Repeated verification must not delete a new shopping cart.
    if (userCart && existingOrder.status === 'pending') await adminSupabase.from('cart_items').delete().eq('cart_id', userCart.id);

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
            paymentMethod: order.payment_method,
            amountPaid: order.amount_due_now ?? order.total,
            codBalance: order.cod_balance,
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
