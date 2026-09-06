'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { MainLayout } from '@/components/layout/main-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { calculateProtectedPrice } from '@/lib/suppliers/pricing';
import type { SupplierSettings } from '@/lib/suppliers/types';
import { AlertTriangle, CheckCircle2, KeyRound, Loader2, Package, PlugZap, RefreshCw, Save, ShieldCheck, Truck } from 'lucide-react';
import { toast } from 'sonner';

type SupplierView = SupplierSettings & { apiKeyConfigured: boolean };
type CatalogMode = 'dropship' | 'hybrid' | 'inventory';
type Activity = { id: string; order_id?: string; status: string; started_at?: string; created_at?: string; products_upserted?: number; variants_upserted?: number; last_error?: string; order?: { order_number?: string } };

const numericFields: Array<{ key: keyof SupplierSettings; label: string; hint: string; step?: string }> = [
  { key: 'target_margin_percent', label: 'Target margin', hint: 'Percentage retained after estimated operating costs.', step: '0.5' },
  { key: 'minimum_profit', label: 'Minimum profit', hint: 'Absolute rupee profit protected on every unit.' },
  { key: 'forward_shipping_buffer', label: 'Forward shipping buffer', hint: 'Estimated supplier-to-customer delivery cost.' },
  { key: 'return_cost_buffer', label: 'Return reserve', hint: 'Reserve included in every sale to absorb RTO and returns.' },
  { key: 'payment_fee_percent', label: 'Payment fee', hint: 'Gateway fee and related percentage costs.', step: '0.1' },
  { key: 'tax_reserve_percent', label: 'Tax reserve', hint: 'Conservative percentage held back for taxes.', step: '0.1' },
];

