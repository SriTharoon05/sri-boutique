import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/admin-auth';
import { createAdminClient } from '@/lib/supabase/admin-client';

const settingsSchema = z.object({
  id: z.string().uuid(),
  enabled: z.boolean(),
  sync_enabled: z.boolean(),
  auto_publish: z.boolean(),
  catalog_mode: z.enum(['dropship', 'hybrid', 'inventory']),
  checkout_enabled: z.boolean(),
  target_margin_percent: z.number().min(0).max(79),
  minimum_profit: z.number().min(0).max(100000),
  forward_shipping_buffer: z.number().min(0).max(100000),
  return_cost_buffer: z.number().min(0).max(100000),
  payment_fee_percent: z.number().min(0).max(24),
  tax_reserve_percent: z.number().min(0).max(49),
  price_rounding: z.number().int().min(1).max(1000),
  max_sync_pages: z.number().int().min(1).max(250),
  markup_percent: z.number().min(0).max(500).default(25),
  refresh_seconds: z.number().int().min(15).max(3600).default(15),
  cod_enabled: z.boolean().default(false),
  cod_advance: z.number().min(1).max(10000).default(100),
  cod_fee: z.number().min(0).max(10000).default(100),
});

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const db: any = createAdminClient();
  const [{ data: suppliers, error }, { data: runs }, { data: orders }, { data: commerce }] = await Promise.all([
    db.from('suppliers').select('*').order('created_at'),
    db.from('supplier_sync_runs').select('*').order('started_at', { ascending: false }).limit(8),
    db.from('supplier_orders').select('*, order:orders(order_number)').order('created_at', { ascending: false }).limit(12),
    db.from('commerce_settings').select('*').eq('id', true).single(),
  ]);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({
    suppliers: (suppliers || []).map((supplier: any) => ({
      ...supplier,
      markup_percent: Number(supplier.config?.markup_percent ?? 25),
      refresh_seconds: Number(supplier.config?.refresh_seconds ?? 15),
      cod_enabled: Boolean(supplier.config?.cod_enabled),
      cod_advance: Number(supplier.config?.cod_advance ?? 100),
      cod_fee: Number(supplier.config?.cod_fee ?? 100),
      apiKeyConfigured: Boolean(process.env[supplier.api_key_env]),
    })),
    runs: runs || [],
    orders: orders || [],
    commerce,
  });
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const parsed = settingsSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: 'Invalid supplier settings', details: parsed.error.flatten() }, { status: 400 });
  const { id, catalog_mode, checkout_enabled, markup_percent, refresh_seconds, cod_enabled, cod_advance, cod_fee, ...settings } = parsed.data;
  if (settings.payment_fee_percent + settings.tax_reserve_percent + settings.target_margin_percent >= 95) {
    return NextResponse.json({ error: 'Margin, payment fee, and tax reserve must total less than 95%' }, { status: 400 });
  }
  const db: any = createAdminClient();
  const { data: existing, error: readError } = await db.from('suppliers').select('config').eq('id', id).single();
  if (readError) return NextResponse.json({ error: 'Supplier not found' }, { status: 404 });
  const { error: commerceError } = await db.from('commerce_settings').update({ catalog_mode, checkout_enabled, updated_at: new Date().toISOString() }).eq('id', true);
  if (commerceError) return NextResponse.json({ error: commerceError.message }, { status: 500 });
  const { data, error } = await db.from('suppliers').update({ ...settings, config: { ...existing.config, markup_percent, refresh_seconds, cod_enabled, cod_advance, cod_fee }, updated_at: new Date().toISOString() }).eq('id', id).select('*').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ supplier: data });
}
