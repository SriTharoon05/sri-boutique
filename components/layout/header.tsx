'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/components/providers/auth-provider';
import { useCart } from '@/components/providers/cart-provider';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  ShoppingCart,
  User,
  Menu,
  X,
  LogOut,
  Package,
  Settings,
  ChevronDown,
  LayoutDashboard,
} from 'lucide-react';
import { SearchDialog } from './search-dialog';

// NOTE: these slugs must match the `slug` column in your `categories` table exactly.
// Update this list whenever you add/rename/remove categories.
const navLinks = [
  { href: '/category/silk-sarees', label: 'Silk Sarees' },
  { href: '/category/cotton-sarees', label: 'Cotton Sarees' },
  { href: '/category/lehengas', label: 'Lehengas' },
  { href: '/category/salwar-suits', label: 'Salwar Suits' },
  { href: '/category/kurtis', label: 'Kurtis' },
  { href: '/category/blouses', label: 'Blouses' },
];

export function Header() {
  const { user, profile, signOut, loading } = useAuth();
  const { itemCount, items } = useCart();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const subtotal = items.reduce((sum, item) => {
    const price = item.variant.price_override ?? item.variant.product?.base_price ?? 0;
    return sum + price * item.quantity;
  }, 0);

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <span className="font-display text-2xl font-semibold tracking-tight text-primary">
              Sri Boutique
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Right side actions */}
          <div className="flex items-center space-x-4">
            <SearchDialog />
            {/* Cart */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="relative" aria-label="Open shopping cart">
                  <ShoppingCart className="h-5 w-5" />
                  {itemCount > 0 && (
                    <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
                      {itemCount}
                    </Badge>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent className="w-full sm:max-w-lg">
                <SheetHeader>
                  <SheetTitle className="font-display">Shopping Cart</SheetTitle>
                  <SheetDescription className="sr-only">
                    Review items in your shopping cart
                  </SheetDescription>
                </SheetHeader>
                <div className="mt-8 overflow-y-auto">
                  {items.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <ShoppingCart className="h-12 w-12 text-muted-foreground/50 mb-4" />
                      <p className="text-muted-foreground">Your cart is empty</p>
                      <Button asChild className="mt-4">
                        <Link href="/">Continue Shopping</Link>
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-4">
                        {items.map((item) => {
                          const price = item.variant.price_override ?? item.variant.product?.base_price ?? 0;
                          return (
                            <div key={item.id} className="flex gap-4 py-4 border-b">
                              <div className="w-20 h-20 bg-muted rounded-md flex-shrink-0"></div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium truncate">{item.variant.product?.name}</p>
                                <p className="text-sm text-muted-foreground">
                                  {item.variant.color} / {item.variant.size}
                                </p>
                                <div className="flex items-center justify-between mt-2">
                                  <span className="font-medium">₹{price.toLocaleString()}</span>
                                  <span className="text-sm text-muted-foreground">Qty: {item.quantity}</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <div className="mt-6 space-y-4">
                        <div className="flex justify-between text-lg font-semibold">
                          <span>Subtotal</span>
                          <span>₹{subtotal.toLocaleString()}</span>
                        </div>
                        <Button asChild className="w-full">
                          <Link href="/cart">View Cart</Link>
                        </Button>
                        <Button asChild variant="outline" className="w-full">
                          <Link href="/checkout">Checkout</Link>
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              </SheetContent>
            </Sheet>

            {/* User Menu */}
            {loading ? (
              <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
            ) : user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                      {profile?.avatar_url ? (
                        <Image
                          src={profile.avatar_url}
                          alt={profile.full_name || 'User'}
                          width={32}
                          height={32}
                          className="h-8 w-8 rounded-full object-cover"
                        />
                      ) : (
                        <User className="h-4 w-4 text-primary" />
                      )}
                    </div>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-2 py-1.5">
                    <p className="font-medium">{profile?.full_name || 'User'}</p>
                    <p className="text-xs text-muted-foreground">{profile?.email}</p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/account" className="flex items-center">
                      <User className="mr-2 h-4 w-4" />
                      My Account
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/account/orders" className="flex items-center">
                      <Package className="mr-2 h-4 w-4" />
                      Orders
                    </Link>
                  </DropdownMenuItem>
                  {profile?.role === 'admin' && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link href="/admin" className="flex items-center">
                          <LayoutDashboard className="mr-2 h-4 w-4" />
                          Admin Dashboard
                        </Link>
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={signOut} className="text-destructive">
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button asChild variant="default">
                <Link href="/auth/login">Sign In</Link>
              </Button>
            )}

            {/* Mobile Menu */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden overflow-hidden"
            >
              <nav className="flex flex-col py-4 space-y-2">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors py-2"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}
