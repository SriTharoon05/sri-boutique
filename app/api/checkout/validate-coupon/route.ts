import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json();

    if (!code || typeof code !== 'string' || code.length > 64) {
      return NextResponse.json({ error: 'Invalid coupon code' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Sign in to apply a coupon' }, { status: 401 });

    const { data: cart } = await supabase
      .from('carts')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();
    if (!cart) return NextResponse.json({ error: 'Cart not found' }, { status: 400 });

    const { data: items } = await supabase
      .from('cart_items')
      .select('quantity, variant:product_variants(price_override, product:products(base_price))')
      .eq('cart_id', cart.id);

    const subtotal = (items || []).reduce((sum, item: any) => {
      const product = Array.isArray(item.variant?.product) ? item.variant.product[0] : item.variant?.product;
      const price = item.variant?.price_override ?? product?.base_price ?? 0;
      return sum + Number(price) * item.quantity;
    }, 0);

    const { data: coupon, error } = await supabase
      .from('coupons')
      .select('*')
      .eq('code', code.toUpperCase())
      .eq('is_active', true)
      .maybeSingle();

    if (error || !coupon) {
      return NextResponse.json({ error: 'Invalid coupon code' }, { status: 400 });
    }

    // Check expiry
    if (coupon.expiry_date && new Date(coupon.expiry_date) <= new Date()) {
      return NextResponse.json({ error: 'This coupon has expired' }, { status: 400 });
    }

    // Check minimum order value
    if (subtotal < coupon.min_order_value) {
      return NextResponse.json({
        error: `Minimum order value of ₹${coupon.min_order_value.toLocaleString()} required`,
      }, { status: 400 });
    }

    // Check usage limit
    if (coupon.usage_limit && coupon.times_used >= coupon.usage_limit) {
      return NextResponse.json({ error: 'This coupon has reached its usage limit' }, { status: 400 });
    }

    // Calculate discount
    let discount = 0;
    if (coupon.discount_type === 'percentage') {
      discount = Math.round(subtotal * (coupon.discount_value / 100));
    } else {
      discount = coupon.discount_value;
    }
    discount = Math.min(discount, subtotal);

    return NextResponse.json({
      valid: true,
      discount,
      couponId: coupon.id,
      couponCode: coupon.code,
    });
  } catch (error) {
    console.error('Coupon validation error:', error);
    return NextResponse.json({ error: 'Failed to validate coupon' }, { status: 500 });
  }
}
