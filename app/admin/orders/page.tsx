'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/auth-provider';
import { createClient } from '@/lib/supabase/client';
import { MainLayout } from '@/components/layout/main-layout';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import { Loader2, Search, Eye } from 'lucide-react';
import { Order, OrderItem } from '@/types/database';
import { toast } from 'sonner';

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  paid: 'bg-blue-100 text-blue-800',
  shipped: 'bg-purple-100 text-purple-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
  refunded: 'bg-gray-100 text-gray-800',
};

export default function AdminOrdersPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<(Order & { items: OrderItem[] })[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<(Order & { items: OrderItem[] })[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState<(Order & { items: OrderItem[] }) | null>(null);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (!authLoading) {
      if (!user || profile?.role !== 'admin') {
        router.push('/');
      }
    }
  }, [user, profile, authLoading, router]);

  const fetchOrders = useCallback(async () => {
    if (!user || profile?.role !== 'admin') return;

    const supabase = createClient();
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        items:order_items (*)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching orders:', error);
    } else {
      setOrders(data || []);
      setFilteredOrders(data || []);
    }
    setLoading(false);
  }, [user, profile?.role]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    let filtered = orders;

    if (search) {
      filtered = filtered.filter(o =>
        o.order_number.toLowerCase().includes(search.toLowerCase()) ||
        o.phone.includes(search)
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(o => o.status === statusFilter);
    }

    setFilteredOrders(filtered);
  }, [search, statusFilter, orders]);

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    setUpdating(true);
    const supabase = createClient();

    const { error } = await supabase
      .from('orders')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', orderId);

    if (error) {
      toast.error('Failed to update order status');
    } else {
      toast.success('Order status updated');
      fetchOrders();
    }
    setUpdating(false);
  };

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
        <h1 className="font-display text-3xl font-semibold mb-8">Manage Orders</h1>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by order number or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-48">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Orders</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="shipped">Shipped</SelectItem>
              <SelectItem value="delivered">Delivered</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Orders Table */}
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left py-4 px-6 text-sm font-medium">Order</th>
                  <th className="text-left py-4 px-6 text-sm font-medium">Date</th>
                  <th className="text-left py-4 px-6 text-sm font-medium">Customer</th>
                  <th className="text-left py-4 px-6 text-sm font-medium">Status</th>
                  <th className="text-left py-4 px-6 text-sm font-medium">Payment</th>
                  <th className="text-right py-4 px-6 text-sm font-medium">Total</th>
                  <th className="text-center py-4 px-6 text-sm font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => (
                  <tr key={order.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="py-4 px-6">{order.order_number}</td>
                    <td className="py-4 px-6 text-sm text-muted-foreground">
                      {new Date(order.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-4 px-6">
                      <div>
                        <p className="text-sm font-medium">{(order.shipping_address as any)?.fullName || 'N/A'}</p>
                        <p className="text-xs text-muted-foreground">{order.phone}</p>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <Badge className={statusColors[order.status]}>
                        {order.status}
                      </Badge>
                    </td>
                    <td className="py-4 px-6">
                      <Badge className={statusColors[order.payment_status]}>
                        {order.payment_status}
                      </Badge>
                    </td>
                    <td className="py-4 px-6 text-right font-medium">
                      ₹{order.total.toLocaleString()}
                    </td>
                    <td className="py-4 px-6 text-center">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedOrder(order)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>Order {order.order_number}</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4 mt-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <p className="text-sm text-muted-foreground">Status</p>
                                <Select
                                  value={order.status}
                                  onValueChange={(value) => updateOrderStatus(order.id, value)}
                                  disabled={updating}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="pending">Pending</SelectItem>
                                    <SelectItem value="paid">Paid</SelectItem>
                                    <SelectItem value="shipped">Shipped</SelectItem>
                                    <SelectItem value="delivered">Delivered</SelectItem>
                                    <SelectItem value="cancelled">Cancelled</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <p className="text-sm text-muted-foreground">Payment Status</p>
                                <Badge className={statusColors[order.payment_status]}>
                                  {order.payment_status}
                                </Badge>
                              </div>
                            </div>

                            <div>
                              <p className="text-sm text-muted-foreground mb-2">Items</p>
                              {order.items.map((item) => (
                                <div key={item.id} className="flex justify-between py-2 border-b last:border-0">
                                  <div>
                                    <p className="font-medium">{item.product_name}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {(item.variant_info as any)?.color} / {(item.variant_info as any)?.size}
                                    </p>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-sm">Qty: {item.quantity}</p>
                                    <p className="font-medium">₹{(item.price_at_purchase * item.quantity).toLocaleString()}</p>
                                  </div>
                                </div>
                              ))}
                            </div>

                            <div>
                              <p className="text-sm text-muted-foreground mb-1">Shipping Address</p>
                              <p className="text-sm">{(order.shipping_address as any)?.fullName}</p>
                              <p className="text-sm">{(order.shipping_address as any)?.addressLine1}</p>
                              {(order.shipping_address as any)?.addressLine2 && (
                                <p className="text-sm">{(order.shipping_address as any)?.addressLine2}</p>
                              )}
                              <p className="text-sm">
                                {(order.shipping_address as any)?.city}, {(order.shipping_address as any)?.state} - {(order.shipping_address as any)?.pincode}
                              </p>
                              <p className="text-sm">Phone: {order.phone}</p>
                            </div>

                            <div className="flex justify-between text-lg font-semibold">
                              <span>Total</span>
                              <span>₹{order.total.toLocaleString()}</span>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredOrders.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No orders found</p>
            </div>
          )}
        </Card>
      </div>
    </MainLayout>
  );
}
