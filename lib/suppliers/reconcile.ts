import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin-client';
import { getSheScaleClient } from './shescale';

function read(payload: any, paths: string[]) {
  for (const path of paths) {
    const value = path.split('.').reduce((current, key) => current?.[key], payload);
    if (value !== undefined && value !== null) return value;
  }
  return null;
}

function normalizeStatus(value: unknown) {
  const status = String(value || '').toLowerCase().replace(/[\s-]+/g, '_');
  if (['delivered', 'completed'].includes(status)) return 'delivered';
  if (['shipped', 'in_transit', 'out_for_delivery'].includes(status)) return 'shipped';
  if (['accepted', 'confirmed', 'processing', 'packed'].includes(status)) return 'accepted';
  if (['cancelled', 'canceled', 'rejected', 'returned', 'rto'].includes(status)) return 'cancelled';
  return 'submitted';
}

export async function reconcileSupplierOrders() {
  const db: any = createAdminClient();
  const { data: rows, error } = await db.from('supplier_orders').select('*, supplier:suppliers(*)')
    .in('status', ['submitted', 'accepted', 'shipped']).limit(100);
  if (error) throw error;
  let updated = 0;
  for (const row of rows || []) {
    const supplier = Array.isArray(row.supplier) ? row.supplier[0] : row.supplier;
    if (supplier?.code === 'shescale') continue;
    const externalId = row.external_order_id || row.external_order_number;
    if (!supplier?.enabled || !externalId || supplier.adapter !== 'shescale_partner_v1') continue;
    try {
      const payload = await getSheScaleClient(supplier.base_url).getOrder(externalId);
      const status = normalizeStatus(read(payload, ['status', 'data.status', 'order.status', 'fulfillmentStatus']));
      await db.from('supplier_orders').update({ status, response_payload: payload, last_error: null, updated_at: new Date().toISOString() }).eq('id', row.id);
      if (status === 'shipped' || status === 'delivered') await db.from('orders').update({ status, updated_at: new Date().toISOString() }).eq('id', row.order_id);
      updated += 1;
    } catch (error) {
      await db.from('supplier_orders').update({ last_error: error instanceof Error ? error.message : 'Reconciliation failed', updated_at: new Date().toISOString() }).eq('id', row.id);
    }
  }
  return { checked: rows?.length || 0, updated };
}
