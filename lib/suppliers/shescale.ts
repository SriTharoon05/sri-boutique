import 'server-only';
import type { NormalizedSupplierProduct, SupplierProductPage } from './types';

const DEFAULT_BASE_URL = 'https://api.shescale.in';

function asRecord(value: unknown): Record<string, any> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, any> : {};
}

function first(record: Record<string, any>, keys: string[], fallback?: any) {
  for (const key of keys) {
    const value = key.split('.').reduce<any>((current, part) => current?.[part], record);
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return fallback;
}

function numberValue(value: unknown, fallback = 0) {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function imageList(record: Record<string, any>): string[] {
  const source = first(record, ['images', 'imageUrls', 'image_urls', 'media', 'photos'], []);
  const values = Array.isArray(source) ? source : source ? [source] : [];
  return values
    .map((item) => typeof item === 'string' ? item : first(asRecord(item), ['url', 'src', 'imageUrl']))
    .filter((url): url is string => typeof url === 'string' && /^https:\/\//i.test(url));
}

function normalizeProduct(input: unknown): NormalizedSupplierProduct | null {
  const raw = asRecord(input);
  const externalId = String(first(raw, ['id', '_id', 'productId', 'product_id'], '')).trim();
  const name = String(first(raw, ['name', 'title', 'productName', 'product_name'], '')).trim();
  if (!externalId || !name) return null;

  const category = asRecord(first(raw, ['category', 'productCategory'], {}));
  const categoryId = String(first(raw, ['categoryId', 'category_id'], first(category, ['id', '_id', 'slug'], 'uncategorised')));
  const categoryName = String(first(category, ['name', 'title'], first(raw, ['categoryName', 'category_name'], 'Uncategorised')));
  const productCost = numberValue(first(raw, ['resellerPrice', 'reseller_price', 'wholesalePrice', 'wholesale_price', 'costPrice', 'cost_price', 'price']));
  const productImages = imageList(raw);
  const rawVariants = first(raw, ['variants', 'productVariants', 'skus'], []);
  const variants = (Array.isArray(rawVariants) && rawVariants.length ? rawVariants : [raw]).map((value, index) => {
    const variant = asRecord(value);
    const variantId = String(first(variant, ['id', '_id', 'variantId', 'variant_id'], `${externalId}-${index + 1}`));
    return {
      externalId: variantId,
      sku: String(first(variant, ['sku', 'code'], `SHESCALE-${externalId}-${index + 1}`)),
      color: first(variant, ['color.name', 'color', 'colour'], null),
      size: first(variant, ['size.name', 'size'], 'Free Size'),
      cost: numberValue(first(variant, ['resellerPrice', 'reseller_price', 'wholesalePrice', 'wholesale_price', 'costPrice', 'cost_price', 'price'], productCost)),
      stock: Math.max(0, Math.floor(numberValue(first(variant, ['stock', 'stockQuantity', 'stock_quantity', 'inventory'], 0)))),
      images: imageList(variant).length ? imageList(variant) : productImages,
      active: Boolean(first(variant, ['isActive', 'is_active', 'active'], true)),
    };
  });

  return {
    externalId,
    name,
    description: first(raw, ['description', 'shortDescription', 'short_description'], null),
    categoryId,
    categoryName,
    cost: productCost || variants[0]?.cost || 0,
    compareAtPrice: numberValue(first(raw, ['mrp', 'retailPrice', 'retail_price', 'compareAtPrice']), 0) || null,
    images: productImages,
    active: Boolean(first(raw, ['isActive', 'is_active', 'active', 'live'], true)),
    variants,
    raw,
  };
}

function extractItems(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  const root = asRecord(payload);
  for (const path of ['data.products', 'data.items', 'data.results', 'products', 'items', 'results', 'data']) {
    const value = first(root, [path]);
    if (Array.isArray(value)) return value;
  }
  return [];
}

export class SheScaleClient {
  private readonly baseUrl: string;
  constructor(private readonly apiKey: string, baseUrl = DEFAULT_BASE_URL) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    if (!apiKey) throw new Error('SHESCALE_API_KEY is not configured');
  }

  private async request(path: string, init: RequestInit = {}) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20_000);
    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        ...init,
        cache: 'no-store',
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
          ...(init.body ? { 'Content-Type': 'application/json' } : {}),
          ...init.headers,
        },
      });
      const text = await response.text();
      let payload: unknown = {};
      try { payload = text ? JSON.parse(text) : {}; } catch { payload = { message: text.slice(0, 500) }; }
      if (!response.ok) {
        const message = String(first(asRecord(payload), ['message', 'error.message', 'error'], `SheScale returned HTTP ${response.status}`));
        throw new Error(message.slice(0, 500));
      }
      return payload;
    } finally {
      clearTimeout(timeout);
    }
  }

  async listProducts(page = 1, limit = 50, updatedSince?: string): Promise<SupplierProductPage> {
    const query = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (updatedSince) query.set('updated_since', updatedSince);
    const raw = await this.request(`/api/v1/partner/v1/products?${query}`);
    const products = extractItems(raw).map(normalizeProduct).filter((item): item is NormalizedSupplierProduct => Boolean(item));
    const root = asRecord(raw);
    const totalPages = numberValue(first(root, ['meta.totalPages', 'data.meta.totalPages', 'pagination.totalPages'], page));
    const hasMore = Boolean(first(root, ['meta.hasNextPage', 'data.meta.hasNextPage', 'pagination.hasMore'], products.length === limit && page < totalPages));
    return { products, page, hasMore, raw };
  }

  async getProduct(id: string) {
    return this.request(`/api/v1/partner/v1/products/${encodeURIComponent(id)}`);
  }

  async getNormalizedProduct(id: string) {
    const raw = await this.getProduct(id);
    const root = asRecord(raw);
    const product = normalizeProduct(first(root, ['data.product', 'data', 'product'], raw));
    if (!product) throw new Error('SheScale returned an unsupported product response');
    return product;
  }

  async addShopProduct(productId: string) {
    return this.request('/api/v1/partner/v1/shop/products', { method: 'POST', body: JSON.stringify({ productId }) });
  }

  async setShopPrice(productId: string, sellingPrice: number) {
    return this.request(`/api/v1/partner/v1/shop/products/${encodeURIComponent(productId)}/price`, {
      method: 'PATCH', body: JSON.stringify({ sellingPrice }),
    });
  }

  async createOrder(payload: Record<string, unknown>, idempotencyKey: string) {
    return this.request('/api/v1/partner/v1/orders', {
      method: 'POST',
      headers: { 'Idempotency-Key': idempotencyKey },
      body: JSON.stringify(payload),
    });
  }

  async getOrder(id: string) {
    return this.request(`/api/v1/partner/v1/orders/${encodeURIComponent(id)}`);
  }
}

export function getSheScaleClient(baseUrl?: string) {
  return new SheScaleClient(process.env.SHESCALE_API_KEY || '', baseUrl);
}
