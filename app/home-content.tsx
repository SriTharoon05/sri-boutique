'use client';

import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ArrowRight, Star, Truck, Shield, Headphones } from 'lucide-react';
import type { Category } from '@/types/database';
import type { CatalogProduct } from '@/lib/demo-catalog';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { getDisplayCategoryImage, getDisplayProductImage, mockImages } from '@/lib/mock-images';

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

interface HomePageContentProps {
  categories: (Category & { _count?: number })[];
  products: CatalogProduct[];
}

export function HomePageContent({ categories, products }: HomePageContentProps) {
  const [email, setEmail] = useState('');
  const [subscribing, setSubscribing] = useState(false);

  const subscribe = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubscribing(true);
    try {
      const response = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not subscribe');
      setEmail('');
      toast.success('You are subscribed to Sri Boutique updates');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not subscribe');
    } finally {
      setSubscribing(false);
    }
  };

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative h-[85vh] min-h-[600px] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/10" />
        <Image
          src={mockImages.hero}
          alt="Saree mannequins displayed in a boutique window"
          fill
          priority
          sizes="100vw"
          className="object-cover object-center opacity-20"
        />

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
              { icon: Headphones, title: 'Personal Support', desc: 'Help when you need it' },
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
                      <Image
                          src={getDisplayCategoryImage(category.slug, category.image_url, index)}
                          alt={category.name}
                          fill
                          sizes="(max-width: 768px) 50vw, 25vw"
                          className="object-cover transition-transform duration-500 group-hover:scale-105"
                        />
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
              const image = getDisplayProductImage(product.slug, variant?.image_urls?.[0], index);

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
                        <Image
                            src={image}
                            alt={product.name}
                            fill
                            sizes="(max-width: 768px) 50vw, 25vw"
                            className="object-cover transition-transform duration-500 group-hover:scale-105"
                          />

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
              <div className="relative aspect-square rounded-lg overflow-hidden">
                <Image
                  src={mockImages.heritage}
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
                  <p className="font-display text-2xl font-semibold text-primary">Handpicked</p>
                  <p className="text-sm text-muted-foreground">Curated collections</p>
                </div>
                <div>
                  <p className="font-display text-2xl font-semibold text-primary">Quality checked</p>
                  <p className="text-sm text-muted-foreground">Before dispatch</p>
                </div>
                <div>
                  <p className="font-display text-2xl font-semibold text-primary">Pan-India</p>
                  <p className="text-sm text-muted-foreground">Secure delivery</p>
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

            <form onSubmit={subscribe} className="flex flex-col sm:flex-row gap-3 max-w-lg mx-auto">
              <label htmlFor="newsletter-email" className="sr-only">Email address</label>
              <Input
                id="newsletter-email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="h-11 bg-background text-foreground"
              />
              <Button type="submit" size="lg" variant="secondary" disabled={subscribing}>
                {subscribing ? 'Subscribing…' : 'Subscribe'}
              </Button>
            </form>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
