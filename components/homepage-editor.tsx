'use client';
import { useState } from 'react';
import { useAuth } from '@/components/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { HomePageContent } from '@/app/home-content';
import type { Category } from '@/types/database';
import type { CatalogProduct } from '@/lib/demo-catalog';
import { applyHomepageSettings, productImages, type HomepageSettings } from '@/lib/homepage-settings';
import { toast } from 'sonner';

export function HomepageEditor({ categories, products, initialSettings, selectedProducts }: {
  categories: Category[]; products: CatalogProduct[]; initialSettings: HomepageSettings; selectedProducts: CatalogProduct[];
}) {
  const { profile } = useAuth();
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [catalogue, setCatalogue] = useState<CatalogProduct[]>(selectedProducts);
  const [saved, setSaved] = useState(initialSettings);
  const [draft, setDraft] = useState(initialSettings);
  const [search, setSearch] = useState('');
  const [slot, setSlot] = useState(`cover:${categories[0]?.slug || ''}`);
  const view = applyHomepageSettings(categories, products, catalogue, editing ? draft : saved);
  async function open() {
    setBusy(true);
    try {
      const response = await fetch('/api/admin/homepage', { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setCatalogue(data.products); setDraft(saved); setEditing(true);
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Unable to open editor'); }
    finally { setBusy(false); }
  }
  function choose(product: CatalogProduct, image: string) {
    const choice = { productId: product.id, image };
    if (slot.startsWith('cover:')) setDraft(d => ({ ...d, covers: { ...d.covers, [slot.slice(6)]: choice } }));
    else {
      const index = Number(slot.slice(8));
      setDraft(d => {
        const featured = view.products.map(p => ({ productId: p.id, image: productImages(p)[0] }));
        const existingIndex = featured.findIndex(p => p.productId === product.id);
        if (existingIndex !== -1 && existingIndex !== index) featured[existingIndex] = featured[index];
        featured[index] = choice;
        return { ...d, featured };
      });
    }
  }
  async function publish() {
    setBusy(true);
    try {
      const response = await fetch('/api/admin/homepage', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(draft) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setSaved(draft); setEditing(false); toast.success('Homepage published');
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Publish failed'); }
    finally { setBusy(false); }
  }
  return <>
    {profile?.role === 'admin' && <div className="border-b bg-background p-4">
      {!editing ? <Button onClick={open} disabled={busy}>{busy ? 'Loading editor…' : 'Edit homepage images'}</Button> : <section aria-label="Homepage editor" className="mx-auto max-w-6xl space-y-4">
        <h2 className="text-xl font-bold">Homepage image editor</h2>
        <p className="text-sm">Private live preview: changes appear in the homepage below. Customers see changes only after Publish.</p>
        <div className="flex flex-wrap gap-3">
          <label>Card to customise<select className="ml-2 rounded border p-2" value={slot} onChange={e => setSlot(e.target.value)}>
            {categories.map(c => <option key={c.slug} value={`cover:${c.slug}`}>Category: {c.name}</option>)}
            {[0,1,2,3].map(i => <option key={i} value={`product:${i}`}>New drops: card {i+1}</option>)}
          </select></label>
          <input aria-label="Search product images" placeholder="Search products…" className="rounded border p-2" value={search} onChange={e => setSearch(e.target.value)} />
          <Button disabled={busy} onClick={publish}>Publish changes</Button>
          <Button variant="outline" disabled={busy} onClick={() => { setDraft(saved); setEditing(false); }}>Cancel</Button>
          <Button variant="outline" disabled={busy} onClick={() => setDraft({ covers: {}, featured: [] })}>Preview automatic defaults</Button>
          <a className="underline p-2" href={slot.startsWith('cover:') ? '#categories' : '#new-drops'}>See live preview ↓</a>
        </div>
        <div className="grid max-h-80 grid-cols-2 gap-3 overflow-y-auto rounded border p-3 md:grid-cols-4">
          {catalogue.filter(p => p.name.toLowerCase().includes(search.toLowerCase())).map(p => <div key={p.id}>
            <p className="mb-2 text-xs">{p.name}</p><div className="flex gap-2 overflow-x-auto">{productImages(p).map((image, i) => <button type="button" disabled={busy} key={image} aria-label={`Use ${p.name}, image ${i+1}`} onClick={() => choose(p, image)} className="shrink-0 rounded border hover:ring-2 hover:ring-primary">
              {/* Existing catalogue URLs only; thumbnails load lazily. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image} alt={`${p.name} ${i+1}`} loading="lazy" className="h-28 w-20 object-cover" />
            </button>)}</div>
          </div>)}
        </div>
      </section>}
    </div>}
    <HomePageContent categories={view.categories} products={view.products} />
  </>;
}
