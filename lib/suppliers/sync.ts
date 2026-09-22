import 'server-only';
import { revalidatePath } from 'next/cache';
import { isDeepStrictEqual } from 'node:util';
import { createAdminClient } from '@/lib/supabase/admin-client';
import { calculateProtectedPrice } from './pricing';
import { getSheScaleClient } from './shescale';
import type { NormalizedSupplierProduct, SupplierSettings } from './types';

function slugify(value: string) {
  return value.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 130) || 'product';
}

function safeExternalSuffix(value: string) {
  return slugify(value).slice(-24) || 'item';
}

async function upsertCategory(db: any, supplier: SupplierSettings, product: NormalizedSupplierProduct) {
  const { data: existing } = await db.from('categories').select('id, image_url, slug').eq('supplier_id', supplier.id)
    .eq('supplier_category_id', product.categoryId).maybeSingle();
  const payload = {
    name: product.categoryName,
    slug: existing?.slug || `${slugify(product.categoryName)}-${supplier.code}-${safeExternalSuffix(product.categoryId)}`,
    description: `Shop ${product.categoryName} at Sri Boutique. Discover your next favourite style with secure checkout and delivery across India.`,
    image_url: existing?.image_url || product.images[0] || null,
    supplier_id: supplier.id,
    supplier_category_id: product.categoryId,
    synced_at: new Date().toISOString(),
  };
  if (existing) {
    const { data, error } = await db.from('categories').update(payload).eq('id', existing.id).select('id').single();
    if (error) throw error;
    return data.id as string;
  }
  const { data, error } = await db.from('categories').insert(payload).select('id').single();
  if (error) throw error;
  return data.id as string;
}

async function upsertProduct(db: any, supplier: SupplierSettings, item: NormalizedSupplierProduct, cached?: any) {
  const highestVariantCost = Math.max(item.cost, ...item.variants.map((variant) => variant.cost || item.cost));
  const pricing = calculateProtectedPrice(highestVariantCost, supplier);
  const now = new Date().toISOString();
  const existing = cached || (await db.from('products').select('id, slug').eq('supplier_id', supplier.id)
    .eq('supplier_product_id', item.externalId).maybeSingle()).data;
  const active = supplier.auto_publish && item.active && item.variants.some(v => v.active && v.stock > 0);
  if (cached && isDeepStrictEqual(cached.supplier_payload, item.raw)
      && Number(cached.base_price) === pricing.sellingPrice && Number(cached.price_floor) === pricing.priceFloor
      && cached.is_active === active) return 0;
  const categoryId = await upsertCategory(db, supplier, item);
  const payload = {
    category_id: categoryId,
    name: item.name,
    slug: existing?.slug || `${slugify(item.name)}-${supplier.code}-${safeExternalSuffix(item.externalId)}`,
    description: item.description,
    base_price: pricing.sellingPrice,
    source_type: 'dropship',
    supplier_id: supplier.id,
    supplier_product_id: item.externalId,
    source_cost: highestVariantCost,
    price_floor: pricing.priceFloor,
    compare_at_price: item.compareAtPrice && item.compareAtPrice > pricing.sellingPrice ? item.compareAtPrice : null,
    supplier_payload: item.raw,
    is_active: supplier.auto_publish && item.active && item.variants.some((variant) => variant.active && variant.stock > 0),
    synced_at: now,
  };

  let productId: string;
  if (existing) {
    const { error } = await db.from('products').update(payload).eq('id', existing.id);
    if (error) throw error;
    productId = existing.id;
  } else {
    const { data, error } = await db.from('products').insert(payload).select('id').single();
    if (error) throw error;
    productId = data.id;
  }

  let variantsUpserted = 0;
  const { data: oldVariants, error: oldError } = await db.from('product_variants').select('id, supplier_variant_id').eq('product_id', productId);
  if (oldError) throw oldError;
  const variantPayloads = [];
  for (const variant of item.variants) {
    const variantPricing = calculateProtectedPrice(variant.cost || item.cost, supplier);
    const existingVariant = oldVariants?.find((v: any) => v.supplier_variant_id === variant.externalId);
    const variantPayload = {
      product_id: productId,
      id: existingVariant?.id || crypto.randomUUID(),
      supplier_variant_id: variant.externalId,
      sku: `${supplier.code.toUpperCase()}-${variant.externalId}`,
      color: variant.color,
      size: variant.size,
      price_override: variantPricing.sellingPrice,
      source_cost: variant.cost || item.cost,
      price_floor: variantPricing.priceFloor,
      stock_quantity: variant.stock,
      image_urls: variant.images.length ? variant.images : item.images,
      is_active: variant.active && variant.stock > 0,
      synced_at: now,
    };
    variantPayloads.push(variantPayload);
    variantsUpserted += 1;
  }
  if (variantPayloads.length) {
    const { error } = await db.from('product_variants').upsert(variantPayloads, { onConflict: 'id' });
    if (error) throw error;
  }
  const removed = (oldVariants || []).filter((v: any) => !item.variants.some(n => n.externalId === v.supplier_variant_id)).map((v: any) => v.id);
  if (removed.length) {
    const { error } = await db.from('product_variants').update({ is_active: false, stock_quantity: 0 }).in('id', removed);
    if (error) throw error;
  }
  return variantsUpserted;
}

