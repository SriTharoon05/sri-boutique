import Link from 'next/link';
import { ArrowUpRight, MapPin } from 'lucide-react';
import { STORE_ADDRESS } from '@/lib/site';

const support = [['Shipping', '/shipping'], ['Returns', '/returns'], ['Size guide', '/size-guide'], ['FAQs', '/faq']];
const company = [['Our story', '/about'], ['Contact', '/contact'], ['Privacy', '/privacy'], ['Terms', '/terms']];

export function Footer() {
  return (
    <footer className="border-t border-foreground/30 bg-primary text-primary-foreground">
      <div className="container mx-auto px-4 py-14 md:py-20">
        <div className="grid gap-12 md:grid-cols-[1.4fr_.6fr_.6fr]">
          <div><Link href="/" className="inline-flex items-center gap-3 text-4xl font-black tracking-[-0.08em] md:text-6xl">SRI <span className="-rotate-2 bg-accent px-3 py-2 text-sm tracking-wide text-accent-foreground">BOUTIQUE</span></Link><p className="mt-5 max-w-xl text-lg text-background/70">Indian fashion with a louder point of view. Fresh drops, expressive drapes, and occasion-ready edits curated in Chennai.</p><address className="mt-6 flex max-w-md gap-3 not-italic text-sm text-background/70"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-secondary" /><span>{STORE_ADDRESS}</span></address></div>
          <div><h3 className="mb-5 text-xs font-black uppercase tracking-[.2em] text-secondary">Need help?</h3><ul className="space-y-3">{support.map(([label, href]) => <li key={href}><Link href={href} className="inline-flex items-center gap-1 text-sm hover:text-secondary">{label}<ArrowUpRight className="h-3 w-3" /></Link></li>)}</ul></div>
          <div><h3 className="mb-5 text-xs font-black uppercase tracking-[.2em] text-secondary">More Sri</h3><ul className="space-y-3">{company.map(([label, href]) => <li key={href}><Link href={href} className="inline-flex items-center gap-1 text-sm hover:text-secondary">{label}<ArrowUpRight className="h-3 w-3" /></Link></li>)}</ul></div>
        </div>
        <div className="mt-14 flex flex-col gap-3 border-t border-background/25 pt-6 text-[11px] uppercase tracking-wider text-background/55 sm:flex-row sm:justify-between"><p>© {new Date().getFullYear()} Sri Boutique</p><p>Secure checkout powered by Razorpay · Built for India</p></div>
      </div>
    </footer>
  );
}
