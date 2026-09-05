'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Category, Product, ProductVariant } from '@/types/database';
import { MainLayout } from '@/components/layout/main-layout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Star, SlidersHorizontal, X, ChevronDown } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { getDisplayProductImage } from '@/lib/mock-images';

interface CategoryPageContentProps {
  category: Category;
  initialProducts: (Product & { variants: ProductVariant[] })[];
  initialFilters: {
    sort?: string;
    color?: string;
    size?: string;
    min?: string;
    max?: string;
    page?: string;
  };
}

const priceRanges = [
  { label: 'Under ₹5,000', min: 0, max: 5000 },
  { label: '₹5,000 - ₹10,000', min: 5000, max: 10000 },
  { label: '₹10,000 - ₹20,000', min: 10000, max: 20000 },
  { label: '₹20,000 - ₹30,000', min: 20000, max: 30000 },
  { label: 'Above ₹30,000', min: 30000, max: 999999 },
];

export function CategoryPageContent({ category, initialProducts, initialFilters }: CategoryPageContentProps) {
  const products = initialProducts;
  const loading = false;
  const [selectedColors, setSelectedColors] = useState<string[]>(initialFilters.color?.split(',').filter(Boolean) || []);
  const [selectedSizes, setSelectedSizes] = useState<string[]>(initialFilters.size?.split(',').filter(Boolean) || []);
  const [priceRange, setPriceRange] = useState<{ min: number; max: number } | null>(
    initialFilters.min && initialFilters.max
      ? { min: Number(initialFilters.min), max: Number(initialFilters.max) }
      : null,
  );
  const [sortBy, setSortBy] = useState(initialFilters.sort || 'newest');
  const [currentPage, setCurrentPage] = useState(1);

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const colors = Array.from(new Set(products.flatMap((product) => product.variants.map((variant) => variant.color).filter(Boolean)))) as string[];
  const sizes = Array.from(new Set(products.flatMap((product) => product.variants.map((variant) => variant.size).filter(Boolean)))) as string[];

  const updateFilters = () => {
    const params = new URLSearchParams(searchParams.toString());

    if (sortBy) params.set('sort', sortBy);
    if (selectedColors.length) params.set('color', selectedColors.join(','));
    if (selectedSizes.length) params.set('size', selectedSizes.join(','));
    if (priceRange) {
      params.set('min', priceRange.min.toString());
      params.set('max', priceRange.max.toString());
    }

    router.push(`${pathname}?${params.toString()}`);
  };

  const filteredProducts = products.filter(product => {
    const prices = product.variants?.map((variant) => variant.price_override ?? product.base_price) || [product.base_price];
    const price = Math.min(...prices);

    if (selectedColors.length > 0 && !product.variants.some((variant) => variant.color && selectedColors.includes(variant.color))) {
      return false;
    }

    if (selectedSizes.length > 0 && !product.variants.some((variant) => variant.size && selectedSizes.includes(variant.size))) {
      return false;
    }

    if (priceRange && (price < priceRange.min || price > priceRange.max)) {
      return false;
    }

    return true;
  }).sort((a, b) => {
    const aVariant = a.variants?.[0];
    const bVariant = b.variants?.[0];
    const aPrice = aVariant?.price_override ?? a.base_price;
    const bPrice = bVariant?.price_override ?? b.base_price;

    switch (sortBy) {
      case 'price-low':
        return aPrice - bPrice;
      case 'price-high':
        return bPrice - aPrice;
      case 'rating':
        return (b.avg_rating || 0) - (a.avg_rating || 0);
      default:
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
  });

  const FilterContent = () => (
    <div className="space-y-6">
      <Accordion type="multiple" defaultValue={['color', 'size', 'price']}>
        <AccordionItem value="color">
          <AccordionTrigger className="text-sm font-medium">Color</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-3">
              {colors.map(color => (
                <Label key={color} className="flex items-center gap-3 cursor-pointer">
                  <Checkbox
                    checked={selectedColors.includes(color)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedColors([...selectedColors, color]);
                      } else {
                        setSelectedColors(selectedColors.filter(c => c !== color));
                      }
                    }}
                  />
                  <span className="text-sm">{color}</span>
                </Label>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="size">
          <AccordionTrigger className="text-sm font-medium">Size</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-3">
              {sizes.map(size => (
                <Label key={size} className="flex items-center gap-3 cursor-pointer">
                  <Checkbox
                    checked={selectedSizes.includes(size)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedSizes([...selectedSizes, size]);
                      } else {
                        setSelectedSizes(selectedSizes.filter(s => s !== size));
                      }
                    }}
                  />
                  <span className="text-sm">{size}</span>
                </Label>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="price">
          <AccordionTrigger className="text-sm font-medium">Price Range</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-3">
              {priceRanges.map(range => (
                <Label key={range.label} className="flex items-center gap-3 cursor-pointer">
                  <Checkbox
                    checked={priceRange?.min === range.min && priceRange?.max === range.max}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setPriceRange({ min: range.min, max: range.max });
                      } else {
                        setPriceRange(null);
                      }
                    }}
                  />
                  <span className="text-sm">{range.label}</span>
                </Label>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <Button className="w-full" onClick={updateFilters}>
        Apply Filters
      </Button>

      {(selectedColors.length > 0 || selectedSizes.length > 0 || priceRange) && (
        <Button
          variant="outline"
          className="w-full"
          onClick={() => {
            setSelectedColors([]);
            setSelectedSizes([]);
            setPriceRange(null);
            router.push(pathname);
          }}
        >
          Clear All Filters
        </Button>
      )}
    </div>
  );

  return (
    <MainLayout>
      <div className="min-h-screen">
        {/* Category Header */}
        <div className="bg-secondary/20 py-12">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center"
            >
              <h1 className="font-display text-3xl md:text-4xl font-semibold mb-4">
                {category.name}
              </h1>
              {category.description && (
                <p className="text-muted-foreground max-w-2xl mx-auto">
                  {category.description}
                </p>
              )}
            </motion.div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-6">
            <p className="text-sm text-muted-foreground">
              {filteredProducts.length} Products
            </p>

            <div className="flex items-center gap-4">
              {/* Desktop Filters */}
              <div className="hidden lg:flex items-center gap-2">
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Newest</SelectItem>
                    <SelectItem value="price-low">Price: Low to High</SelectItem>
                    <SelectItem value="price-high">Price: High to Low</SelectItem>
                    <SelectItem value="rating">Top Rated</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Mobile Filter Sheet */}
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm" className="lg:hidden">
                    <SlidersHorizontal className="h-4 w-4 mr-2" />
                    Filters
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-80">
                  <SheetHeader>
                    <SheetTitle className="font-display">Filters</SheetTitle>
                  </SheetHeader>
                  <div className="mt-6">
                    <FilterContent />
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>

          {/* Active Filters */}
          {(selectedColors.length > 0 || selectedSizes.length > 0 || priceRange) && (
            <div className="flex flex-wrap items-center gap-2 mb-6">
              <span className="text-sm text-muted-foreground">Active filters:</span>
              {selectedColors.map(color => (
                <Badge key={color} variant="secondary" className="gap-1">
                  {color}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => setSelectedColors(selectedColors.filter(c => c !== color))} />
                </Badge>
              ))}
              {selectedSizes.map(size => (
                <Badge key={size} variant="secondary" className="gap-1">
                  {size}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => setSelectedSizes(selectedSizes.filter(s => s !== size))} />
                </Badge>
              ))}
              {priceRange && (
                <Badge variant="secondary" className="gap-1">
                  ₹{priceRange.min.toLocaleString()} - ₹{priceRange.max.toLocaleString()}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => setPriceRange(null)} />
                </Badge>
              )}
            </div>
          )}

          <div className="flex gap-8">
            {/* Desktop Sidebar Filters */}
            <div className="hidden lg:block w-64 flex-shrink-0">
              <div className="sticky top-24">
                <h3 className="font-display text-lg font-medium mb-4">Filters</h3>
                <FilterContent />
              </div>
            </div>

            {/* Products Grid */}
            <div className="flex-1">
              {loading ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
                  {[...Array(8)].map((_, index) => (
                    <div key={index} className="space-y-4">
                      <div className="aspect-[3/4] bg-muted rounded-lg image-loading" />
                      <div className="h-4 bg-muted rounded w-1/3" />
                      <div className="h-4 bg-muted rounded w-full" />
                      <div className="h-4 bg-muted rounded w-1/2" />
                    </div>
                  ))}
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">No products found matching your filters.</p>
                  <Button
                    variant="link"
                    onClick={() => {
                      setSelectedColors([]);
                      setSelectedSizes([]);
                      setPriceRange(null);
                    }}
                  >
                    Clear all filters
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
                  {filteredProducts.map((product, index) => {
                    const variant = product.variants?.[0];
                    const price = variant?.price_override ?? product.base_price;
                    const image = getDisplayProductImage(product.slug, variant?.image_urls?.[0], index);

                    return (
                      <motion.div
                        key={product.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <Link href={`/product/${product.slug}`}>
                          <Card className="group overflow-hidden border-0 shadow-none bg-transparent">
                            <div className="relative aspect-[3/4] overflow-hidden rounded-lg bg-muted">
                              <Image
                                  src={image}
                                  alt={product.name}
                                  fill
                                  sizes="(max-width: 768px) 50vw, 33vw"
                                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                                />

                              {product.avg_rating > 0 && (
                                <div className="absolute top-3 left-3 flex items-center gap-1 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-full text-xs font-medium">
                                  <Star className="h-3 w-3 fill-primary text-primary" />
                                  {product.avg_rating.toFixed(1)}
                                </div>
                              )}

                              {variant?.stock_quantity === 0 && (
                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                  <span className="text-white font-medium">Out of Stock</span>
                                </div>
                              )}
                            </div>

                            <div className="mt-4 space-y-2">
                              <h3 className="font-medium text-sm md:text-base line-clamp-2 group-hover:text-primary transition-colors">
                                {product.name}
                              </h3>
                              <div className="flex items-center gap-2">
                                <span className="font-display text-lg font-semibold">
                                  ₹{price?.toLocaleString()}
                                </span>
                              </div>
                            </div>
                          </Card>
                        </Link>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
