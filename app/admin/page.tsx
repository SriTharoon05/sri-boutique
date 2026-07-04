'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/auth-provider';
import { createClient } from '@/lib/supabase/client';
import { MainLayout } from '@/components/layout/main-layout';
import { Card } from '@/components/ui/card';
import { Loader2, Package, ShoppingBag, Users, DollarSign, TrendingUp } from 'lucide-react';

export default function AdminPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalOrders: 0,
    totalRevenue: 0,
    pendingOrders: 0,
  });
  const [recentOrders, setRecentOrders] = useState<any[]>([]);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/auth/login');
      } else if (profile?.role !== 'admin') {
        router.push('/');
      }
    }
  }, [user, profile, authLoading, router]);

  useEffect(() => {
    async function fetchDashboardData() {
      if (!user || profile?.role !== 'admin') return;

      const supabase = createClient();

      const { count: productCount } = await supabase
        .from('products')
        .select('id', { count: 'exact', head: true });

      const { count: orderCount } = await supabase
        .from('orders')
        .select('id', { count: 'exact', head: true });

      const { data: orders } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      const { data: revenueData } = await supabase
        .from('orders')
        .select('total')
        .in('status', ['paid', 'shipped', 'delivered']);

      const { count: pendingCount } = await supabase
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending');

      const totalRevenue = revenueData?.reduce((sum, order) => sum + (order.total || 0), 0) || 0;

      setStats({
        totalProducts: productCount || 0,
        totalOrders: orderCount || 0,
        totalRevenue,
        pendingOrders: pendingCount || 0,
      });

      setRecentOrders(orders || []);
      setLoading(false);
    }

    fetchDashboardData();
  }, [user, profile]);

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

  const statCards = [
    { label: 'Total Products', value: stats.totalProducts, icon: ShoppingBag, color: 'bg-primary/10 text-primary' },
    { label: 'Total Orders', value: stats.totalOrders, icon: Package, color: 'bg-blue-100 text-blue-600' },
    { label: 'Total Revenue', value: `₹${stats.totalRevenue.toLocaleString()}`, icon: DollarSign, color: 'bg-green-100 text-green-600' },
    { label: 'Pending Orders', value: stats.pendingOrders, icon: TrendingUp, color: 'bg-yellow-100 text-yellow-600' },
  ];

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-12">
        <h1 className="font-display text-3xl font-semibold mb-8">Admin Dashboard</h1>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {statCards.map((stat) => (
            <Card key={stat.label} className="p-6">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-full ${stat.color}`}>
                  <stat.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-display font-semibold">{stat.value}</p>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Navigation Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push('/admin/products')}>
            <div className="flex items-center gap-4">
              <ShoppingBag className="h-8 w-8 text-primary" />
              <div>
                <h3 className="font-display text-lg font-semibold">Products</h3>
                <p className="text-sm text-muted-foreground">Manage your product catalog</p>
              </div>
            </div>
          </Card>

          <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push('/admin/orders')}>
            <div className="flex items-center gap-4">
              <Package className="h-8 w-8 text-primary" />
              <div>
                <h3 className="font-display text-lg font-semibold">Orders</h3>
                <p className="text-sm text-muted-foreground">View and manage orders</p>
              </div>
            </div>
          </Card>

          <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push('/admin/coupons')}>
            <div className="flex items-center gap-4">
              <DollarSign className="h-8 w-8 text-primary" />
              <div>
                <h3 className="font-display text-lg font-semibold">Coupons</h3>
                <p className="text-sm text-muted-foreground">Create and manage discount codes</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Recent Orders */}
        <Card className="p-6">
          <h2 className="font-display text-xl font-semibold mb-4">Recent Orders</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 text-sm font-medium text-muted-foreground">Order</th>
                  <th className="text-left py-3 text-sm font-medium text-muted-foreground">Date</th>
                  <th className="text-left py-3 text-sm font-medium text-muted-foreground">Status</th>
                  <th className="text-right py-3 text-sm font-medium text-muted-foreground">Total</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((order) => (
                  <tr key={order.id} className="border-b last:border-0 hover:bg-muted/50 cursor-pointer" onClick={() => router.push(`/admin/orders/${order.id}`)}>
                    <td className="py-3 text-sm">{order.order_number}</td>
                    <td className="py-3 text-sm text-muted-foreground">{new Date(order.created_at).toLocaleDateString()}</td>
                    <td className="py-3">
                      <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                        order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          order.status === 'paid' ? 'bg-blue-100 text-blue-800' :
                            order.status === 'shipped' ? 'bg-purple-100 text-purple-800' :
                              order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                                'bg-gray-100 text-gray-800'
                      }`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="py-3 text-sm text-right font-medium">₹{order.total.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </MainLayout>
  );
}
