'use client';
import { storefrontSlug } from '@/lib/storefront-brand';

import { useState } from 'react';
import { useVendorQuota } from '@/components/providers/vendor-quota-provider';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowDownRight, ArrowRight, Check, RotateCcw, ShieldCheck, Sparkles, Truck } from 'lucide-react';
import type { Category } from '@/types/database';
import type { CatalogProduct } from '@/lib/demo-catalog';
import { getDisplayCategoryImage, getDisplayProductImage, mockImages } from '@/lib/mock-images';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

interface HomePageContentProps {
  categories: (Category & { _count?: number })[];
  products: CatalogProduct[];
}

const reveal = { initial: { opacity: 0, y: 28 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, margin: '-80px' }, transition: { duration: 0.55 } };

function Eyebrow({ children, inverse = false }: { children: React.ReactNode; inverse?: boolean }) {
  return <p className={`mb-3 text-xs font-black uppercase tracking-[.22em] ${inverse ? 'text-secondary' : 'text-primary'}`}>{children}</p>;
}

export function HomePageContent({ categories, products }: HomePageContentProps) {
  const quota = useVendorQuota();
  const [email, setEmail] = useState('');
  const [subscribing, setSubscribing] = useState(false);
  const firstCategory = categories[0];

  async function subscribe(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubscribing(true);
    try {
      const response = await fetch('/api/newsletter', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not subscribe');
      setEmail('');
      toast.success('You are on the Sri list ✦');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not subscribe');
    } finally {
      setSubscribing(false);
    }
  }

  return (
    <div className="home-editorial overflow-hidden">
      <section aria-label="Sri Boutique fashion collection" className="campaign-hero">
        <p className="campaign-label">Curated for your everyday</p>
        <h1 className="campaign-heading"><span>Find your</span><span>own kind</span><span className="sr-only">of style.</span></h1>
        <div className="campaign-model">
          <Image src="/images/sri-modern-model.png" alt="Fashion model in a sage blazer, white top and cream trousers" fill priority sizes="(max-width: 768px) 90vw, 49vw" className="object-contain object-bottom" />
        </div>
        <p aria-hidden="true" className="campaign-ending">of <em>style.</em></p>
        <div className="campaign-action">
          <p>Fresh finds, effortless favourites. Discover pieces that feel like you.</p>
          <Button asChild size="lg" className="h-12 rounded-full px-7"><Link href="#new-drops">Shop the collection <ArrowRight className="ml-3 h-4 w-4" /></Link></Button>
        </div>
      </section>

      <section aria-label="Store benefits" className="overflow-hidden border-b border-border bg-secondary/35 py-3">
        <div className="marquee-track flex whitespace-nowrap text-sm font-black uppercase tracking-[.08em]">{[0, 1].map((copy) => <div key={copy} className="flex">{['Expressive edits', 'Secure checkout', 'Fresh drops', 'Pan-India delivery', 'Real support'].map((text) => <span key={`${copy}-${text}`} className="flex items-center"><span className="mx-6">{text}</span><span>✳</span></span>)}</div>)}</div>
      </section>

      <section id="categories" className="container mx-auto px-4 py-16 md:py-24">
        <motion.div {...reveal} className="mb-10 flex items-end justify-between gap-5"><div><Eyebrow>Choose your energy</Eyebrow><h2 className="max-w-3xl text-4xl font-black uppercase leading-[.9] sm:text-6xl">Shop by<br />current mood.</h2></div><span className="hidden max-w-xs text-right text-sm text-muted-foreground md:block">Find your next favourite, one collection at a time.</span></motion.div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-5">
          {categories.map((category, index) => <motion.div key={category.id} {...reveal} transition={{ duration: .45, delay: index * .07 }} >
            <Link href={`/category/${storefrontSlug(category.slug)}`} className="group block">
              <div className="relative aspect-[3/4] overflow-hidden border border-border bg-muted"><Image src={getDisplayCategoryImage(category.slug, category.image_url, index)} alt={category.name} fill sizes="(max-width: 768px) 50vw, 25vw" className="object-cover saturate-[.88] transition duration-500 group-hover:scale-105 group-hover:saturate-100" /><span className="absolute left-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-background text-[11px] font-black">0{index + 1}</span><div className="absolute inset-x-0 bottom-0 bg-foreground/85 p-3 text-background sm:p-4"><div className="flex items-center justify-between gap-2"><h3 className="text-base font-bold tracking-tight sm:text-xl">{category.name}</h3><ArrowDownRight className="h-5 w-5 shrink-0 transition-transform group-hover:-rotate-45" /></div>{Boolean(category._count) && <p className="mt-1 text-[10px] uppercase text-background/65">{category._count} styles</p>}</div></div>
            </Link>
          </motion.div>)}
        </div>
      </section>

      <section id="new-drops" className="border-y border-border bg-accent/10 py-16 md:py-24">
        <div className="container mx-auto px-4">
          <motion.div {...reveal} className="mb-10 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"><div><Eyebrow>Just landed</Eyebrow><h2 className="text-5xl font-black leading-[.9] sm:text-7xl">New<br /><span className="font-editorial font-medium italic text-accent">drops.</span></h2></div>{firstCategory && <Button asChild variant="outline"><Link href={`/category/${storefrontSlug(firstCategory.slug)}`}>View collection <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>}</motion.div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-8 md:grid-cols-4 md:gap-x-5">
            {products.map((product, index) => {
              const variant = product.variants?.[0];
              const price = variant?.price_override ?? product.base_price;
              const compareAt = product.compare_at_price;
              const image = getDisplayProductImage(product.slug, variant?.image_urls?.[0], index);
              const fulfilment = product.source_type === 'dropship' ? (quota.blocked ? 'Unavailable today' : 'Available') : (variant?.stock_quantity || 0) > 0 ? 'Ready to ship' : 'Preview';
              return <motion.article key={product.id} {...reveal} transition={{ duration: .45, delay: index * .06 }} className="group">
                <Link href={`/product/${storefrontSlug(product.slug)}`} className="block">
                  <div className="relative aspect-[3/4] overflow-hidden border border-border bg-muted"><Image src={image} alt={product.name} fill sizes="(max-width: 768px) 50vw, 25vw" className="object-cover saturate-[.9] transition duration-500 group-hover:scale-[1.04] group-hover:saturate-100" /><span className={`absolute left-2 top-2 px-2 py-1 text-[9px] font-bold uppercase tracking-wider ${index % 2 ? 'bg-secondary' : 'bg-accent'}`}>{index === 0 ? 'New' : fulfilment}</span><span className="absolute inset-x-3 bottom-3 translate-y-3 bg-foreground/90 py-3 text-center text-xs font-bold text-background opacity-0 transition-all group-hover:translate-y-0 group-hover:opacity-100">View details</span></div>
                  {product.source_type === 'dropship' && quota.blocked && <p className="mt-2 text-xs text-destructive">{quota.message}</p>}
                  <div className="pt-3"><p className="text-[10px] font-bold uppercase tracking-[.15em] text-muted-foreground">{product.category?.name || 'Sri edit'}</p><h3 className="mt-1 min-h-10 text-sm font-bold leading-tight sm:text-base">{product.name}</h3><div className="mt-2 flex flex-wrap items-center gap-2"><span className="font-black">₹{price.toLocaleString('en-IN')}</span>{compareAt && compareAt > price && <span className="text-xs text-muted-foreground line-through">₹{compareAt.toLocaleString('en-IN')}</span>}</div></div>
                </Link>
              </motion.article>;
            })}
          </div>
        </div>
      </section>

      <section className="grid border-b border-border lg:grid-cols-2">
        <div className="relative min-h-[520px] overflow-hidden border-b border-border lg:border-b-0 lg:border-r"><Image src={mockImages.heritage} alt="Close-up of colorful Indian textile craftsmanship" fill sizes="(max-width: 1024px) 100vw, 50vw" className="object-cover saturate-[.82]" /><div className="absolute left-5 top-5 border border-foreground/50 bg-secondary/90 px-4 py-3 text-sm font-bold editorial-shadow">Texture is the trend</div></div>
        <motion.div {...reveal} className="flex flex-col justify-center bg-secondary/25 px-5 py-16 sm:px-10 lg:px-16"><Eyebrow>Made with intention</Eyebrow><h2 className="text-5xl font-black leading-[.92] sm:text-7xl">Classic craft.<br /><span className="font-editorial font-medium italic text-accent">New attitude.</span></h2><p className="mt-7 max-w-xl text-lg leading-relaxed">We curate expressive Indian fashion for real wardrobes—clear product details, quality checks, protected payments, and support when you need a human answer.</p><div className="mt-8 grid gap-3 sm:grid-cols-2">{['Curated catalogue', 'Quality-focused selection', 'Transparent pricing', 'Chennai-based support'].map((text) => <p key={text} className="flex items-center gap-2 border-t border-foreground/40 pt-3 text-sm font-semibold"><Check className="h-4 w-4" />{text}</p>)}</div><Button asChild className="mt-9 self-start"><Link href="/about">Meet Sri Boutique <ArrowRight className="ml-2 h-4 w-4" /></Link></Button></motion.div>
      </section>

      <section className="container mx-auto px-4 py-16 md:py-20">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[
          [Truck, 'Pan-India delivery', 'Tracked fulfilment updates'], [ShieldCheck, 'Protected payments', 'Checkout secured by Razorpay'], [RotateCcw, 'Clear returns', 'Policies written in plain language'], [Sparkles, 'Always fresh', 'Discover the latest collection'],
        ].map(([Icon, title, copy]) => { const FeatureIcon = Icon as typeof Truck; return <div key={String(title)} className="border border-border p-5 transition-colors hover:bg-secondary/60"><FeatureIcon className="h-6 w-6" /><h3 className="mt-7 text-base font-bold">{String(title)}</h3><p className="mt-1 text-sm text-muted-foreground">{String(copy)}</p></div>; })}</div>
      </section>

      <section className="border-t border-border bg-secondary/35 px-4 py-16 md:py-24">
        <motion.div {...reveal} className="container mx-auto grid gap-10 lg:grid-cols-[1fr_.8fr] lg:items-end"><div><p className="text-xs font-black uppercase tracking-[.22em]">The inbox drop</p><h2 className="mt-3 text-5xl font-black leading-[.9] sm:text-7xl">Get first<br /><span className="font-editorial font-medium italic">dibs.</span></h2><p className="mt-5 max-w-xl font-medium">New edits, restocks, and offers—sent occasionally, never annoyingly.</p></div><form onSubmit={subscribe} className="flex flex-col gap-3 sm:flex-row"><label htmlFor="newsletter-email" className="sr-only">Email address</label><Input id="newsletter-email" type="email" required autoComplete="email" placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} className="h-12 border border-foreground/50 bg-background font-medium placeholder:text-foreground/45" /><Button type="submit" size="lg" disabled={subscribing} className="h-12">{subscribing ? 'Joining…' : 'Join the list'}</Button></form></motion.div>
      </section>
    </div>
  );
}
