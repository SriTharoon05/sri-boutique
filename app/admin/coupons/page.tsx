'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/auth-provider';
import { createClient } from '@/lib/supabase/client';
import { MainLayout } from '@/components/layout/main-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Plus, Pencil, Trash2, Power } from 'lucide-react';
import { Coupon } from '@/types/database';
import { toast } from 'sonner';

export default function AdminCouponsPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    code: '',
    discount_type: 'percentage' as 'percentage' | 'flat',
    discount_value: 0,
    min_order_value: 0,
    usage_limit: null as number | null,
    expiry_date: '',
    is_active: true,
  });

  useEffect(() => {
    if (!authLoading) {
      if (!user || profile?.role !== 'admin') {
        router.push('/');
      }
    }
  }, [user, profile, authLoading, router]);

  const fetchCoupons = useCallback(async () => {
    if (!user || profile?.role !== 'admin') return;

    const supabase = createClient();
    const { data, error } = await supabase
      .from('coupons')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching coupons:', error);
    } else {
      setCoupons(data || []);
    }
    setLoading(false);
  }, [user, profile?.role]);

  useEffect(() => {
    fetchCoupons();
  }, [fetchCoupons]);

  const handleEdit = (coupon: Coupon) => {
    setEditingCoupon(coupon);
    setFormData({
      code: coupon.code,
      discount_type: coupon.discount_type,
      discount_value: coupon.discount_value,
      min_order_value: coupon.min_order_value,
      usage_limit: coupon.usage_limit,
      expiry_date: coupon.expiry_date ? new Date(coupon.expiry_date).toISOString().split('T')[0] : '',
      is_active: coupon.is_active,
    });
    setEditDialogOpen(true);
  };

  const handleNew = () => {
    setEditingCoupon(null);
    setFormData({
      code: '',
      discount_type: 'percentage',
      discount_value: 0,
      min_order_value: 0,
      usage_limit: null,
      expiry_date: '',
      is_active: true,
    });
    setEditDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.code) {
      toast.error('Coupon code is required');
      return;
    }

    setSaving(true);
    const supabase = createClient();

    try {
      const couponData = {
        code: formData.code.toUpperCase(),
        discount_type: formData.discount_type,
        discount_value: formData.discount_value,
        min_order_value: formData.min_order_value,
        usage_limit: formData.usage_limit,
        expiry_date: formData.expiry_date ? new Date(formData.expiry_date).toISOString() : null,
        is_active: formData.is_active,
      };

      if (editingCoupon) {
        const { error } = await supabase
          .from('coupons')
          .update(couponData)
          .eq('id', editingCoupon.id);

        if (error) throw error;
        toast.success('Coupon updated');
      } else {
        const { error } = await supabase
          .from('coupons')
          .insert(couponData);

        if (error) throw error;
        toast.success('Coupon created');
      }

      setEditDialogOpen(false);
      fetchCoupons();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save coupon');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (coupon: Coupon) => {
    const supabase = createClient();
    const { error } = await supabase
      .from('coupons')
      .update({ is_active: !coupon.is_active })
      .eq('id', coupon.id);

    if (error) {
      toast.error('Failed to update coupon');
    } else {
      toast.success(coupon.is_active ? 'Coupon deactivated' : 'Coupon activated');
      fetchCoupons();
    }
  };

  const deleteCoupon = async (coupon: Coupon) => {
    if (!confirm('Are you sure you want to delete this coupon?')) return;

    const supabase = createClient();
    const { error } = await supabase
      .from('coupons')
      .delete()
      .eq('id', coupon.id);

    if (error) {
      toast.error('Failed to delete coupon');
    } else {
      toast.success('Coupon deleted');
      fetchCoupons();
    }
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
        <div className="flex items-center justify-between mb-8">
          <h1 className="font-display text-3xl font-semibold">Manage Coupons</h1>
          <Button onClick={handleNew}>
            <Plus className="h-4 w-4 mr-2" />
            Add Coupon
          </Button>
        </div>

        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left py-4 px-6 text-sm font-medium">Code</th>
                  <th className="text-left py-4 px-6 text-sm font-medium">Discount</th>
                  <th className="text-left py-4 px-6 text-sm font-medium">Min Order</th>
                  <th className="text-left py-4 px-6 text-sm font-medium">Usage</th>
                  <th className="text-left py-4 px-6 text-sm font-medium">Expiry</th>
                  <th className="text-left py-4 px-6 text-sm font-medium">Status</th>
                  <th className="text-center py-4 px-6 text-sm font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {coupons.map((coupon) => (
                  <tr key={coupon.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="py-4 px-6 font-mono font-medium">{coupon.code}</td>
                    <td className="py-4 px-6">
                      {coupon.discount_type === 'percentage'
                        ? `${coupon.discount_value}%`
                        : `₹${coupon.discount_value}`}
                    </td>
                    <td className="py-4 px-6">₹{coupon.min_order_value.toLocaleString()}</td>
                    <td className="py-4 px-6">
                      {coupon.times_used} / {coupon.usage_limit || 'Unlimited'}
                    </td>
                    <td className="py-4 px-6 text-sm">
                      {coupon.expiry_date
                        ? new Date(coupon.expiry_date).toLocaleDateString()
                        : 'No expiry'}
                    </td>
                    <td className="py-4 px-6">
                      <Badge className={coupon.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                        {coupon.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center justify-center gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(coupon)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => toggleActive(coupon)}>
                          <Power className={`h-4 w-4 ${coupon.is_active ? 'text-green-600' : 'text-gray-400'}`} />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => deleteCoupon(coupon)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {coupons.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No coupons found</p>
            </div>
          )}
        </Card>

        {/* Edit Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingCoupon ? 'Edit Coupon' : 'Add Coupon'}</DialogTitle>
            </DialogHeader>

            <div className="space-y-4 mt-4">
              <div>
                <Label>Coupon Code</Label>
                <Input
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  placeholder="SAVE10"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Discount Type</Label>
                  <Select
                    value={formData.discount_type}
                    onValueChange={(value: 'percentage' | 'flat') =>
                      setFormData({ ...formData, discount_type: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Percentage (%)</SelectItem>
                      <SelectItem value="flat">Flat Amount (₹)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Discount Value</Label>
                  <Input
                    type="number"
                    value={formData.discount_value}
                    onChange={(e) =>
                      setFormData({ ...formData, discount_value: parseFloat(e.target.value) || 0 })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Minimum Order Value (₹)</Label>
                  <Input
                    type="number"
                    value={formData.min_order_value}
                    onChange={(e) =>
                      setFormData({ ...formData, min_order_value: parseFloat(e.target.value) || 0 })
                    }
                  />
                </div>

                <div>
                  <Label>Usage Limit</Label>
                  <Input
                    type="number"
                    placeholder="Leave empty for unlimited"
                    value={formData.usage_limit || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        usage_limit: e.target.value ? parseInt(e.target.value) : null,
                      })
                    }
                  />
                </div>
              </div>

              <div>
                <Label>Expiry Date</Label>
                <Input
                  type="date"
                  value={formData.expiry_date}
                  onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="coupon_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                />
                <Label htmlFor="coupon_active">Active</Label>
              </div>

              <div className="flex gap-3 pt-4">
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  {editingCoupon ? 'Update' : 'Create'}
                </Button>
                <DialogClose asChild>
                  <Button variant="outline">Cancel</Button>
                </DialogClose>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