export default function SupplierSettingsPage() {
  const [suppliers, setSuppliers] = useState<SupplierView[]>([]);
  const [runs, setRuns] = useState<Activity[]>([]);
  const [orders, setOrders] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [exampleCost, setExampleCost] = useState(1000);
  const [catalogMode, setCatalogMode] = useState<CatalogMode>('dropship');
  const [checkoutEnabled, setCheckoutEnabled] = useState(true);
  const active = suppliers[0];

  const load = useCallback(async () => {
    const response = await fetch('/api/admin/suppliers', { cache: 'no-store' });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Could not load supplier settings');
    setSuppliers(data.suppliers || []);
    setRuns(data.runs || []);
    setOrders(data.orders || []);
    setCatalogMode(data.commerce?.catalog_mode || 'dropship');
    setCheckoutEnabled(data.commerce?.checkout_enabled ?? true);
  }, []);

  useEffect(() => {
    load().catch((error) => toast.error(error.message)).finally(() => setLoading(false));
  }, [load]);

  const preview = useMemo(() => active ? calculateProtectedPrice(exampleCost, active) : null, [active, exampleCost]);
  const update = (key: keyof SupplierSettings, value: unknown) => setSuppliers((current) => current.map((supplier, index) => index === 0 ? { ...supplier, [key]: value } : supplier));

  const perform = async (action: 'save' | 'test' | 'sync' | 'full-sync') => {
    if (!active) return;
    setBusy(action);
    try {
      const response = action === 'save'
        ? await fetch('/api/admin/suppliers', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...active, catalog_mode: catalogMode, checkout_enabled: checkoutEnabled }) })
        : action === 'test'
          ? await fetch(`/api/admin/suppliers/${active.code}/test`, { method: 'POST' })
          : await fetch(`/api/admin/suppliers/${active.code}/sync`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fullSync: action === 'full-sync' }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Action failed');
      toast.success(action === 'save' ? 'Supplier settings saved' : action === 'test' ? data.message : `${data.productsUpserted} products and ${data.variantsUpserted} variants synced`);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Action failed');
    } finally {
      setBusy(null);
    }
  };

  const retryOrder = async (order: Activity) => {
    if (!order.order_id) return;
    setBusy(order.id);
    try {
      const response = await fetch(`/api/admin/supplier-orders/${order.order_id}/dispatch`, { method: 'POST' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Dispatch failed');
      toast.success('Supplier order dispatch retried');
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Dispatch failed');
    } finally { setBusy(null); }
  };

  if (loading) return <MainLayout><div className="min-h-[60vh] grid place-items-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></MainLayout>;
  if (!active) return <MainLayout><div className="container mx-auto px-4 py-12"><Alert variant="destructive"><AlertTriangle className="h-4 w-4" /><AlertTitle>Supplier tables are not ready</AlertTitle><AlertDescription>Apply migration 012 to your Supabase project, then reload this page.</AlertDescription></Alert></div></MainLayout>;

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8 md:py-12 max-w-6xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-7">
          <div>
            <div className="flex items-center gap-2 mb-2"><Truck className="h-5 w-5 text-primary" /><span className="text-sm font-medium text-primary">Dropshipping control centre</span></div>
            <h1 className="font-display text-3xl md:text-4xl font-semibold">{active.name} supplier</h1>
            <p className="text-muted-foreground mt-2 max-w-2xl">Control catalogue sync, publishing and profit protection without exposing your API key.</p>
          </div>
          <Badge className={active.apiKeyConfigured ? 'bg-emerald-100 text-emerald-800 w-fit' : 'bg-amber-100 text-amber-900 w-fit'}>
            {active.apiKeyConfigured ? <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> : <KeyRound className="h-3.5 w-3.5 mr-1" />}
            {active.apiKeyConfigured ? 'API key configured' : 'API key required'}
          </Badge>
        </div>

        {!active.apiKeyConfigured && <Alert className="mb-6 border-amber-300 bg-amber-50"><KeyRound className="h-4 w-4" /><AlertTitle>Connect SheScale when your key arrives</AlertTitle><AlertDescription>Add <code>SHESCALE_API_KEY=sk_live_…</code> to the hosting environment and redeploy. The key is never sent to this page or saved in the database.</AlertDescription></Alert>}

        <Tabs defaultValue="connection">
          <TabsList className="w-full h-auto grid grid-cols-3 mb-6">
            <TabsTrigger value="connection">Connection</TabsTrigger>
            <TabsTrigger value="pricing">Profit rules</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="connection" className="space-y-5">
            <div className="grid md:grid-cols-3 gap-4">
              {[
                { key: 'enabled' as const, title: 'Supplier enabled', text: 'Allows synced products and order dispatch.' },
                { key: 'sync_enabled' as const, title: 'Catalogue sync', text: 'Allows imports and stock refreshes.' },
                { key: 'auto_publish' as const, title: 'Auto publish', text: 'Immediately list in-stock supplier products.' },
              ].map((item) => <Card key={item.key} className="p-5 flex items-start justify-between gap-4"><div><Label htmlFor={item.key} className="text-base">{item.title}</Label><p className="text-sm text-muted-foreground mt-1">{item.text}</p></div><Switch id={item.key} checked={Boolean(active[item.key])} onCheckedChange={(checked) => update(item.key, checked)} /></Card>)}
            </div>
            <Card className="p-5 md:p-6">
              <h2 className="font-display text-xl font-semibold">Storefront mode</h2>
              <p className="text-sm text-muted-foreground mt-1 mb-5">Choose which product sources customers can browse. Your own inventory remains saved when hidden.</p>
              <div className="grid sm:grid-cols-3 gap-3">
                {([['dropship', 'Dropship only'], ['hybrid', 'Dropship + own stock'], ['inventory', 'Own stock only']] as const).map(([value, label]) => <button type="button" key={value} onClick={() => setCatalogMode(value)} className={`min-h-12 rounded-lg border px-4 py-3 text-left text-sm font-medium transition-colors ${catalogMode === value ? 'border-primary bg-primary/10 text-primary' : 'hover:bg-muted'}`}>{label}</button>)}
              </div>
              <div className="flex items-center justify-between gap-4 mt-5 pt-5 border-t"><div><Label htmlFor="checkout_enabled" className="text-base">Customer checkout</Label><p className="text-sm text-muted-foreground">Emergency switch to pause new orders.</p></div><Switch id="checkout_enabled" checked={checkoutEnabled} onCheckedChange={setCheckoutEnabled} /></div>
            </Card>
            <Card className="p-5 md:p-6">
              <div className="grid sm:grid-cols-2 gap-5">
                <div><Label>API base URL</Label><Input value={active.base_url} disabled className="mt-2" /></div>
                <div><Label>Maximum pages per sync</Label><Input type="number" min="1" max="250" value={active.max_sync_pages} onChange={(event) => update('max_sync_pages', Number(event.target.value))} className="mt-2" /></div>
              </div>
              <div className="flex flex-wrap gap-3 mt-6">
                <Button onClick={() => perform('save')} disabled={Boolean(busy)}>{busy === 'save' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}Save settings</Button>
                <Button variant="outline" onClick={() => perform('test')} disabled={Boolean(busy) || !active.apiKeyConfigured}><PlugZap className="h-4 w-4 mr-2" />Test connection</Button>
                <Button variant="outline" onClick={() => perform('sync')} disabled={Boolean(busy) || !active.apiKeyConfigured || !active.enabled || !active.sync_enabled}>{busy === 'sync' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Package className="h-4 w-4 mr-2" />}Sync changes</Button>
                <Button variant="ghost" onClick={() => perform('full-sync')} disabled={Boolean(busy) || !active.apiKeyConfigured || !active.enabled || !active.sync_enabled}><RefreshCw className="h-4 w-4 mr-2" />Full sync</Button>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="pricing" className="space-y-5">
            <Alert className="border-emerald-200 bg-emerald-50"><ShieldCheck className="h-4 w-4" /><AlertTitle>Protected pricing</AlertTitle><AlertDescription>Customer prices use the higher of your target-margin price and absolute minimum-profit floor. Checkout also caps coupon discounts at this protected floor.</AlertDescription></Alert>
            <div className="grid lg:grid-cols-[1fr_340px] gap-5">
              <Card className="p-5 md:p-6 grid sm:grid-cols-2 gap-5">
                {numericFields.map((field) => <div key={field.key}><Label htmlFor={field.key}>{field.label}{String(field.key).includes('percent') ? ' (%)' : ' (₹)'}</Label><Input id={field.key} type="number" min="0" step={field.step || '1'} value={Number(active[field.key])} onChange={(event) => update(field.key, Number(event.target.value))} className="mt-2" /><p className="text-xs text-muted-foreground mt-1.5">{field.hint}</p></div>)}
                <div><Label htmlFor="price_rounding">Round prices up to</Label><Input id="price_rounding" type="number" min="1" max="1000" value={active.price_rounding} onChange={(event) => update('price_rounding', Number(event.target.value))} className="mt-2" /></div>
                <div className="sm:col-span-2"><Button onClick={() => perform('save')} disabled={Boolean(busy)}><Save className="h-4 w-4 mr-2" />Save profit rules</Button></div>
              </Card>
              <Card className="p-5 md:p-6 bg-slate-950 text-white h-fit lg:sticky lg:top-24">
                <p className="text-sm text-slate-300">Pricing preview</p><Label htmlFor="exampleCost" className="text-slate-100 block mt-4">Supplier cost</Label><Input id="exampleCost" type="number" min="0" value={exampleCost} onChange={(event) => setExampleCost(Number(event.target.value))} className="mt-2 bg-white text-slate-950" />
                <div className="mt-6 space-y-3 text-sm"><div className="flex justify-between text-slate-300"><span>Protected floor</span><span>₹{preview?.priceFloor.toLocaleString()}</span></div><div className="flex justify-between text-slate-300"><span>Estimated profit</span><span>₹{preview?.estimatedProfit.toLocaleString()}</span></div><div className="h-px bg-slate-700" /><div className="flex justify-between items-end"><span>Customer price</span><span className="text-3xl font-semibold text-emerald-300">₹{preview?.sellingPrice.toLocaleString()}</span></div></div>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="activity" className="grid lg:grid-cols-2 gap-5">
            <Card className="p-5"><h2 className="font-display text-xl font-semibold mb-4">Catalogue syncs</h2><div className="space-y-3">{runs.length ? runs.map((run) => <div key={run.id} className="flex justify-between gap-4 border-b pb-3 last:border-0"><div><p className="font-medium capitalize">{run.status}</p><p className="text-xs text-muted-foreground">{run.started_at ? new Date(run.started_at).toLocaleString() : ''}</p></div><p className="text-sm text-right">{run.products_upserted || 0} products<br /><span className="text-muted-foreground">{run.variants_upserted || 0} variants</span></p></div>) : <p className="text-sm text-muted-foreground">No syncs yet.</p>}</div></Card>
            <Card className="p-5"><h2 className="font-display text-xl font-semibold mb-4">Supplier orders</h2><div className="space-y-3">{orders.length ? orders.map((order) => <div key={order.id} className="flex justify-between gap-4 border-b pb-3 last:border-0"><div><p className="font-medium">{order.order?.order_number || 'Store order'}</p><p className="text-xs text-muted-foreground">{order.created_at ? new Date(order.created_at).toLocaleString() : ''}</p>{order.last_error ? <p className="text-xs text-red-600 mt-1 max-w-xs">{order.last_error}</p> : null}</div><div className="flex flex-col items-end gap-2"><Badge variant="outline" className="h-fit capitalize">{order.status}</Badge>{order.status === 'failed' && <Button size="sm" variant="outline" onClick={() => retryOrder(order)} disabled={busy === order.id}>{busy === order.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Retry'}</Button>}</div></div>) : <p className="text-sm text-muted-foreground">Supplier orders will appear after paid dropship checkouts.</p>}</div></Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
