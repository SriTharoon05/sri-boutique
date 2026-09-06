export interface SupplierSettings {
  id: string;
  code: string;
  name: string;
  adapter: string;
  base_url: string;
  api_key_env: string;
  enabled: boolean;
  sync_enabled: boolean;
  auto_publish: boolean;
  target_margin_percent: number;
  minimum_profit: number;
  forward_shipping_buffer: number;
  return_cost_buffer: number;
  payment_fee_percent: number;
  tax_reserve_percent: number;
  price_rounding: number;
  max_sync_pages: number;
  last_sync_at: string | null;
  last_sync_status: 'never' | 'running' | 'success' | 'failed';
  last_sync_error: string | null;
  config: Record<string, unknown>;
}

export interface NormalizedSupplierVariant {
  externalId: string;
  sku: string;
  color: string | null;
  size: string | null;
  cost: number;
  stock: number;
  images: string[];
  active: boolean;
}

export interface NormalizedSupplierProduct {
  externalId: string;
  name: string;
  description: string | null;
  categoryId: string;
  categoryName: string;
  cost: number;
  compareAtPrice: number | null;
  images: string[];
  active: boolean;
  variants: NormalizedSupplierVariant[];
  raw: Record<string, unknown>;
}

export interface SupplierProductPage {
  products: NormalizedSupplierProduct[];
  page: number;
  hasMore: boolean;
  raw: unknown;
}