export async function syncSupplierCatalog(supplierCode: string, fullSync = false) {
  const db: any = createAdminClient();
  const { data: supplier, error } = await db.from('suppliers').select('*').eq('code', supplierCode).single();
  if (error || !supplier) throw new Error('Supplier configuration not found. Apply the latest database migration first.');
  if (!supplier.enabled || !supplier.sync_enabled) throw new Error('Enable the supplier and catalogue sync before syncing');
  if (supplier.adapter !== 'shescale_partner_v1') throw new Error(`Unsupported supplier adapter: ${supplier.adapter}`);

  // Atomic compare-and-set: one sync across all server instances. Recover a
  // crashed run after ten minutes; an active run renews its lease each page.
  if (supplier.last_sync_status === 'running' && Date.now() - Date.parse(supplier.updated_at) < 600_000) {
    return { seen: 0, productsUpserted: 0, variantsUpserted: 0, completedAt: supplier.last_sync_at, skipped: true };
  }
  const { data: lease, error: leaseError } = await db.from('suppliers').update({ last_sync_status: 'running', updated_at: new Date().toISOString() })
    .eq('id', supplier.id).eq('updated_at', supplier.updated_at).select('id');
  if (leaseError) throw leaseError;
  if (!lease?.length) return { seen: 0, productsUpserted: 0, variantsUpserted: 0, completedAt: supplier.last_sync_at, skipped: true };

  const { data: run, error: runError } = await db.from('supplier_sync_runs').insert({ supplier_id: supplier.id }).select('id, started_at').single();
  if (runError) throw runError;
  await db.from('suppliers').update({ last_sync_status: 'running', last_sync_error: null, updated_at: new Date().toISOString() }).eq('id', supplier.id);

  let seen = 0;
  let productsUpserted = 0;
  let variantsUpserted = 0;
  let complete = false;
  const seenIds = new Set<string>();
  try {
    const client = getSheScaleClient(supplier.base_url);
    const { data: cachedProducts, error: cacheError } = await db.from('products').select('id, slug, supplier_product_id, supplier_payload, base_price, price_floor, is_active').eq('supplier_id', supplier.id);
    if (cacheError) throw cacheError;
    const cachedById = new Map((cachedProducts || []).map((p: any) => [p.supplier_product_id, p]));
    const updatedSince = fullSync ? undefined : supplier.last_sync_at || undefined;
    for (let page = 1; page <= supplier.max_sync_pages; page += 1) {
      const result = await client.listProducts(page, 50, updatedSince);
      seen += result.products.length;
      for (const product of result.products) {
        seenIds.add(product.externalId);
        variantsUpserted += await upsertProduct(db, supplier as SupplierSettings, product, cachedById.get(product.externalId));
        productsUpserted += 1;
      }
      await db.from('suppliers').update({ updated_at: new Date().toISOString() }).eq('id', supplier.id);
      if (!result.hasMore) { complete = true; break; }
      if (!result.products.length) throw new Error('Supplier pagination ended unexpectedly');
    }
    if (!complete) throw new Error('Catalogue exceeded maximum sync pages; increase the limit. Existing products were not removed.');
    if (fullSync && seen > 0) {
      const { data: localProducts } = await db.from('products').select('id, supplier_product_id').eq('supplier_id', supplier.id);
      for (const product of localProducts || []) {
        if (product.supplier_product_id && !seenIds.has(product.supplier_product_id)) {
          const { error: deactivateError } = await db.from('products').update({ is_active: false }).eq('id', product.id);
          if (deactivateError) throw deactivateError;
        }
      }
    }
    const completedAt = new Date().toISOString();
    await db.from('supplier_sync_runs').update({ status: 'success', products_seen: seen, products_upserted: productsUpserted, variants_upserted: variantsUpserted, finished_at: completedAt }).eq('id', run.id);
    await db.from('suppliers').update({ last_sync_at: completedAt, last_sync_status: 'success', last_sync_error: null, updated_at: completedAt }).eq('id', supplier.id);
    revalidatePath('/', 'layout');
    return { seen, productsUpserted, variantsUpserted, completedAt };
  } catch (syncError) {
    const message = syncError instanceof Error ? syncError.message : typeof (syncError as any)?.message === 'string' ? (syncError as any).message : 'Unknown supplier sync error';
    const completedAt = new Date().toISOString();
    await db.from('supplier_sync_runs').update({ status: 'failed', products_seen: seen, products_upserted: productsUpserted, variants_upserted: variantsUpserted, error_message: message, finished_at: completedAt }).eq('id', run.id);
    await db.from('suppliers').update({ last_sync_status: 'failed', last_sync_error: message, updated_at: completedAt }).eq('id', supplier.id);
    throw syncError;
  }
}
