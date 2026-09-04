'use client';

export const dynamic = 'force-dynamic';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuth } from '@/components/providers/auth-provider';
import { useCart } from '@/components/providers/cart-provider';
import { MainLayout } from '@/components/layout/main-layout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Loader2, CreditCard, MapPin } from 'lucide-react';
import { toast } from 'sonner';

interface FormData {
  fullName: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  phone: string;
}

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => {
      open: () => void;
      on: (event: string, callback: () => void) => void;
    };
  }
}

const initialFormData: FormData = {
  fullName: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  state: '',
  pincode: '',
  country: 'India',
  phone: '',
};

export default function CheckoutPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const { items, subtotal, loading: cartLoading, refreshCart } = useCart();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [formErrors, setFormErrors] = useState<Partial<FormData>>({});
  const [submitting, setSubmitting] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [discount, setDiscount] = useState(0);
  const [couponId, setCouponId] = useState<string | null>(null);

  // Tracks whether checkout has already succeeded, so the "cart is
  // empty, redirect to /cart" effect below knows to stand down instead of
  // hijacking navigation right after a successful payment (which naturally
  // empties the cart via refreshCart()).
  const [paymentCompleted, setPaymentCompleted] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login?redirectTo=/checkout');
    }

    if (profile) {
      setFormData(prev => ({
        ...prev,
        fullName: profile.full_name || '',
        phone: profile.phone || '',
      }));
    }
  }, [user, profile, authLoading, router]);

  useEffect(() => {
    // Guard: don't redirect to /cart if we just successfully completed
    // payment — the cart is expected to be empty at that point, and we're
    // already navigating to the order confirmation page instead.
    if (items.length === 0 && !cartLoading && !paymentCompleted) {
      router.push('/cart');
    }
  }, [items, cartLoading, router, paymentCompleted]);

  const shipping = subtotal > 2000 ? 0 : 99;
  const total = subtotal - discount + shipping;

  useEffect(() => {
    const code = searchParams.get('coupon');
    if (!code || !user || cartLoading) return;

    fetch('/api/checkout/validate-coupon', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    })
      .then(async (response) => ({ response, data: await response.json() }))
      .then(({ response, data }) => {
        if (!response.ok) throw new Error(data.error || 'Coupon is no longer valid');
        setDiscount(data.discount);
        setCouponId(data.couponId);
      })
      .catch((error) => toast.error(error.message));
  }, [searchParams, subtotal, user, cartLoading]);

  const validateForm = (): boolean => {
    const errors: Partial<FormData> = {};

    if (!formData.fullName.trim()) errors.fullName = 'Full name is required';
    if (!formData.addressLine1.trim()) errors.addressLine1 = 'Address is required';
    if (!formData.city.trim()) errors.city = 'City is required';
    if (!formData.state.trim()) errors.state = 'State is required';
    if (!formData.pincode.trim()) errors.pincode = 'Pincode is required';
    else if (!/^\d{6}$/.test(formData.pincode)) errors.pincode = 'Invalid pincode';
    if (!formData.phone.trim()) errors.phone = 'Phone number is required';
    else if (!/^\d{10}$/.test(formData.phone)) errors.phone = 'Invalid phone number';

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreateOrder = async () => {
    if (!validateForm()) {
      toast.error('Please fill all required fields correctly');
      return;
    }

    setSubmitting(true);

    try {
      let currentOrderId = orderId;
      if (!currentOrderId) {
        const orderRes = await fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            shippingAddress: {
              fullName: formData.fullName,
              addressLine1: formData.addressLine1,
              addressLine2: formData.addressLine2,
              city: formData.city,
              state: formData.state,
              pincode: formData.pincode,
              country: formData.country,
            },
            phone: formData.phone,
            couponId,
          }),
        });

        const orderData = await orderRes.json();
        if (!orderRes.ok) throw new Error(orderData.error || 'Failed to create order');
        currentOrderId = orderData.order.id as string;
        setOrderId(currentOrderId);
      }
      if (!currentOrderId) throw new Error('Could not create order');
      const verifiedOrderId = currentOrderId;

      const paymentRes = await fetch('/api/payments/create-razorpay-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: currentOrderId,
        }),
      });

      const paymentData = await paymentRes.json();

      if (!paymentRes.ok) {
        throw new Error(paymentData.error || 'Failed to create payment order');
      }

      const options = {
          key: paymentData.key_id,
          amount: paymentData.amount,
          currency: 'INR',
          name: 'Sri Boutique',
          description: 'Order Payment',
          order_id: paymentData.id,
          handler: async (response: any) => {
            await verifyPayment(response, verifiedOrderId);
          },
          prefill: {
            name: formData.fullName,
            email: user?.email,
            contact: formData.phone,
          },
          theme: {
            color: '#8B3A3A',
          },
        };

        // @ts-ignore - Razorpay is loaded via script
      if (!window.Razorpay) throw new Error('Payment service is still loading. Please try again.');
      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', () => toast.error('Payment failed. Your order has not been charged.'));
      rzp.open();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create order');
    } finally {
      setSubmitting(false);
    }
  };

  const verifyPayment = async (response: any, currentOrderId: string) => {
    try {
      const res = await fetch('/api/payments/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          razorpay_order_id: response.razorpay_order_id,
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_signature: response.razorpay_signature,
          orderId: currentOrderId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Payment verification failed');
      }

      await handlePaymentSuccess(currentOrderId);
    } catch (error: any) {
      toast.error(error.message || 'Payment verification failed');
    }
  };

  const handlePaymentSuccess = async (currentOrderId: string) => {
    // IMPORTANT: set this FIRST, synchronously, before refreshCart() or the
    // navigation — this is what stops the empty-cart effect from racing
    // in and redirecting to /cart instead of the order confirmation page.
    setPaymentCompleted(true);

    // NOTE: no toast here. The success moment is now shown exactly once,
    // as a premium animated checkmark overlay, on the order confirmation
    // page (triggered by the ?payment=success query param below). Showing
    // it here too was one of the sources of the duplicate "Payment
    // successful!" messages.
    refreshCart();
    router.push(`/account/orders/${currentOrderId}?payment=success`);
  };

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);
  }, []);

  if (authLoading || cartLoading) {
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
        <h1 className="font-display text-3xl font-semibold mb-8">Checkout</h1>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <MapPin className="h-5 w-5 text-primary" />
                <h2 className="font-display text-xl font-medium">Shipping Address</h2>
              </div>

              <div className="grid gap-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name *</Label>
                    <Input
                      id="fullName"
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      className={formErrors.fullName ? 'border-destructive' : ''}
                    />
                    {formErrors.fullName && (
                      <p className="text-sm text-destructive">{formErrors.fullName}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone *</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className={formErrors.phone ? 'border-destructive' : ''}
                    />
                    {formErrors.phone && (
                      <p className="text-sm text-destructive">{formErrors.phone}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="addressLine1">Address Line 1 *</Label>
                  <Input
                    id="addressLine1"
                    placeholder="Street address, P.O. box, company name"
                    value={formData.addressLine1}
                    onChange={(e) => setFormData({ ...formData, addressLine1: e.target.value })}
                    className={formErrors.addressLine1 ? 'border-destructive' : ''}
                  />
                  {formErrors.addressLine1 && (
                    <p className="text-sm text-destructive">{formErrors.addressLine1}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="addressLine2">Address Line 2</Label>
                  <Input
                    id="addressLine2"
                    placeholder="Apartment, suite, unit, building, floor, etc."
                    value={formData.addressLine2}
                    onChange={(e) => setFormData({ ...formData, addressLine2: e.target.value })}
                  />
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">City *</Label>
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className={formErrors.city ? 'border-destructive' : ''}
                    />
                    {formErrors.city && (
                      <p className="text-sm text-destructive">{formErrors.city}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="state">State *</Label>
                    <Input
                      id="state"
                      value={formData.state}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                      className={formErrors.state ? 'border-destructive' : ''}
                    />
                    {formErrors.state && (
                      <p className="text-sm text-destructive">{formErrors.state}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="pincode">Pincode *</Label>
                    <Input
                      id="pincode"
                      value={formData.pincode}
                      onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                      className={formErrors.pincode ? 'border-destructive' : ''}
                    />
                    {formErrors.pincode && (
                      <p className="text-sm text-destructive">{formErrors.pincode}</p>
                    )}
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <CreditCard className="h-5 w-5 text-primary" />
                <h2 className="font-display text-xl font-medium">Payment</h2>
              </div>

              <p className="text-muted-foreground">
                You will be redirected to Razorpay to complete your payment securely.
                We accept all major credit cards, debit cards, UPI, and net banking.
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                <div className="px-3 py-1 bg-muted rounded text-sm">Visa</div>
                <div className="px-3 py-1 bg-muted rounded text-sm">Mastercard</div>
                <div className="px-3 py-1 bg-muted rounded text-sm">UPI</div>
                <div className="px-3 py-1 bg-muted rounded text-sm">Net Banking</div>
              </div>
            </Card>
          </div>

          <div className="lg:col-span-1">
            <Card className="p-6 sticky top-24">
              <h2 className="font-display text-xl font-semibold mb-6">Order Summary</h2>

              <div className="space-y-4 mb-6">
                {items.map((item) => {
                  const price = item.variant.price_override ?? item.variant.product?.base_price ?? 0;
                  return (
                    <div key={item.id} className="flex gap-4">
                      <div className="w-16 h-20 bg-muted rounded flex-shrink-0 relative">
                        {item.variant.image_urls?.[0] && (
                          <Image
                            src={item.variant.image_urls[0]}
                            alt={item.variant.product?.name || 'Product'}
                            fill
                            sizes="64px"
                            className="object-cover rounded"
                          />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm line-clamp-1">
                          {item.variant.product?.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {item.variant.color} / {item.variant.size}
                        </p>
                        <p className="text-sm mt-1">Qty: {item.quantity}</p>
                      </div>
                      <p className="font-medium">
                        ₹{(price * item.quantity).toLocaleString()}
                      </p>
                    </div>
                  );
                })}
              </div>

              <Separator className="mb-4" />

              <div className="space-y-3 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
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

              <Button
                size="lg"
                className="w-full"
                onClick={handleCreateOrder}
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  `Pay ₹${total.toLocaleString()}`
                )}
              </Button>

              <p className="text-xs text-muted-foreground text-center mt-4">
                By placing this order, you agree to our Terms of Service and Privacy Policy.
              </p>
            </Card>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
