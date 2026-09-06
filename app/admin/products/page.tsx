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
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog';
import { Loader2, Plus, Pencil, Power, Search, Truck } from 'lucide-react';
import { Product, Category, ProductVariant } from '@/types/database';
import { toast } from 'sonner';

export default function AdminProductsPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<(Product & { variants: ProductVariant[], category: Category | null })[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState('');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    base_price: 0,
    category_id: '',
    is_active: true,
    variant_id: '',
    sku: '',
    color: '',
    size: 'Free Size',
    stock_quantity: 0,
    image_urls: '',
  });

  useEffect(() => {
    if (!authLoading) {
      if (!user || profile?.role !== 'admin') {
        router.push('/');
      }
    }
  }, [user, profile, authLoading, router]);

  const fetchData = useCallback(async () => {
    if (!user || profile?.role !== 'admin') return;

    const supabase = createClient();

    const { data: productsData } = await supabase
      .from('products')
      .select(`
        *,
        category:categories (*),
        variants:product_variants (*)
      `)
      .order('created_at', { ascending: false });

    const { data: categoriesData } = await supabase
      .from('categories')
      .select('*');

    setProducts(productsData || []);
    setCategories(categoriesData || []);
    setLoading(false);
  }, [user, profile?.role]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  const handleEdit = (product: Product & { variants?: ProductVariant[] }) => {
    const variant = product.variants?.[0];
    setEditingProduct(product);
    setFormData({
      name: product.name,
      slug: product.slug,
      description: product.description || '',
      base_price: product.base_price,
      category_id: product.category_id || '',
      is_active: product.is_active,
      variant_id: variant?.id || '',
      sku: variant?.sku || '',
      color: variant?.color || '',
      size: variant?.size || 'Free Size',
      stock_quantity: variant?.stock_quantity || 0,
      image_urls: variant?.image_urls?.join('\n') || '',
    });
    setEditDialogOpen(true);
  };

  const handleNew = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      slug: '',
      description: '',
      base_price: 0,
      category_id: categories[0]?.id || '',
      is_active: true,
      variant_id: '',
      sku: '',
      color: '',
      size: 'Free Size',
      stock_quantity: 0,
      image_urls: '',
    });
    setEditDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.slug || !formData.sku) {
      toast.error('Name, slug, and SKU are required');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/admin/products', {
        method: editingProduct ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(editingProduct ? { id: editingProduct.id } : {}),
          name: formData.name,
          slug: formData.slug,
          description: formData.description,
          base_price: formData.base_price,
          category_id: formData.category_id || null,
          is_active: formData.is_active,
          variant: {
            ...(formData.variant_id ? { id: formData.variant_id } : {}),
            sku: formData.sku,
            color: formData.color || null,
            size: formData.size || null,
            stock_quantity: formData.stock_quantity,
            image_urls: formData.image_urls.split(/\r?\n|,/).map((url) => url.trim()).filter(Boolean),
            is_active: true,
          },
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to save product');
      toast.success(editingProduct ? 'Product updated' : 'Product created');

      setEditDialogOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save product');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (product: Product) => {
    const supabase = createClient();
    const { error } = await supabase
      .from('products')
      .update({ is_active: !product.is_active })
      .eq('id', product.id);

    if (error) {
      toast.error('Failed to update product');
    } else {
      toast.success(product.is_active ? 'Product deactivated' : 'Product activated');
      fetchData();
    }
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.slug.toLowerCase().includes(search.toLowerCase())
  );

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
          <h1 className="font-display text-3xl font-semibold">Manage Products</h1>
          <Button onClick={handleNew}>
            <Plus className="h-4 w-4 mr-2" />
            Add Product
          </Button>
        </div>

        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left py-4 px-6 text-sm font-medium">Product</th>
                  <th className="text-left py-4 px-6 text-sm font-medium">Category</th>
                  <th className="text-left py-4 px-6 text-sm font-medium">Price</th>
                  <th className="text-left py-4 px-6 text-sm font-medium">Variants</th>
                  <th className="text-left py-4 px-6 text-sm font-medium">Source</th>
                  <th className="text-left py-4 px-6 text-sm font-medium">Status</th>
                  <th className="text-center py-4 px-6 text-sm font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product) => (
                  <tr key={product.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="py-4 px-6">
                      <div>
                        <p className="font-medium">{product.name}</p>
                        <p className="text-xs text-muted-foreground">{product.slug}</p>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-sm">{product.category?.name || '-'}</td>
                    <td className="py-4 px-6 font-medium">₹{product.base_price.toLocaleString()}</td>
                    <td className="py-4 px-6">
                      <Badge variant="outline">{product.variants?.length || 0} variants</Badge>
                    </td>
                    <td className="py-4 px-6">
                      <Badge variant="outline" className={product.source_type === 'dropship' ? 'border-blue-200 bg-blue-50 text-blue-800' : ''}>
                        {product.source_type === 'dropship' ? <Truck className="h-3 w-3 mr-1" /> : null}
                        {product.source_type === 'dropship' ? 'Dropship' : 'Own stock'}
                      </Badge>
                    </td>
                    <td className="py-4 px-6">
                      <Badge className={product.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                        {product.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center justify-center gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(product)} disabled={product.source_type === 'dropship'} title={product.source_type === 'dropship' ? 'Supplier products are managed from Suppliers' : 'Edit product'}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => toggleActive(product)}
                        >
                          <Power className={`h-4 w-4 ${product.is_active ? 'text-green-600' : 'text-gray-400'}`} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredProducts.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No products found</p>
            </div>
          )}
        </Card>

        {/* Edit Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingProduct ? 'Edit Product' : 'Add Product'}</DialogTitle>
            </DialogHeader>

            <div className="space-y-4 mt-4">
              <div>
                <Label>Product Name</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => {
                    setFormData({
                      ...formData,
                      name: e.target.value,
                      slug: generateSlug(e.target.value),
                    });
                  }}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>SKU</Label>
                  <Input value={formData.sku} onChange={(e) => setFormData({ ...formData, sku: e.target.value.toUpperCase() })} />
                </div>
                <div>
                  <Label>Stock</Label>
                  <Input type="number" min="0" value={formData.stock_quantity} onChange={(e) => setFormData({ ...formData, stock_quantity: Math.max(0, parseInt(e.target.value) || 0) })} />
                </div>
                <div>
                  <Label>Colour</Label>
                  <Input value={formData.color} onChange={(e) => setFormData({ ...formData, color: e.target.value })} />
                </div>
                <div>
                  <Label>Size</Label>
                  <Input value={formData.size} onChange={(e) => setFormData({ ...formData, size: e.target.value })} />
                </div>
              </div>

              <div>
                <Label>Image URLs (one per line)</Label>
                <Textarea value={formData.image_urls} onChange={(e) => setFormData({ ...formData, image_urls: e.target.value })} placeholder="https://…" />
              </div>

              <div>
                <Label>Slug</Label>
                <Input
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                />
              </div>

              <div>
                <Label>Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div>
                <Label>Base Price (₹)</Label>
                <Input
                  type="number"
                  value={formData.base_price}
                  onChange={(e) => setFormData({ ...formData, base_price: parseFloat(e.target.value) || 0 })}
                />
              </div>

              <div>
                <Label>Category</Label>
                <select
                  className="w-full px-3 py-2 border rounded-md"
                  value={formData.category_id}
                  onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                >
                  <option value="">No Category</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                />
                <Label htmlFor="is_active">Active</Label>
              </div>

              <div className="flex gap-3 pt-4">
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  {editingProduct ? 'Update' : 'Create'}
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
