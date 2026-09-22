import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getVendorDailyQuota } from '@/lib/suppliers/daily-quota';
import { checkoutAddressSchema } from '@/lib/checkout-address';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: orders, error } = await supabase
      .from('orders')
      .select(`
        *,
        items:order_items (*)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
    }

    return NextResponse.json({ orders });
  } catch (error) {
    console.error('Error fetching orders:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: commerce } = await supabase.from('commerce_settings').select('checkout_enabled').eq('id', true).maybeSingle();
    if (commerce && !commerce.checkout_enabled) {
      return NextResponse.json({ error: 'Checkout is temporarily paused. Please try again later.' }, { status: 503 });
    }

    // Before the transactional trigger runs, fail closed if its migration is
    // missing. Own-stock-only carts do not depend on vendor quota availability.
    const { data: carts, error: cartError } = await supabase.from('carts').select('id').eq('user_id', user.id);
    if (cartError) return NextResponse.json({ error: 'Unable to check cart' }, { status: 503 });
    const { data: items, error: itemError } = await supabase.from('cart_items').select('variant:product_variants(product:products(source_type))').in('cart_id', (carts || []).map(c => c.id));
    if (itemError) return NextResponse.json({ error: 'Unable to check cart' }, { status: 503 });
    const hasVendor = (items || []).some((item: any) => {
      const variant = Array.isArray(item.variant) ? item.variant[0] : item.variant;
      const product = Array.isArray(variant?.product) ? variant.product[0] : variant?.product;
      return product?.source_type === 'dropship';
    });
    if (hasVendor) {
      const quota = await getVendorDailyQuota();
      if (!quota.ready || quota.remaining <= 0) return NextResponse.json({ error: quota.ready ? 'These products are unavailable today. Please try again after midnight IST.' : 'Ordering is temporarily unavailable.' }, { status: 409 });
    }
    const body = await request.json();
    const { shippingAddress, phone, couponId, paymentMethod = 'online' } = body;
    if (!['online', 'cod'].includes(paymentMethod)) return NextResponse.json({ error: 'Invalid payment method' }, { status: 400 });

    if (!shippingAddress || !phone) {
      return NextResponse.json({ error: 'Missing shipping address or phone' }, { status: 400 });
    }
    const address = checkoutAddressSchema.safeParse(shippingAddress);
    if (!address.success || typeof phone !== 'string' || !/^[6-9]\d{9}$/.test(phone)) return NextResponse.json({ error: 'Enter a valid Indian mobile number and complete delivery address' }, { status: 400 });

    const { data: order, error: orderError } = await (supabase as any).rpc('create_checkout_order', {
      p_shipping_address: address.data,
      p_phone: phone,
      p_coupon_id: couponId || null,
      p_payment_method: paymentMethod,
    });

    if (orderError || !order) {
      if (orderError?.message?.startsWith('Payment test item is available')) return NextResponse.json({ error: 'This item is restricted to administrators.' }, { status: 403 });
      if (orderError?.message?.startsWith('Buy the payment test item')) return NextResponse.json({ error: orderError.message }, { status: 400 });
      if (orderError?.message?.startsWith('COD')) return NextResponse.json({ error: orderError.message }, { status: 409 });
      if (orderError?.message?.includes('Vendor products are out of stock')) return NextResponse.json({ error: 'These products are unavailable today. Please try again after midnight IST.' }, { status: 409 });
      console.error('Order creation error:', orderError);
      return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
    }

    return NextResponse.json({ order });
  } catch (error) {
    console.error('Error creating order:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
