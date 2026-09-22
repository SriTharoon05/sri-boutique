/** Exclude explicit menswear/unisex listings; never match "men" inside "women". */
export function excludedFromWomensCatalogue(name: string, raw: Record<string, unknown> = {}) {
  const gender = String(raw.gender || '').trim().toUpperCase();
  return ['MEN', 'MALE', 'MAN', 'BOYS', 'BOY', 'UNISEX'].includes(gender)
    || /\b(men|mens|man|male|boy|boys|unisex)\b/i.test(name);
}
