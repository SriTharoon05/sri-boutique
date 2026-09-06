'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, LayoutGrid, ShoppingBag, UserRound } from 'lucide-react';
import { useCart } from '@/components/providers/cart-provider';
import { cn } from '@/lib/utils';

const links = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/#categories', label: 'Shop', icon: LayoutGrid },
  { href: '/cart', label: 'Bag', icon: ShoppingBag },
  { href: '/account', label: 'Me', icon: UserRound },
];

export function MobileBottomNav() {
  const pathname = usePathname();
  const { itemCount } = useCart();

  return (
    <nav aria-label="Mobile quick navigation" className="fixed inset-x-0 bottom-0 z-50 border-t border-foreground/30 bg-background/95 px-3 pb-[max(.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-md md:hidden">
      <div className="grid grid-cols-4">
        {links.map(({ href, label, icon: Icon }) => {
          const active = href === '/' ? pathname === '/' : pathname.startsWith(href.split('#')[0]);
          return (
            <Link key={href} href={href} className={cn('relative flex min-h-12 flex-col items-center justify-center gap-1 text-[10px] font-bold uppercase tracking-wider', active ? 'text-accent' : 'text-foreground/65')}>
              <Icon className="h-5 w-5" strokeWidth={active ? 2.8 : 2} />
              <span>{label}</span>
              {label === 'Bag' && itemCount > 0 && <span className="absolute right-[27%] top-0 grid h-5 min-w-5 place-items-center rounded-full bg-secondary px-1 text-[10px] text-secondary-foreground">{itemCount}</span>}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
