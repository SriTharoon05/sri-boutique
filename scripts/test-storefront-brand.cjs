const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const vm = require('node:vm');
const output = ts.transpileModule(fs.readFileSync('lib/storefront-brand.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const context = { exports: {} };
vm.runInNewContext(output, context);
const { storefrontSlug, catalogSlugCandidates, categoryDescription } = context.exports;
assert.equal(storefrontSlug('silk-shescale-123'), 'silk-sb-123');
assert.equal(storefrontSlug('silk-saree'), 'silk-saree');
assert.equal(storefrontSlug('tshirt-shescale'), 'tshirt-sb');
assert.equal(catalogSlugCandidates('tshirt-sb').join(','), 'tshirt-sb,tshirt-shescale');
assert.equal(catalogSlugCandidates('silk-sb-123').join(','), 'silk-sb-123,silk-shescale-123');
assert.ok(!/shescale/i.test(categoryDescription({ name: 'Sarees', description: 'Browse Sarees supplied through SheScale.' })));

async function main() {
  const base = process.env.TEST_BASE_URL || 'http://localhost:3000';
  const headers = { 'User-Agent': 'facebookexternalhit/1.1' };
  for (const path of ['/', '/terms', '/privacy', '/shipping', '/returns']) {
    const response = await fetch(base + path, { headers });
    assert.equal(response.status, 200, path);
    const html = await response.text();
    const visible = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '').replace(/<[^>]*>/g, ' ');
    assert.ok(!/shescale|dropship|reseller|supplier fulfilled|supplier order manually/i.test(visible), path + ' contains internal fulfilment copy');
    assert.ok(html.includes('property="og:image"'), path + ' missing share image');
    assert.ok(html.includes('rel="canonical"'), path + ' missing canonical');
    console.log('PASS copy + metadata', path);
  }
  const image = await fetch(base + '/social-card');
  assert.equal(image.status, 200);
  assert.ok(image.headers.get('content-type').includes('image/png'));
  assert.ok((await image.arrayBuffer()).byteLength > 10000);
  const sitemap = await (await fetch(base + '/sitemap.xml')).text();
  assert.ok(!sitemap.includes('-shescale-'));
  const productUrl = sitemap.match(/<loc>([^<]*\/product\/[^<]*-sb-[^<]*)<\/loc>/)?.[1];
  assert.ok(productUrl, 'Missing catalogue products in sitemap');
  const productPath = new URL(productUrl).pathname;
  const legacy = productPath.replace('-sb-', '-shescale-');
  const redirected = await fetch(base + legacy + '?utm_source=instagram', { redirect: 'manual' });
  assert.equal(redirected.status, 308);
  assert.ok(redirected.headers.get('location').includes(productPath));
  assert.ok(redirected.headers.get('location').includes('utm_source=instagram'));
  const product = await fetch(base + productPath, { headers });
  assert.equal(product.status, 200);
  const productHtml = await product.text();
  assert.ok(productHtml.includes('application/ld+json'));
  assert.ok(productHtml.includes(productUrl));
  console.log('PASS PNG share card, sitemap, legacy redirect, campaign parameters, product alias + schema');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
