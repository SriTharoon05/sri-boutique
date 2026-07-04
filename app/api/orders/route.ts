import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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

    const body = await request.json();
    const { shippingAddress, phone, couponId } = body;

    if (!shippingAddress || !phone) {
      return NextResponse.json({ error: 'Missing shipping address or phone' }, { status: 400 });
    }

    // Get user's cart
    const { data: cart, error: cartError } = await supabase
      .from('carts')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (cartError || !cart) {
      return NextResponse.json({ error: 'Cart not found' }, { status: 400 });
    }

    // Get cart items with product details
    const { data: cartItems, error: itemsError } = await supabase
      .from('cart_items')
      .select(`
        *,
        variant:product_variants (
          *,
          product:products (*)
        )
      `)
      .eq('cart_id', cart.id);

    if (itemsError || !cartItems || cartItems.length === 0) {
      return NextResponse.json({ error: 'Cart is empty' }, { status: 400 });
    }

    // Calculate totals
    let subtotal = 0;
    const orderItems = cartItems.map((item) => {
      const price = item.variant.price_override ?? item.variant.product?.base_price ?? 0;
      subtotal += price * item.quantity;

      return {
        variant_id: item.variant_id,
        product_name: item.variant.product?.name,
        variant_info: {
          color: item.variant.color,
          size: item.variant.size,
        },
        quantity: item.quantity,
        price_at_purchase: price,
      };
    });

    let discountAmount = 0;

    // Validate and apply coupon if provided
    if (couponId) {
      const { data: coupon } = await supabase
        .from('coupons')
        .select('*')
        .eq('id', couponId)
        .single();

      if (coupon) {
        if (coupon.discount_type === 'percentage') {
          discountAmount = Math.round(subtotal * (coupon.discount_value / 100));
        } else {
          discountAmount = coupon.discount_value;
        }

        // Increment coupon usage
        await supabase
          .from('coupons')
          .update({ times_used: (coupon.times_used || 0) + 1 })
          .eq('id', couponId);
      }
    }

    const shippingCost = subtotal > 2000 ? 0 : 99;
    const total = subtotal - discountAmount + shippingCost;

    // Create order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        user_id: user.id,
        subtotal,
        shipping_cost: shippingCost,
        discount_amount: discountAmount,
        total,
        coupon_id: couponId || null,
        shipping_address: shippingAddress,
        phone,
        status: 'pending',
        payment_status: 'pending',
      })
      .select()
      .single();

    if (orderError || !order) {
      console.error('Order creation error:', orderError);
      return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
    }

    // Create order items
    const { error: itemsInsertError } = await supabase
      .from('order_items')
      .insert(orderItems.map((item) => ({ ...item, order_id: order.id })));

    if (itemsInsertError) {
      console.error('Order items creation error:', itemsInsertError);
    }

    // Clear cart
    await supabase.from('cart_items').delete().eq('cart_id', cart.id);

    return NextResponse.json({ order });
  } catch (error) {
    console.error('Error creating order:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
