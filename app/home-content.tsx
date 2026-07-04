'use client';

import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ArrowRight, Star, Truck, Shield, Headphones } from 'lucide-react';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Category, Product, ProductVariant } from '@/types/database';

// Demo data for when database is empty
const demoCategories: (Category & { _count?: number })[] = [
  {
    id: '1',
    name: 'Silk Sarees',
    slug: 'silk-sarees',
    description: 'Luxurious silk sarees handwoven by master craftsmen',
    parent_id: null,
    image_url: 'https://images.pexels.com/photos/1078983/pexels-photo-1078983.jpeg',
    created_at: new Date().toISOString(),
    _count: 45,
  },
  {
    id: '2',
    name: 'Designer Sarees',
    slug: 'designer-sarees',
    description: 'Contemporary designs with traditional craftsmanship',
    parent_id: null,
    image_url: 'https://images.pexels.com/photos/1647920/pexels-photo-1647920.jpeg',
    created_at: new Date().toISOString(),
    _count: 38,
  },
  {
    id: '3',
    name: 'Ethnic Sets',
    slug: 'ethnic-sets',
    description: 'Complete ethnic ensembles for every occasion',
    parent_id: null,
    image_url: 'https://images.pexels.com/photos/994517/pexels-photo-994517.jpeg',
    created_at: new Date().toISOString(),
    _count: 52,
  },
  {
    id: '4',
    name: 'Kurtas',
    slug: 'kurtas',
    description: 'Elegant kurtas for everyday wear',
    parent_id: null,
    image_url: 'https://images.pexels.com/photos/769770/pexels-photo-769770.jpeg',
    created_at: new Date().toISOString(),
    _count: 67,
  },
];

const demoProducts: (Product & { variants: ProductVariant[], category: Category | null })[] = [
  {
    id: '1',
    name: 'Royal Banarasi Silk Saree',
    slug: 'royal-banarasi-silk-saree',
    description: 'Handwoven Banarasi silk saree with intricate gold zari work. Perfect for weddings and special occasions.',
    base_price: 25999,
    category_id: '1',
    is_active: true,
    avg_rating: 4.8,
    review_count: 124,
    created_at: new Date().toISOString(),
    category: demoCategories[0],
    variants: [{
      id: '1',
      product_id: '1',
      sku: 'RBS-001',
      color: 'Maroon',
      size: 'Free',
      stock_quantity: 10,
      image_urls: ['https://images.pexels.com/photos/1078983/pexels-photo-1078983.jpeg'],
      is_active: true,
      created_at: new Date().toISOString(),
      price_override: null,
    }],
  },
  {
    id: '2',
    name: 'Contemporary Block Print Set',
    slug: 'contemporary-block-print-set',
    description: 'Modern silhouette with traditional block print. Includes kurta, palazzo, and dupatta.',
    base_price: 8999,
    category_id: '3',
    is_active: true,
    avg_rating: 4.6,
    review_count: 89,
    created_at: new Date().toISOString(),
    category: demoCategories[2],
    variants: [{
      id: '2',
      product_id: '2',
      sku: 'CPS001',
      color: 'Navy Blue',
      size: 'M',
      stock_quantity: 15,
      image_urls: ['https://images.pexels.com/photos/994517/pexels-photo-994517.jpeg'],
      is_active: true,
      created_at: new Date().toISOString(),
      price_override: null,
    }],
  },
  {
    id: '3',
    name: 'Chanderi Cotton Saree',
    slug: 'chanderi-cotton-saree',
    description: 'Lightweight Chanderi cotton saree with subtle embroidery. Ideal for casual elegance.',
    base_price: 7499,
    category_id: '1',
    is_active: true,
    avg_rating: 4.5,
    review_count: 67,
    created_at: new Date().toISOString(),
    category: demoCategories[0],
    variants: [{
      id: '3',
      product_id: '3',
      sku: 'CCS001',
      color: 'Peach',
      size: 'Free',
      stock_quantity: 8,
      image_urls: ['https://images.pexels.com/photos/1647920/pexels-photo-1647920.jpeg'],
      is_active: true,
      created_at: new Date().toISOString(),
      price_override: null,
    }],
  },
  {
    id: '4',
    name: 'Embroidered Anarkali Set',
    slug: 'embroidered-anarkali-set',
    description: 'Floor-length Anarkali with intricate thread embroidery. Perfect for festive celebrations.',
    base_price: 14999,
    category_id: '3',
    is_active: true,
    avg_rating: 4.9,
    review_count: 156,
    created_at: new Date().toISOString(),
    category: demoCategories[2],
    variants: [{
      id: '4',
      product_id: '4',
      sku: 'EAS001',
      color: 'Teal',
      size: 'L',
      stock_quantity: 12,
      image_urls: ['https://images.pexels.com/photos/769770/pexels-photo-769770.jpeg'],
      is_active: true,
      created_at: new Date().toISOString(),
      price_override: null,
    }],
  },
];

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 },
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

