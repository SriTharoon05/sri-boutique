'use client';
import { isPaymentTestCart } from '@/lib/payment-test-product';
import { storefrontSlug } from '@/lib/storefront-brand';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { useCart } from '@/components/providers/cart-provider';
import { useAuth } from '@/components/providers/auth-provider';
import { MainLayout } from '@/components/layout/main-layout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Trash2, Minus, Plus, ShoppingBag, ArrowRight, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { getDisplayProductImage } from '@/lib/mock-images';

export default function CartPage() {
  const { items, itemCount, subtotal, loading, updateQuantity, removeItem, clearCart } = useCart();
  const { user } = useAuth();
  const [couponCode, setCouponCode] = useState('');
  const [applyingCoupon, setApplyingCoupon] = useState(false);
  const [discount, setDiscount] = useState(0);
  const [couponApplied, setCouponApplied] = useState(false);

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) {
      toast.error('Please enter a coupon code');
      return;
    }
    if (!user) {
      toast.error('Sign in before applying a coupon');
      return;
    }

    setApplyingCoupon(true);
    try {
      const res = await fetch('/api/checkout/validate-coupon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: couponCode }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Invalid coupon');
        return;
      }

      setDiscount(data.discount);
      setCouponApplied(true);
      toast.success(`Coupon applied! You save ₹${data.discount}`);
    } catch {
      toast.error('Failed to apply coupon');
    } finally {
      setApplyingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setDiscount(0);
    setCouponApplied(false);
    setCouponCode('');
  };

  const shipping = isPaymentTestCart(items) || subtotal > 2000 ? 0 : 99;
  const total = subtotal - discount + shipping;

  if (loading) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-12">
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-12">
        <h1 className="font-display text-3xl font-semibold mb-8">Shopping Cart</h1>

        {items.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16"
          >
            <ShoppingBag className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
            <h2 className="font-display text-2xl font-medium mb-2">Your cart is empty</h2>
            <p className="text-muted-foreground mb-6">
              Looks like you haven&apos;t added anything to your cart yet.
            </p>
            <Button asChild size="lg">
              <Link href="/">
                Continue Shopping
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </motion.div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-4">
              <AnimatePresence mode="popLayout">
                {items.map((item) => {
                  const price = item.variant.price_override ?? item.variant.product?.base_price ?? 0;

                  return (
                    <motion.div
                      key={item.id}
                      layout
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ duration: 0.3 }}
                    >
                      <Card className="p-4 md:p-6">
                        <div className="flex gap-4">
                          <Link
                            href={`/product/${storefrontSlug(item.variant.product?.slug)}`}
                            className="w-24 h-32 md:w-32 md:h-40 flex-shrink-0 relative rounded-md overflow-hidden bg-muted"
                          >
                            <Image
                                src={getDisplayProductImage(item.variant.product?.slug || item.variant_id, item.variant.image_urls?.[0])}
                                alt={item.variant.product?.name || 'Product'}
                                fill
                                sizes="128px"
                                className="object-cover"
                              />
                          </Link>

                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between">
                              <div>
                                <Link
                                  href={`/product/${storefrontSlug(item.variant.product?.slug)}`}
                                  className="font-medium hover:text-primary transition-colors line-clamp-2"
                                >
                                  {item.variant.product?.name}
                                </Link>
                                <p className="text-sm text-muted-foreground mt-1">
                                  {item.variant.color} / {item.variant.size}
                                </p>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-muted-foreground hover:text-destructive"
                                onClick={() => {
                                  removeItem(item.id);
                                  toast.success('Item removed from cart');
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>

                            <div className="flex items-center justify-between mt-4">
                              <div className="flex items-center border rounded-md">
                                <button
                                  className="p-2 hover:bg-muted"
                                  aria-label="Decrease quantity"
                                  onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                >
                                  <Minus className="h-4 w-4" />
                                </button>
                                <span className="w-10 text-center">{item.quantity}</span>
                                <button
                                  className="p-2 hover:bg-muted"
                                  aria-label="Increase quantity"
                                  onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                >
                                  <Plus className="h-4 w-4" />
                                </button>
                              </div>

                              <div className="text-right">
                                <p className="font-display text-lg font-semibold">
                                  ₹{(price * item.quantity).toLocaleString()}
                                </p>
                                {item.quantity > 1 && (
                                  <p className="text-xs text-muted-foreground">
                                    ₹{price?.toLocaleString()} each
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  );
                })}
              </AnimatePresence>

              <Button
                variant="outline"
                className="mt-4"
                onClick={() => {
                  clearCart();
                  toast.success('Cart cleared');
                }}
              >
                Clear Cart
              </Button>
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <Card className="p-6 sticky top-24">
                <h2 className="font-display text-xl font-semibold mb-6">Order Summary</h2>

                {/* Coupon Code */}
                <div className="mb-6">
                  <label className="text-sm font-medium mb-2 block">Coupon Code</label>
                  {couponApplied ? (
                    <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-md">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-green-700">{couponCode}</span>
                        <span className="text-xs text-green-600">Applied</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs text-green-700"
                        onClick={handleRemoveCoupon}
                      >
                        Remove
                      </Button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <Input
                        placeholder="Enter code"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      />
                      <Button
                        variant="outline"
                        onClick={handleApplyCoupon}
                        disabled={applyingCoupon}
                      >
                        {applyingCoupon ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          'Apply'
                        )}
                      </Button>
                    </div>
                  )}
                </div>

                <Separator className="mb-4" />

                <div className="space-y-3 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal ({itemCount} items)</span>
                    <span>₹{subtotal.toLocaleString()}</span>
                  </div>

                  {discount > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Discount</span>
                      <span>-₹{discount.toLocaleString()}</span>
                    </div>
                  )}

                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Shipping</span>
                    <span>
                      {shipping === 0 ? (
                        <span className="text-green-600">Free</span>
                      ) : (
                        `₹${shipping}`
                      )}
                    </span>
                  </div>
                </div>

                <Separator className="mb-4" />

                <div className="flex justify-between text-lg font-semibold mb-6">
                  <span>Total</span>
                  <span>₹{total.toLocaleString()}</span>
                </div>

                <Button asChild size="lg" className="w-full">
                  <Link href={couponApplied ? `/checkout?coupon=${encodeURIComponent(couponCode)}` : '/checkout'}>
                    Proceed to Checkout
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>

                <Button asChild variant="outline" size="lg" className="w-full mt-3">
                  <Link href="/">Continue Shopping</Link>
                </Button>

                <p className="text-xs text-muted-foreground text-center mt-4">
                  Free shipping on orders above ₹2,000
                </p>
              </Card>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
