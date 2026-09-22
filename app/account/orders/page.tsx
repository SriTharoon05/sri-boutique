'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/auth-provider';
import { MainLayout } from '@/components/layout/main-layout';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Package, Loader2, Eye } from 'lucide-react';
import { Order, OrderItem } from '@/types/database';
import Link from 'next/link';

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  paid: 'bg-blue-100 text-blue-800',
  shipped: 'bg-purple-100 text-purple-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
  refunded: 'bg-gray-100 text-gray-800',
};

export default function OrdersPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState<(Order & { items: OrderItem[] })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login?redirectTo=/account/orders');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    async function fetchOrders() {
      if (!user) return;

      try {
        const res = await fetch('/api/orders');
        const data = await res.json();
        setOrders(data.orders || []);
      } catch (error) {
        console.error('Error fetching orders:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchOrders();
  }, [user]);

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

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-12">
        <h1 className="font-display text-3xl font-semibold mb-8">My Orders</h1>

        {orders.length === 0 ? (
          <div className="text-center py-16">
            <Package className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
            <h2 className="font-display text-2xl font-medium mb-2">No orders yet</h2>
            <p className="text-muted-foreground mb-6">
              You haven&apos;t placed any orders yet. Start shopping to see your orders here.
            </p>
            <Button asChild>
              <Link href="/">Start Shopping</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <Card key={order.id} className="p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <span className="font-display font-semibold">
                        {order.order_number}
                      </span>
                      <Badge className={statusColors[order.status]}>
                        {order.payment_method === 'cod' && order.status === 'paid' ? 'COD advance paid' : order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {new Date(order.created_at).toLocaleDateString('en-IN', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                      {' • '}
                      {order.items.length} {order.items.length === 1 ? 'item' : 'items'}
                    </p>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Total</p>
                      <p className="font-display font-semibold">
                        ₹{order.total.toLocaleString()}
                      </p>
                    </div>
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/account/orders/${order.id}`}>
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </Link>
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
