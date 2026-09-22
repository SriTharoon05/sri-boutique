import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin-client';
import { getSheScaleClient } from './shescale';
import { getVendorDailyQuota } from './daily-quota';
import { PAYMENT_TEST_PRODUCT_ID, PAYMENT_TEST_VARIANT_ID } from '@/lib/payment-test-product';

function record(value: unknown): Record<string, any> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, any> : {};
}

function responseValue(payload: unknown, keys: string[]) {
  const source = record(payload);
  for (const key of keys) {
    const value = key.split('.').reduce<any>((current, part) => current?.[part], source);
    if (value !== undefined && value !== null) return String(value);
  }
  return null;
}

export async function dispatchDropshipOrder(orderId: string) {
  const db: any = createAdminClient();
  const { data: order, error } = await db.from('orders').select('*, items:order_items(*)').eq('id', orderId).single();
  if (error || !order) throw new Error('Order not found');
  if (order.payment_status !== 'success') throw new Error('Only paid orders can be sent to a supplier');

  const supplierIds = Array.from(new Set<string>((order.items || []).map((item: any) => item.supplier_id as string).filter(Boolean)));
  const results: Array<{ supplierId: string; status: string; error?: string }> = [];
  for (const supplierId of supplierIds) {
    const { data: supplier } = await db.from('suppliers').select('*').eq('id', supplierId).single();
    // Manual reseller fulfilment: payment callbacks must never place or pay for
    // a supplier order. The store owner places it separately in SheScale.
    if (supplier?.code === 'shescale') {
      results.push({ supplierId, status: 'manual_action_required' });
      continue;
    }
    if (!supplier?.enabled) {
      results.push({ supplierId, status: 'skipped', error: 'Supplier is disabled' });
      continue;
    }
    const supplierItems = order.items.filter((item: any) => item.supplier_id === supplierId);
    const idempotencyKey = `sri-${order.id}-${supplierId}`;
    const address = record(order.shipping_address);
    const requestPayload = {
      externalRef: order.order_number,
      customer: { name: address.fullName, phone: order.phone },
      shippingAddress: {
        name: address.fullName,
        phone: order.phone,
        addressLine1: address.addressLine1,
        addressLine2: address.addressLine2 || undefined,
        city: address.city,
        state: address.state,
        pincode: address.pincode,
        country: address.country || 'India',
      },
      items: supplierItems.map((item: any) => ({
        productId: item.supplier_product_id,
        variantId: item.supplier_variant_id,
        quantity: item.quantity,
      })),
    };

    const { data: supplierOrder } = await db.from('supplier_orders').upsert({
      order_id: order.id,
      supplier_id: supplierId,
      idempotency_key: idempotencyKey,
      request_payload: requestPayload,
    }, { onConflict: 'order_id,supplier_id', ignoreDuplicates: false }).select('*').single();

    if (['submitted', 'accepted', 'shipped', 'delivered'].includes(supplierOrder?.status)) {
      results.push({ supplierId, status: supplierOrder.status });
      continue;
    }
    await db.from('supplier_orders').update({ status: 'submitting', attempt_count: (supplierOrder?.attempt_count || 0) + 1, last_attempt_at: new Date().toISOString(), last_error: null }).eq('id', supplierOrder.id);
    try {
      if (supplier.adapter !== 'shescale_partner_v1') throw new Error(`Unsupported supplier adapter: ${supplier.adapter}`);
      const response = await getSheScaleClient(supplier.base_url).createOrder(requestPayload, idempotencyKey);
      await db.from('supplier_orders').update({
        status: 'submitted',
        external_order_id: responseValue(response, ['id', 'data.id', 'order.id']),
        external_order_number: responseValue(response, ['orderNumber', 'data.orderNumber', 'order.orderNumber']),
        response_payload: response,
        last_error: null,
        next_retry_at: null,
        updated_at: new Date().toISOString(),
      }).eq('id', supplierOrder.id);
      results.push({ supplierId, status: 'submitted' });
    } catch (dispatchError) {
      const message = dispatchError instanceof Error ? dispatchError.message : 'Supplier order failed';
      await db.from('supplier_orders').update({ status: 'failed', last_error: message, next_retry_at: new Date(Date.now() + 15 * 60_000).toISOString(), updated_at: new Date().toISOString() }).eq('id', supplierOrder.id);
      results.push({ supplierId, status: 'failed', error: message });
    }
  }
  return results;
}

export async function validateDropshipOrderAvailability(orderId: string) {
  const db: any = createAdminClient();
  const { data: order, error } = await db.from('orders').select('id, user_id, items:order_items(*)').eq('id', orderId).single();
  if (error || !order) throw new Error('Order not found');
  const dropshipItems = (order.items || []).filter((item: any) => item.supplier_id);
  if ((order.items || []).some((item: any) => item.variant_id === PAYMENT_TEST_VARIANT_ID)) {
    const { data: owner } = await db.from('profiles').select('role').eq('id', order.user_id).single();
    if (owner?.role !== 'admin') throw new Error('Payment test is restricted to administrators');
    const { data: testProduct } = await db.from('products').select('is_active').eq('id', PAYMENT_TEST_PRODUCT_ID).single();
    if (!testProduct?.is_active) throw new Error('Payment test product is private');
  }
  if (dropshipItems.length) {
    const quota = await getVendorDailyQuota();
    const { data: reservation, error: quotaError } = await db.from('vendor_daily_reservations').select('quota_day').eq('order_id', orderId).maybeSingle();
    if (!quota.ready || quotaError || !reservation || reservation.quota_day !== quota.day) {
      throw new Error('This checkout has expired. Please start a new checkout.');
    }
  }
  const productCache = new Map<string, Awaited<ReturnType<ReturnType<typeof getSheScaleClient>['getNormalizedProduct']>>>();
  for (const item of dropshipItems) {
    const { data: supplier } = await db.from('suppliers').select('*').eq('id', item.supplier_id).single();
    if (!supplier?.enabled) throw new Error('A supplier for this order is temporarily unavailable');
    if (supplier.adapter !== 'shescale_partner_v1') throw new Error(`Unsupported supplier adapter: ${supplier.adapter}`);
    const cacheKey = `${supplier.id}:${item.supplier_product_id}`;
    let product = productCache.get(cacheKey);
    if (!product) {
      const { data: local } = await db.from('products').select('supplier_payload').eq('supplier_id', supplier.id).eq('supplier_product_id', item.supplier_product_id).single();
      const slug = local?.supplier_payload?.slug;
      if (!slug) throw new Error('Supplier product needs a catalogue refresh');
      product = await getSheScaleClient(supplier.base_url).getNormalizedProduct(slug);
      productCache.set(cacheKey, product);
    }
    const variant = product.variants.find((candidate) => candidate.externalId === item.supplier_variant_id);
    if (!product.active || !variant?.active || variant.stock < item.quantity) {
      throw new Error(`${item.product_name} is no longer available in the requested quantity`);
    }
    if (Math.abs(Number(variant.cost) - Number(item.source_cost)) > 0.01) {
      throw new Error(`${item.product_name} changed price at the supplier. Sync the catalogue before accepting payment.`);
    }
  }
  return { checked: dropshipItems.length };
}