export function HomePageContent() {
  const [categories, setCategories] = useState<(Category & { _count?: number })[]>([]);
  const [products, setProducts] = useState<(Product & { variants: ProductVariant[], category: Category | null })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const supabase = createClient();

      const { data: categoriesData } = await supabase
        .from('categories')
        .select('*')
        .is('parent_id', null)
        .limit(4);

      const { data: productsData } = await supabase
        .from('products')
        .select(`
          *,
          category:categories (*),
          variants:product_variants (*)
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(4);

      setCategories(categoriesData?.length ? categoriesData : demoCategories);
      setProducts(productsData?.length ? productsData : demoProducts);
      setLoading(false);
    }

    fetchData();
  }, []);

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative h-[85vh] min-h-[600px] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/10" />
        <div className="absolute inset-0 bg-[url('https://images.pexels.com/photos/1647920/pexels-photo-1647920.jpeg')] bg-cover bg-center opacity-20" />

        <div className="container mx-auto px-4 relative z-10">
          <motion.div
            className="max-w-3xl mx-auto text-center"
            initial="initial"
            animate="animate"
            variants={staggerContainer}
          >
            <motion.span
              variants={fadeInUp}
              className="inline-block text-sm font-medium tracking-widest text-primary mb-6"
            >
              HANDCRAFTED WITH LOVE
            </motion.span>

            <motion.h1
              variants={fadeInUp}
              className="font-display text-5xl md:text-6xl lg:text-7xl font-semibold text-foreground mb-6 leading-tight"
            >
              Timeless Elegance,{' '}
              <span className="text-primary">Woven</span> Into Every Thread
            </motion.h1>

            <motion.p
              variants={fadeInUp}
              className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto"
            >
              Discover our curated collection of handcrafted sarees and ethnic wear,
              where tradition meets contemporary sophistication.
            </motion.p>

            <motion.div
              variants={fadeInUp}
              className="flex flex-wrap justify-center gap-4"
            >
              <Button asChild size="lg" className="text-base">
                <Link href="#categories">
                  Explore Collection
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="text-base">
                <Link href="/about">Our Story</Link>
              </Button>
            </motion.div>
          </motion.div>
        </div>

        {/* Decorative elements */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
      </section>

      {/* Trust Badges */}
      <section className="py-12 border-b bg-background">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { icon: Truck, title: 'Free Shipping', desc: 'Orders over ₹2000' },
              { icon: Shield, title: 'Secure Payment', desc: '100% protected' },
              { icon: Headphones, title: '24/7 Support', desc: 'Always here to help' },
              { icon: Star, title: 'Premium Quality', desc: 'Handcrafted products' },
            ].map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center gap-4 justify-center md:justify-start"
              >
                <div className="p-3 rounded-full bg-primary/10">
                  <item.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-sm">{item.title}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section id="categories" className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <span className="text-sm font-medium tracking-widest text-primary mb-4 block">
              SHOP BY CATEGORY
            </span>
            <h2 className="font-display text-3xl md:text-4xl font-semibold">
              Find Your Perfect Style
            </h2>
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {categories.map((category, index) => (
              <motion.div
                key={category.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Link href={`/category/${category.slug}`}>
                  <Card className="group overflow-hidden border-0 shadow-none">
                    <div className="relative aspect-[3/4] overflow-hidden rounded-lg">
                      {category.image_url ? (
                        <Image
                          src={category.image_url}
                          alt={category.name}
                          fill
                          sizes="(max-width: 768px) 50vw, 25vw"
                          className="object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="absolute inset-0 bg-muted" />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                      <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6">
                        <h3 className="font-display text-xl md:text-2xl font-medium text-white mb-1">
                          {category.name}
                        </h3>
                        {category._count && (
                          <p className="text-sm text-white/80">{category._count} items</p>
                        )}
                      </div>
                    </div>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-16 md:py-24 bg-secondary/20">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-12"
          >
            <div>
              <span className="text-sm font-medium tracking-widest text-primary mb-4 block">
                NEW ARRIVALS
              </span>
              <h2 className="font-display text-3xl md:text-4xl font-semibold">
                Our Latest Collection
              </h2>
            </div>
            <Button asChild variant="outline" className="self-start md:self-auto">
              <Link href="/category/silk-sarees">
                View All <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {products.map((product, index) => {
              const variant = product.variants?.[0];
              const price = variant?.price_override ?? product.base_price;
              const image = variant?.image_urls?.[0];

              return (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Link href={`/product/${product.slug}`}>
                    <Card className="group overflow-hidden border-0 shadow-none bg-background">
                      <div className="relative aspect-[3/4] overflow-hidden rounded-lg bg-muted">
                        {image ? (
                          <Image
                            src={image}
                            alt={product.name}
                            fill
                            sizes="(max-width: 768px) 50vw, 25vw"
                            className="object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                        ) : (
                          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-accent/10" />
                        )}

                        {/* Quick view overlay */}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                          <span className="text-white text-sm font-medium">Quick View</span>
                        </div>

                        {/* Rating badge */}
                        {product.avg_rating > 0 && (
                          <div className="absolute top-3 left-3 flex items-center gap-1 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-full text-xs font-medium">
                            <Star className="h-3 w-3 fill-primary text-primary" />
                            {product.avg_rating.toFixed(1)}
                          </div>
                        )}
                      </div>

                      <div className="mt-4 space-y-2">
                        <p className="text-xs text-muted-foreground uppercase tracking-wider">
                          {product.category?.name}
                        </p>
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
        </div>
      </section>

      {/* Brand Story Section */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-8 md:gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="relative"
            >
              <div className="aspect-square rounded-lg overflow-hidden">
                <Image
                  src="https://images.pexels.com/photos/322207/pexels-photo-322207.jpeg"
                  alt="Traditional handloom weaving"
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-cover"
                />
              </div>
              <div className="absolute -bottom-4 -right-4 md:-bottom-8 md:-right-8 w-32 md:w-48 aspect-square bg-primary/10 rounded-full" />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="space-y-6"
            >
              <div>
                <span className="text-sm font-medium tracking-widest text-primary mb-4 block">
                  OUR HERITAGE
                </span>
                <h2 className="font-display text-3xl md:text-4xl font-semibold">
                  Crafted With Care,{' '}
                  <span className="text-primary">Worn With Pride</span>
                </h2>
              </div>

              <p className="text-muted-foreground leading-relaxed">
                At Sri Boutique, every piece tells a story. We work directly with
                skilled artisans across India, preserving traditional weaving
                techniques while embracing contemporary designs that suit the
                modern lifestyle.
              </p>

              <p className="text-muted-foreground leading-relaxed">
                Our commitment to quality means each saree and outfit is
                hand-inspected before reaching you, ensuring you receive nothing
                but the finest craftsmanship.
              </p>

              <div className="flex flex-wrap gap-6 pt-4">
                <div>
                  <p className="font-display text-3xl font-semibold text-primary">500+</p>
                  <p className="text-sm text-muted-foreground">Artisans</p>
                </div>
                <div>
                  <p className="font-display text-3xl font-semibold text-primary">15K+</p>
                  <p className="text-sm text-muted-foreground">Happy Customers</p>
                </div>
                <div>
                  <p className="font-display text-3xl font-semibold text-primary">10+</p>
                  <p className="text-sm text-muted-foreground">Years of Excellence</p>
                </div>
              </div>

              <Button asChild size="lg">
                <Link href="/about">
                  Read Our Story <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Newsletter Section */}
      <section className="py-16 md:py-24 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-2xl mx-auto space-y-6"
          >
            <span className="text-sm font-medium tracking-widest opacity-80">
              STAY CONNECTED
            </span>
            <h2 className="font-display text-3xl md:text-4xl font-semibold">
              Join Our Exclusive Circle
            </h2>
            <p className="text-primary-foreground/80">
              Be the first to know about new collections, exclusive offers,
              and styling tips from our experts.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <Button size="lg" variant="secondary" className="flex-1">
                Subscribe Now
              </Button>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
