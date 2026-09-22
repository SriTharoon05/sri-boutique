'use client';
import { storefrontSlug } from '@/lib/storefront-brand';
import { groupCategories } from '@/lib/category-groups';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, LayoutDashboard, LogOut, Menu, Package, ShoppingBag, User, X } from 'lucide-react';
import { useAuth } from '@/components/providers/auth-provider';
import { useCart } from '@/components/providers/cart-provider';
import { getDisplayProductImage } from '@/lib/mock-images';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { SearchDialog } from './search-dialog';

type NavigationCategory = { id: string; name: string; slug: string };

export function Header() {
  const { user, profile, signOut, loading } = useAuth();
  const { itemCount, items } = useCart();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [navigationCategories, setNavigationCategories] = useState<NavigationCategory[]>([]);

  useEffect(() => {
    let active = true;
    const supabase = createClient();
    async function loadCategories() {
      const supplierCategories = await supabase.from('categories').select('id, name, slug').not('supplier_id', 'is', null).order('name');
      const result = supplierCategories.data?.length ? supplierCategories : await supabase.from('categories').select('id, name, slug').is('parent_id', null).order('name').limit(50);
      if (active && !result.error) setNavigationCategories(groupCategories((result.data || []) as NavigationCategory[]));
    }
    void loadCategories();
    window.addEventListener('catalog-updated', loadCategories);
    return () => { active = false; window.removeEventListener('catalog-updated', loadCategories); };
  }, []);

  const navLinks = navigationCategories.length
    ? navigationCategories.map((category) => ({ href: `/category/${storefrontSlug(category.slug)}`, label: category.name }))
    : [{ href: '/#categories', label: 'Shop all' }];
  const desktopLinks = navLinks.slice(0, 6);
  const overflowLinks = navLinks.slice(6);
  const subtotal = items.reduce((sum, item) => sum + (item.variant.price_override ?? item.variant.product?.base_price ?? 0) * item.quantity, 0);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-foreground/30 bg-background/95 backdrop-blur-md">
      <div className="hidden md:block overflow-hidden border-b border-border bg-secondary/35 text-secondary-foreground">
        <div className="marquee-track flex h-7 items-center whitespace-nowrap text-[10px] font-black uppercase tracking-[0.18em] sm:text-xs">
          {[0, 1].map((copy) => <div key={copy} className="flex items-center">{['Fresh drops, zero basic', 'Secure payments', 'Easy support', 'Made to be noticed'].map((text) => <span key={`${copy}-${text}`} className="flex items-center"><span className="mx-4">{text}</span><span aria-hidden="true">✦</span></span>)}</div>)}
        </div>
      </div>

      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" aria-label="Sri Boutique home" className="group inline-flex items-center gap-2.5 leading-none">
          <span className="text-2xl font-black tracking-[-0.08em] sm:text-3xl">SRI</span>
          <span className="-rotate-2 bg-accent px-2.5 py-1.5 text-[11px] font-black uppercase tracking-wide text-accent-foreground transition-transform group-hover:rotate-0 sm:px-3 sm:text-xs">Boutique</span>
        </Link>

        <div className="flex items-center gap-1 sm:gap-2">
          <SearchDialog />
          <Sheet>
            <SheetTrigger asChild><Button variant="ghost" size="icon" className="relative" aria-label={`Open shopping bag with ${itemCount} items`}><ShoppingBag className="h-5 w-5" />{itemCount > 0 && <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1 text-[10px] font-bold">{itemCount}</span>}</Button></SheetTrigger>
            <SheetContent className="w-full border-l border-foreground/30 sm:max-w-lg">
              <SheetHeader><SheetTitle className="text-2xl font-black uppercase">Your bag</SheetTitle><SheetDescription>Review your saved items before checkout.</SheetDescription></SheetHeader>
              <div className="mt-7 max-h-[calc(100vh-10rem)] overflow-y-auto pr-1">
                {items.length === 0 ? <div className="grid place-items-center border border-dashed border-foreground/50 px-6 py-14 text-center"><ShoppingBag className="mb-4 h-10 w-10" /><p className="font-bold">Your bag needs a main character.</p><Button asChild className="mt-5"><Link href="/#new-drops">Shop new drops</Link></Button></div> : <>
                  <div className="space-y-3">{items.map((item, index) => {
                    const price = item.variant.price_override ?? item.variant.product?.base_price ?? 0;
                    const image = getDisplayProductImage(item.variant.product?.slug || item.variant_id, item.variant.image_urls?.[0], index);
                    return <div key={item.id} className="flex gap-4 border-b border-foreground/25 py-4"><div className="relative h-24 w-20 shrink-0 overflow-hidden bg-muted"><Image src={image} alt="" fill sizes="80px" className="object-cover" /></div><div className="min-w-0 flex-1"><p className="truncate font-bold">{item.variant.product?.name}</p><p className="mt-1 text-xs uppercase text-muted-foreground">{[item.variant.color, item.variant.size].filter(Boolean).join(' · ')}</p><div className="mt-4 flex justify-between font-bold"><span>₹{price.toLocaleString('en-IN')}</span><span className="text-xs">QTY {item.quantity}</span></div></div></div>;
                  })}</div>
                  <div className="mt-6 space-y-3"><div className="flex justify-between text-xl font-black"><span>SUBTOTAL</span><span>₹{subtotal.toLocaleString('en-IN')}</span></div><Button asChild className="w-full"><Link href="/checkout">Checkout</Link></Button><Button asChild variant="outline" className="w-full"><Link href="/cart">Edit bag</Link></Button></div>
                </>}
              </div>
            </SheetContent>
          </Sheet>

          {loading ? <div className="h-10 w-10 animate-pulse bg-muted" /> : user ? <DropdownMenu>
            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" aria-label="Open account menu"><User className="h-5 w-5" /></Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60 border-2 border-foreground"><div className="px-2 py-2"><p className="font-bold">{profile?.full_name || 'Your account'}</p><p className="truncate text-xs text-muted-foreground">{profile?.email}</p></div><DropdownMenuSeparator /><DropdownMenuItem asChild><Link href="/account"><User className="mr-2 h-4 w-4" />My account</Link></DropdownMenuItem><DropdownMenuItem asChild><Link href="/account/orders"><Package className="mr-2 h-4 w-4" />Orders</Link></DropdownMenuItem>{profile?.role === 'admin' && <><DropdownMenuSeparator /><DropdownMenuItem asChild><Link href="/admin"><LayoutDashboard className="mr-2 h-4 w-4" />Admin</Link></DropdownMenuItem></>}<DropdownMenuSeparator /><DropdownMenuItem onClick={signOut} className="text-destructive"><LogOut className="mr-2 h-4 w-4" />Sign out</DropdownMenuItem></DropdownMenuContent>
          </DropdownMenu> : <Button asChild size="sm" className="hidden sm:inline-flex"><Link href="/auth/login">Sign in</Link></Button>}

          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileMenuOpen((open) => !open)} aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'} aria-expanded={mobileMenuOpen}>{mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}</Button>
        </div>
      </div>

      <div className="hidden border-t border-border md:block"><nav className="container mx-auto flex h-10 items-center justify-center gap-8 overflow-hidden px-4 text-xs font-bold uppercase tracking-[0.1em]"><Link href="/#new-drops" className="text-primary">New drops</Link>{desktopLinks.map((link) => <Link key={link.href} href={link.href} className="transition-colors hover:text-primary">{link.label}</Link>)}{overflowLinks.length > 0 && <DropdownMenu><DropdownMenuTrigger className="flex items-center gap-1">More <ChevronDown className="h-3 w-3" /></DropdownMenuTrigger><DropdownMenuContent>{overflowLinks.map((link) => <DropdownMenuItem key={link.href} asChild><Link href={link.href}>{link.label}</Link></DropdownMenuItem>)}</DropdownMenuContent></DropdownMenu>}</nav></div>

      <AnimatePresence>{mobileMenuOpen && <motion.nav initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden border-t border-border bg-primary text-primary-foreground md:hidden"><div className="grid px-4 py-5">{navLinks.map((link, index) => <Link key={link.href} href={link.href} onClick={() => setMobileMenuOpen(false)} className="flex items-center justify-between border-b border-background/25 py-3 text-lg font-black uppercase"><span>{link.label}</span><span className="text-xs text-secondary">0{index + 1}</span></Link>)}{!user && <Link href="/auth/login" onClick={() => setMobileMenuOpen(false)} className="mt-4 text-sm font-bold uppercase text-secondary">Sign in →</Link>}</div></motion.nav>}</AnimatePresence>
    </header>
  );
}
