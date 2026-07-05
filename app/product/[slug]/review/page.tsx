'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { MainLayout } from '@/components/layout/main-layout';
import { useAuth } from '@/components/providers/auth-provider';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Star, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface EligibleOrder {
  order_id: string;
  order_number: string;
  product_id: string;
  product_name: string;
}

export default function WriteReviewPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [eligibleOrders, setEligibleOrders] = useState<EligibleOrder[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string>('');
  const [productId, setProductId] = useState<string>('');
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push(`/auth/login?redirectTo=/product/${params.slug}/review`);
      return;
    }

    if (!user) return;

    const loadEligibleOrders = async () => {
      const supabase = createClient();

      // Find the product by slug
      const { data: product } = await supabase
        .from('products')
        .select('id, name')
        .eq('slug', params.slug)
        .maybeSingle();

      if (!product) {
        toast.error('Product not found');
        router.push('/');
        return;
      }

      setProductId(product.id);

      // Find delivered orders belonging to this user that contain this product,
      // and that don't already have a review from this user for this product/order.
      const { data: orders } = await supabase
        .from('orders')
        .select(`
          id,
          order_number,
          status,
          items:order_items (
            variant_id,
            variant:product_variants (product_id)
          )
        `)
        .eq('user_id', user.id)
        .eq('status', 'delivered');

      const matching: EligibleOrder[] = [];
      for (const order of orders || []) {
        const hasProduct = order.items?.some(
          (item: any) => item.variant?.product_id === product.id
        );
        if (hasProduct) {
          matching.push({
            order_id: order.id,
            order_number: order.order_number,
            product_id: product.id,
            product_name: product.name,
          });
        }
      }

      setEligibleOrders(matching);
      if (matching.length > 0) {
        setSelectedOrderId(matching[0].order_id);
      }
      setLoading(false);
    };

    loadEligibleOrders();
  }, [user, authLoading, params.slug, router]);

  const handleSubmit = async () => {
    if (!selectedOrderId) {
      toast.error('No eligible delivered order found for this product');
      return;
    }
    if (rating === 0) {
      toast.error('Please select a star rating');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: productId,
          order_id: selectedOrderId,
          rating,
          comment,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit review');
      }

      toast.success('Review submitted — thank you!');
      router.refresh();
      router.push(`/product/${params.slug}`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || loading) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-12 flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  if (eligibleOrders.length === 0) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-12 max-w-lg text-center">
          <h1 className="font-display text-2xl font-semibold mb-4">
            You can&apos;t review this product yet
          </h1>
          <p className="text-muted-foreground mb-6">
            Reviews can only be written for products from orders marked as
            delivered on your account. If you&apos;ve received this item, check
            back once your order status updates.
          </p>
          <Button asChild>
            <a href={`/product/${params.slug}`}>Back to Product</a>
          </Button>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-12 max-w-lg">
        <h1 className="font-display text-2xl font-semibold mb-8">
          Write a Review
        </h1>

        <Card className="p-6 space-y-6">
          {eligibleOrders.length > 1 && (
            <div className="space-y-2">
              <Label>Which order is this for?</Label>
              <select
                className="w-full border rounded-md p-2 text-sm"
                value={selectedOrderId}
                onChange={(e) => setSelectedOrderId(e.target.value)}
              >
                {eligibleOrders.map((o) => (
                  <option key={o.order_id} value={o.order_id}>
                    {o.order_number}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="space-y-2">
            <Label>Your Rating *</Label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={() => setRating(star)}
                >
                  <Star
                    className={`h-8 w-8 ${
                      star <= (hoverRating || rating)
                        ? 'fill-primary text-primary'
                        : 'text-muted-foreground'
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="comment">Your Review (optional)</Label>
            <Textarea
              id="comment"
              rows={5}
              placeholder="Share your experience with this product..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </div>

          <Button
            size="lg"
            className="w-full"
            onClick={handleSubmit}
            disabled={submitting || rating === 0}
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              'Submit Review'
            )}
          </Button>
        </Card>
      </div>
    </MainLayout>
  );
}