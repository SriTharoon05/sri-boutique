'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useCart } from '@/components/providers/cart-provider';
import { useAuth } from '@/components/providers/auth-provider';
import { Product, ProductVariant, Category, Review } from '@/types/database';
import { MainLayout } from '@/components/layout/main-layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Star, Minus, Plus, Heart, Share2, Truck, RefreshCw, Shield, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

interface ProductPageContentProps {
  product: Product & { category: Category | null; variants: ProductVariant[] };
  reviews: (Review & { user: { full_name: string | null; avatar_url: string | null } | null })[];
  relatedProducts: (Product & { category: Category | null; variants: ProductVariant[] })[];
}

export function ProductPageContent({ product, reviews, relatedProducts }: ProductPageContentProps) {
  const { addItem, loading: cartLoading } = useCart();
  const { user } = useAuth();
  const router = useRouter();

  const isDemo = product.id.startsWith('demo-');
  const variants = product.variants;
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(variants[0] || null);
  const [selectedColor, setSelectedColor] = useState<string>(variants[0]?.color || '');
  const [selectedSize, setSelectedSize] = useState<string>(variants[0]?.size || '');
  const [quantity, setQuantity] = useState(1);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [addingToCart, setAddingToCart] = useState(false);
  const [inWishlist, setInWishlist] = useState(false);

  const variantImages = selectedVariant?.image_urls || [];
  const images = variantImages.length > 0
    ? variantImages
    : ['/images/sarees/kanchipuram-maroon.png'];

  const currentPrice = selectedVariant?.price_override ?? product.base_price;
  const colors = Array.from(new Set(variants.map(v => v.color).filter(Boolean))) as string[];
  const sizes = Array.from(new Set(variants.map(v => v.size).filter(Boolean))) as string[];

  useEffect(() => {
    if (selectedColor && selectedSize) {
      const variant = variants.find(
        v => v.color === selectedColor && v.size === selectedSize
      );
      setSelectedVariant(variant || null);
      setSelectedImageIndex(0);
      if (variant) setQuantity((current) => Math.min(current, Math.max(1, variant.stock_quantity)));
    }
  }, [selectedColor, selectedSize, variants]);

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem('sb_wishlist') || '[]') as string[];
    setInWishlist(saved.includes(product.id));
  }, [product.id]);

  const handleAddToCart = async () => {
    if (isDemo) {
      toast.info('This is a demo product. Add your live inventory in the admin area to enable checkout.');
      return false;
    }
    if (!selectedVariant) {
      toast.error('Please select a variant');
      return false;
    }

    if (selectedVariant.stock_quantity < quantity) {
      toast.error('Not enough stock available');
      return false;
    }

    setAddingToCart(true);
    try {
      await addItem(selectedVariant.id, quantity);
      toast.success('Added to cart');
      return true;
    } catch {
      toast.error('Failed to add to cart');
      return false;
    } finally {
      setAddingToCart(false);
    }
  };

  const handleBuyNow = async () => {
    if (!user) {
      router.push('/auth/login?redirectTo=/checkout');
      return;
    }

    if (await handleAddToCart()) router.push('/checkout');
  };

  const toggleWishlist = () => {
    const saved = new Set(JSON.parse(localStorage.getItem('sb_wishlist') || '[]') as string[]);
    if (saved.has(product.id)) saved.delete(product.id);
    else saved.add(product.id);
    localStorage.setItem('sb_wishlist', JSON.stringify(Array.from(saved)));
    const nextValue = saved.has(product.id);
    setInWishlist(nextValue);
    toast.success(nextValue ? 'Added to wishlist' : 'Removed from wishlist');
  };

  const shareProduct = async () => {
    const shareData = { title: product.name, text: product.description || product.name, url: window.location.href };
    try {
      if (navigator.share) await navigator.share(shareData);
      else {
        await navigator.clipboard.writeText(window.location.href);
        toast.success('Product link copied');
      }
    } catch (error) {
      if ((error as DOMException).name !== 'AbortError') toast.error('Could not share this product');
    }
  };

  const avgRating = product.avg_rating || 0;
  const reviewCount = product.review_count || 0;

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8 md:py-12">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-8">
          <Link href="/" className="hover:text-primary">Home</Link>
          <span>/</span>
          {product.category && (
            <>
              <Link href={`/category/${product.category.slug}`} className="hover:text-primary">
                {product.category.name}
              </Link>
              <span>/</span>
            </>
          )}
          <span className="text-foreground">{product.name}</span>
        </nav>

        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Image Gallery */}
          <div className="space-y-4">
            <motion.div
              className="relative aspect-[3/4] overflow-hidden rounded-lg bg-muted"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={`${selectedVariant?.id}-${selectedImageIndex}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="absolute inset-0"
                >
                  <Image
                    src={images[selectedImageIndex] || images[0]}
                    alt={product.name}
                    fill
                    sizes="(max-width: 768px) 100vw, 50vw"
                    className="object-cover"
                    priority
                  />
                </motion.div>
              </AnimatePresence>

              {/* Navigation Arrows */}
              {images.length > 1 && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white"
                    onClick={() => setSelectedImageIndex(prev => (prev - 1 + images.length) % images.length)}
                    aria-label="Previous product image"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white"
                    onClick={() => setSelectedImageIndex(prev => (prev + 1) % images.length)}
                    aria-label="Next product image"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                </>
              )}

              {/* Wishlist Button */}
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-4 right-4 bg-white/80 hover:bg-white"
                onClick={toggleWishlist}
                aria-label={inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
              >
                <Heart className={`h-5 w-5 ${inWishlist ? 'fill-red-500 text-red-500' : ''}`} />
              </Button>
            </motion.div>

            {/* Thumbnails */}
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {images.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImageIndex(index)}
                    aria-label={`View product image ${index + 1}`}
                    className={`relative w-20 h-24 flex-shrink-0 rounded-md overflow-hidden ${
                      selectedImageIndex === index ? 'ring-2 ring-primary' : ''
                    }`}
                  >
                    <Image
                      src={image}
                      alt={`${product.name} ${index + 1}`}
                      fill
                      sizes="80px"
                      className="object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="space-y-6">
            <div>
              {product.category && (
                <Link
                  href={`/category/${product.category.slug}`}
                  className="text-sm text-muted-foreground hover:text-primary uppercase tracking-wider"
                >
                  {product.category.name}
                </Link>
              )}
              <h1 className="font-display text-2xl md:text-3xl font-semibold mt-2">
                {product.name}
              </h1>
            </div>

            {/* Rating */}
            {avgRating > 0 && (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`h-4 w-4 ${
                        star <= Math.round(avgRating)
                          ? 'fill-primary text-primary'
                          : 'text-muted-foreground'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-sm text-muted-foreground">
                  {avgRating.toFixed(1)} ({reviewCount} reviews)
                </span>
              </div>
            )}

            {/* Price */}
            <div className="flex items-baseline gap-3">
              <span className="font-display text-2xl md:text-3xl font-semibold">
                ₹{currentPrice?.toLocaleString()}
              </span>
            </div>

            <Separator />

            {/* Color Selection */}
            {colors.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Color</span>
                  <span className="text-sm text-muted-foreground">{selectedColor}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {colors.map((color) => (
                    <button
                      key={color}
                      onClick={() => setSelectedColor(color || '')}
                      className={`px-4 py-2 rounded-md border ${
                        selectedColor === color
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <span className="text-sm">{color}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Size Selection */}
            {sizes.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Size</span>
                  <Link href="/size-guide" className="text-sm text-primary hover:underline">Size Guide</Link>
                </div>
                <div className="flex flex-wrap gap-2">
                  {sizes.map((size) => (
                    <button
                      key={size}
                      onClick={() => setSelectedSize(size || '')}
                      className={`px-4 py-2 rounded-md border min-w-[60px] ${
                        selectedSize === size
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <span className="text-sm">{size}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quantity */}
            <div className="space-y-3">
              <span className="text-sm font-medium">Quantity</span>
              <div className="flex items-center gap-3">
                <div className="flex items-center border rounded-md">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="p-2 hover:bg-muted"
                    disabled={quantity <= 1}
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="w-12 text-center">{quantity}</span>
                  <button
                    onClick={() => setQuantity(Math.min((selectedVariant?.stock_quantity || 99), quantity + 1))}
                    className="p-2 hover:bg-muted"
                    disabled={quantity >= (selectedVariant?.stock_quantity || 99)}
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                <span className="text-sm text-muted-foreground">
                  {selectedVariant?.stock_quantity || 0} available
                </span>
              </div>
            </div>

            {/* Stock Status */}
            {selectedVariant && selectedVariant.stock_quantity === 0 && (
              <Badge variant="destructive">Out of Stock</Badge>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                size="lg"
                className="flex-1"
                onClick={handleAddToCart}
                disabled={addingToCart || !selectedVariant || selectedVariant.stock_quantity === 0 || isDemo}
              >
                {isDemo ? 'Demo Product' : addingToCart ? 'Adding...' : 'Add to Cart'}
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="flex-1"
                onClick={handleBuyNow}
                disabled={!selectedVariant || selectedVariant.stock_quantity === 0 || isDemo}
              >
                Buy Now
              </Button>
            </div>

            {/* Share */}
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" className="gap-2" onClick={shareProduct}>
                <Share2 className="h-4 w-4" />
                Share
              </Button>
            </div>

            <Separator />

            {/* Trust Badges */}
            <div className="grid grid-cols-3 gap-4">
              <div className="flex flex-col items-center text-center p-3">
                <Truck className="h-5 w-5 text-primary mb-2" />
                <span className="text-xs">Free Shipping</span>
              </div>
              <div className="flex flex-col items-center text-center p-3">
                <RefreshCw className="h-5 w-5 text-primary mb-2" />
                <span className="text-xs">Easy Returns</span>
              </div>
              <div className="flex flex-col items-center text-center p-3">
                <Shield className="h-5 w-5 text-primary mb-2" />
                <span className="text-xs">Secure Payment</span>
              </div>
            </div>

            <Separator />

            {/* Description */}
            <div>
              <h3 className="font-display text-lg font-medium mb-3">Description</h3>
              <p className="text-muted-foreground leading-relaxed">
                {product.description}
              </p>
            </div>
          </div>
        </div>

        {/* Reviews Section */}
        <section className="mt-16">
          <div className="flex items-center justify-between mb-8">
            <h2 className="font-display text-2xl font-semibold">
              Customer Reviews
            </h2>
            {user && (
              <Button asChild>
                <Link href={`/product/${product.slug}/review`}>Write a Review</Link>
              </Button>
            )}
          </div>

          {reviews.length === 0 ? (
            <div className="text-center py-12 bg-muted/30 rounded-lg">
              <p className="text-muted-foreground">No reviews yet. Be the first to review this product!</p>
            </div>
          ) : (
            <div className="space-y-6">
              {reviews.map((review) => (
                <div key={review.id} className="p-6 border rounded-lg">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-sm font-medium text-primary">
                          {review.user?.full_name?.charAt(0) || 'U'}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium">{review.user?.full_name || 'Anonymous'}</p>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`h-3 w-3 ${
                                  star <= review.rating
                                    ? 'fill-primary text-primary'
                                    : 'text-muted-foreground'
                                }`}
                              />
                            ))}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {new Date(review.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  {review.comment && (
                    <p className="text-muted-foreground">{review.comment}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <section className="mt-16">
            <h2 className="font-display text-2xl font-semibold mb-8">
              You May Also Like
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
              {relatedProducts.map((related) => {
                const variant = related.variants?.[0];
                const price = variant?.price_override ?? related.base_price;
                const image = variant?.image_urls?.[0];

                return (
                  <Link key={related.id} href={`/product/${related.slug}`}>
                    <div className="group">
                      <div className="relative aspect-[3/4] overflow-hidden rounded-lg bg-muted">
                        {image && (
                          <Image
                            src={image}
                            alt={related.name}
                            fill
                            sizes="(max-width: 768px) 50vw, 25vw"
                            className="object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                        )}
                      </div>
                      <div className="mt-4">
                        <h3 className="font-medium text-sm line-clamp-2 group-hover:text-primary transition-colors">
                          {related.name}
                        </h3>
                        <p className="font-display font-semibold mt-1">
                          ₹{price?.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </MainLayout>
  );
}
