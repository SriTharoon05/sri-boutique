'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams, useParams } from 'next/navigation';
import { useAuth } from '@/components/providers/auth-provider';
import { MainLayout } from '@/components/layout/main-layout';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Loader2, Package, MapPin, Phone, CreditCard, Truck, CheckCircle2, PackageOpen, Check } from 'lucide-react';
import { Order, OrderItem } from '@/types/database';
import Link from 'next/link';
import { PaymentSuccessOverlay } from '@/components/payment-success-overlay';

const statusSteps = [
  { key: 'pending', label: 'Order Placed', icon: Package },
  { key: 'paid', label: 'Payment Confirmed', icon: CreditCard },
  { key: 'shipped', label: 'Shipped', icon: Truck },
  { key: 'delivered', label: 'Delivered', icon: CheckCircle2 },
];

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  paid: 'bg-blue-100 text-blue-800',
  shipped: 'bg-purple-100 text-purple-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
  refunded: 'bg-gray-100 text-gray-800',
};

export default function OrderDetailPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const params = useParams();
  const orderId = params?.id as string | undefined;

  const [order, setOrder] = useState<(Order & { items: OrderItem[] }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [showSuccessOverlay, setShowSuccessOverlay] = useState(false);

  const successShownRef = useRef(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (searchParams.get('payment') === 'success' && !successShownRef.current) {
      successShownRef.current = true;
      setShowSuccessOverlay(true);

      const url = new URL(window.location.href);
      url.searchParams.delete('payment');
      router.replace(url.pathname + url.search, { scroll: false });
    }
  }, [searchParams, router]);

  useEffect(() => {
    async function fetchOrder() {
      if (!user || !orderId) return;

      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(orderId)) {
        console.error('Invalid order id in URL:', orderId);
        setNotFound(true);
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`/api/orders/${orderId}`);
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || 'Failed to fetch order');
        }

        setOrder(data.order);
      } catch (error) {
        console.error('Error fetching order:', error);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    }

    fetchOrder();
  }, [user, orderId]);

  if (authLoading || loading) {
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

  if (!order || notFound) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-12">
          <div className="text-center py-16">
            <PackageOpen className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
            <h2 className="font-display text-2xl font-medium mb-2">Order not found</h2>
            <Button asChild>
              <Link href="/account/orders">Back to Orders</Link>
            </Button>
          </div>
        </div>
      </MainLayout>
    );
  }

  const currentStatusIndex = statusSteps.findIndex(s => s.key === order.status);

  return (
    <MainLayout>
      <PaymentSuccessOverlay
        show={showSuccessOverlay}
        onClose={() => setShowSuccessOverlay(false)}
        orderNumber={order.order_number}
        codBalance={order.payment_method === 'cod' ? order.cod_balance : undefined}
      />

      <div className="container mx-auto px-4 py-12">
        <Button asChild variant="ghost" className="mb-6">
          <Link href="/account/orders">&larr; Back to Orders</Link>
        </Button>

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-display text-3xl font-semibold">
              Order {order.order_number}
            </h1>
            <p className="text-muted-foreground mt-1">
              Placed on {new Date(order.created_at).toLocaleDateString('en-IN', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>
          <Badge className={statusColors[order.status]}>
            {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
          </Badge>
        </div>

        {/* Order Status Timeline */}
        {order.status !== 'cancelled' && order.status !== 'refunded' && (
          <Card className="p-6 mb-8">
            <div className="flex items-start">
              {statusSteps.map((step, index) => {
                // A step is "reached" if the order's current status is at or
                // past it. Every reached step — including the current/final
                // one — shows the same solid green "done" styling. There is
                // no separate "in progress, still brown" state anymore: once
                // a step is reached, it's done.
                const isReached = index <= currentStatusIndex;
                const isLast = index === statusSteps.length - 1;

                return (
                  <div key={step.key} className="flex items-center flex-1 last:flex-none">
                    {/* Icon + label column */}
                    <div className="flex flex-col items-center min-w-[80px]">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors ${
                          isReached
                            ? 'bg-green-500 border-green-500 text-white'
                            : 'bg-muted border-muted text-muted-foreground'
                        }`}
                      >
                        {isReached ? (
                          <Check className="h-5 w-5" strokeWidth={3} />
                        ) : (
                          <step.icon className="h-5 w-5" />
                        )}
                      </div>
                      <p
                        className={`text-xs mt-2 text-center whitespace-nowrap ${
                          isReached ? 'font-medium text-foreground' : 'text-muted-foreground'
                        }`}
                      >
                        {step.label}
                      </p>
                    </div>

                    {/* Connector line to the next step — a normal flex
                        sibling, not an absolutely positioned overlay, so it
                        can never stretch over the icons. */}
                    {!isLast && (
                      <div
                        className={`h-0.5 flex-1 mx-2 mb-6 rounded-full transition-colors ${
                          index < currentStatusIndex ? 'bg-green-500' : 'bg-muted'
                        }`}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Order Items */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="p-6">
              <h2 className="font-display text-xl font-semibold mb-4">Order Items</h2>
              <div className="space-y-4">
                {order.items.map((item) => (
                  <div key={item.id} className="flex gap-4 py-4 border-b last:border-0">
                    <div className="flex-1">
                      <h3 className="font-medium">{item.product_name}</h3>
                      {item.variant_info && (
                        <p className="text-sm text-muted-foreground">
                          {(item.variant_info as any).color} / {(item.variant_info as any).size}
                        </p>
                      )}
                      <p className="text-sm text-muted-foreground">
                        Qty: {item.quantity}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">
                        ₹{(item.price_at_purchase * item.quantity).toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        ₹{item.price_at_purchase.toLocaleString()} each
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Shipping Address */}
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <MapPin className="h-5 w-5 text-primary" />
                <h2 className="font-display text-xl font-semibold">Shipping Address</h2>
              </div>
              <div className="text-sm space-y-1">
                <p className="font-medium">{(order.shipping_address as any).fullName}</p>
                <p>{(order.shipping_address as any).addressLine1}</p>
                {(order.shipping_address as any).addressLine2 && (
                  <p>{(order.shipping_address as any).addressLine2}</p>
                )}
                <p>
                  {(order.shipping_address as any).city}, {(order.shipping_address as any).state} - {(order.shipping_address as any).pincode}
                </p>
                <p>{(order.shipping_address as any).country}</p>
              </div>
            </Card>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <Card className="p-6 sticky top-24">
              <h2 className="font-display text-xl font-semibold mb-4">Order Summary</h2>

              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>₹{order.subtotal.toLocaleString()}</span>
                </div>

                {order.discount_amount > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Discount</span>
                    <span>-₹{order.discount_amount.toLocaleString()}</span>
                  </div>
                )}

                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Shipping</span>
                  <span>
                    {order.shipping_cost === 0 ? 'Free' : `₹${order.shipping_cost}`}
                  </span>
                </div>
              </div>

              <Separator className="my-4" />

              <div className="flex justify-between font-display text-lg font-semibold">
                <span>Total</span>
                <span>₹{order.total.toLocaleString()}</span>
              </div>

              <Separator className="my-4" />

              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">{order.payment_method === 'cod' ? 'COD advance payment status' : 'Payment Status'}</p>
                  {order.payment_method === 'cod' && <p className="text-sm mt-2">Online advance: ₹{order.amount_due_now}. Balance on delivery: ₹{order.cod_balance}. COD charge included: ₹{order.cod_fee}.</p>}
                  <Badge className={`mt-1 ${statusColors[order.payment_status]}`}>
                    {order.payment_status.charAt(0).toUpperCase() + order.payment_status.slice(1)}
                  </Badge>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <p className="font-medium">{order.phone}</p>
                </div>

                {order.payment_id && (
                  <div>
                    <p className="text-sm text-muted-foreground">Payment ID</p>
                    <p className="font-mono text-sm">{order.payment_id}</p>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
