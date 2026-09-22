const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function load(file, extras = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText,
    { exports, require: name => name === 'server-only' ? {} : name === '@/lib/supabase/admin-client' ? { createAdminClient: () => ({ rpc: async () => ({ data: null, error: null }) }) } : require(name), process, URLSearchParams, AbortController, setTimeout, clearTimeout, ...extras });
  return exports;
}
async function main() {
  let requested;
  const { SheScaleClient } = load('lib/suppliers/shescale.ts', { fetch: async (url, init) => {
    requested = { url, init };
    return new Response(JSON.stringify({ success: true, data: { total: 258, page: 2, limit: 15, products: [{ id: 'p1', title: 'Anarkali', slug: 'anarkali', basePrice: 1000, category: { id: 'c1', name: 'Anarkali' }, status: 'ACTIVE', images: ['https://cdn.shescale.in/test.webp'], colorImages: { Pink: ['https://cdn.shescale.in/pink.webp'] }, variants: [{ id: 'v1', color: 'Pink', size: 'M', isUnlimited: true, stockQuantity: 0, isActive: true }] }] } }));
  } });
  const client = new SheScaleClient('secret-for-test');
  const result = await client.listProducts(2, 15);
  assert.equal(requested.init.headers.Authorization, undefined);
  assert.match(requested.url, /\/api\/v1\/products\?/);
  assert.equal(result.hasMore, true);
  assert.equal(result.products[0].cost, 1000);
  assert.equal(result.products[0].categoryName, 'Anarkali');
  assert.equal(result.products[0].variants[0].stock, 99);
  assert.equal(result.products[0].variants[0].images[0], 'https://cdn.shescale.in/pink.webp');
  await client.getProduct('anarkali');
  assert.match(requested.url, /\/api\/v1\/products\/anarkali$/);
  assert.equal(requested.init.headers.Authorization, 'Bearer secret-for-test');
  const { calculateProtectedPrice } = load('lib/suppliers/pricing.ts');
  const settings = { code: 'shescale', config: {}, forward_shipping_buffer: 0, return_cost_buffer: 0, payment_fee_percent: 0, tax_reserve_percent: 0, target_margin_percent: 30, minimum_profit: 0, price_rounding: 1 };
  assert.equal(calculateProtectedPrice(1000, settings).sellingPrice, 1250);
  assert.equal(calculateProtectedPrice(1000, settings).priceFloor, 1250);
  assert.equal(calculateProtectedPrice(1000, { ...settings, config: { markup_percent: 40 } }).sellingPrice, 1400);
  assert.equal(calculateProtectedPrice(1000, { ...settings, return_cost_buffer: 500 }).sellingPrice, 1500);
  assert.equal(calculateProtectedPrice(1000, { ...settings, config: { markup_percent: 20 } }).sellingPrice, 1200);
  assert.equal(calculateProtectedPrice(1000, { ...settings, config: { markup_percent: 0 } }).sellingPrice, 1000);
  assert.throws(() => calculateProtectedPrice(1000, { ...settings, config: { markup_percent: -1 } }));
  const { groupCategories } = load('lib/category-groups.ts');
  const grouped = groupCategories(['Gown', 'Gowns', 'Kurta', 'Kurtis', 'Women Clothing Kurta Set', 'Co Ord Sets', 'Co-ord Sets'].map((name, i) => ({ id: String(i), name, slug: String(i) })));
  assert.equal(grouped.length, 3);
  assert.equal(grouped.find(c => c.slug === 'dresses-gowns').categoryIds.length, 2);
  assert.equal(grouped.find(c => c.slug === 'kurtas-suit-sets').categoryIds.length, 3);
  console.log('Supplier catalogue, category grouping, authentication separation, stock, images, pagination and pricing tests passed.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
