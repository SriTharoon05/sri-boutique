import 'server-only';
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
  const { data: existing } = await db.from('categories').select('id, image_url').eq('supplier_id', supplier.id)
    .eq('supplier_category_id', product.categoryId).maybeSingle();
  const payload = {
    name: product.categoryName,
    slug: `${slugify(product.categoryName)}-${supplier.code}`,
    description: `Browse ${product.categoryName} supplied through ${supplier.name}.`,
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

async function upsertProduct(db: any, supplier: SupplierSettings, item: NormalizedSupplierProduct) {
  const categoryId = await upsertCategory(db, supplier, item);
  const highestVariantCost = Math.max(item.cost, ...item.variants.map((variant) => variant.cost || item.cost));
  const pricing = calculateProtectedPrice(highestVariantCost, supplier);
  const now = new Date().toISOString();
  const { data: existing } = await db.from('products').select('id').eq('supplier_id', supplier.id)
    .eq('supplier_product_id', item.externalId).maybeSingle();
  const payload = {
    category_id: categoryId,
    name: item.name,
    slug: `${slugify(item.name)}-${supplier.code}-${safeExternalSuffix(item.externalId)}`,
    description: item.description,
    base_price: pricing.sellingPrice,
    source_type: 'dropship',
    supplier_id: supplier.id,
    supplier_product_id: item.externalId,
    source_cost: highestVariantCost,
    price_floor: pricing.priceFloor,
    compare_at_price: item.compareAtPrice,
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
  for (const variant of item.variants) {
    const variantPricing = calculateProtectedPrice(variant.cost || item.cost, supplier);
    const { data: existingVariant } = await db.from('product_variants').select('id')
      .eq('product_id', productId).eq('supplier_variant_id', variant.externalId).maybeSingle();
    const variantPayload = {
      product_id: productId,
      supplier_variant_id: variant.externalId,
      sku: `${supplier.code.toUpperCase()}-${slugify(variant.sku).toUpperCase()}`.slice(0, 80),
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
    const result = existingVariant
      ? await db.from('product_variants').update(variantPayload).eq('id', existingVariant.id)
      : await db.from('product_variants').insert(variantPayload);
    if (result.error) throw result.error;
    variantsUpserted += 1;
  }
  return variantsUpserted;
}

export async function syncSupplierCatalog(supplierCode: string, fullSync = false) {
  const db: any = createAdminClient();
  const { data: supplier, error } = await db.from('suppliers').select('*').eq('code', supplierCode).single();
  if (error || !supplier) throw new Error('Supplier configuration not found. Apply the latest database migration first.');
  if (!supplier.enabled || !supplier.sync_enabled) throw new Error('Enable the supplier and catalogue sync before syncing');
  if (supplier.adapter !== 'shescale_partner_v1') throw new Error(`Unsupported supplier adapter: ${supplier.adapter}`);

  const { data: run, error: runError } = await db.from('supplier_sync_runs').insert({ supplier_id: supplier.id }).select('id, started_at').single();
  if (runError) throw runError;
  await db.from('suppliers').update({ last_sync_status: 'running', last_sync_error: null, updated_at: new Date().toISOString() }).eq('id', supplier.id);

  let seen = 0;
  let productsUpserted = 0;
  let variantsUpserted = 0;
  try {
    const client = getSheScaleClient(supplier.base_url);
    const updatedSince = fullSync ? undefined : supplier.last_sync_at || undefined;
    for (let page = 1; page <= supplier.max_sync_pages; page += 1) {
      const result = await client.listProducts(page, 50, updatedSince);
      seen += result.products.length;
      for (const product of result.products) {
        if (supplier.auto_publish) {
          const highestCost = Math.max(product.cost, ...product.variants.map((variant) => variant.cost || product.cost));
          const protectedPrice = calculateProtectedPrice(highestCost, supplier as SupplierSettings);
          await client.addShopProduct(product.externalId);
          await client.setShopPrice(product.externalId, protectedPrice.sellingPrice);
        }
        variantsUpserted += await upsertProduct(db, supplier as SupplierSettings, product);
        productsUpserted += 1;
      }
      if (!result.hasMore || result.products.length === 0) break;
    }
    if (fullSync) {
      const { data: localProducts } = await db.from('products').select('id, supplier_product_id').eq('supplier_id', supplier.id);
      const seenIds = new Set<string>();
      // Re-read the completed run from locally updated records so full-sync
      // deactivation remains safe even when the supplier has many pages.
      const { data: syncedProducts } = await db.from('products').select('supplier_product_id').eq('supplier_id', supplier.id)
        .gte('synced_at', run.started_at);
      (syncedProducts || []).forEach((product: any) => seenIds.add(product.supplier_product_id));
      for (const product of localProducts || []) {
        if (product.supplier_product_id && !seenIds.has(product.supplier_product_id)) {
          await db.from('products').update({ is_active: false }).eq('id', product.id);
        }
      }
    }
    const completedAt = new Date().toISOString();
    await db.from('supplier_sync_runs').update({ status: 'success', products_seen: seen, products_upserted: productsUpserted, variants_upserted: variantsUpserted, finished_at: completedAt }).eq('id', run.id);
    await db.from('suppliers').update({ last_sync_at: completedAt, last_sync_status: 'success', last_sync_error: null, updated_at: completedAt }).eq('id', supplier.id);
    return { seen, productsUpserted, variantsUpserted, completedAt };
  } catch (syncError) {
    const message = syncError instanceof Error ? syncError.message : 'Unknown supplier sync error';
    const completedAt = new Date().toISOString();
    await db.from('supplier_sync_runs').update({ status: 'failed', products_seen: seen, products_upserted: productsUpserted, variants_upserted: variantsUpserted, error_message: message, finished_at: completedAt }).eq('id', run.id);
    await db.from('suppliers').update({ last_sync_status: 'failed', last_sync_error: message, updated_at: completedAt }).eq('id', supplier.id);
    throw syncError;
  }
}
