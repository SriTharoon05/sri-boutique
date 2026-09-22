/** Stable public aliases; supplier catalogue identifiers stay unchanged internally. */
export function storefrontSlug(slug: string | null | undefined) {
  return (slug || '').replace(/-shescale(?=-|$|[/?#])/g, '-sb');
}

export function catalogSlugCandidates(slug: string) {
  return Array.from(new Set([slug, slug.replace(/-sb(?=-|$)/g, '-shescale')]));
}

export function categoryDescription(category: { name: string; description?: string | null }) {
  const text = category.description;
  return !text || /shescale|supplied through|dropship|reseller/i.test(text)
    ? `Shop ${category.name} at Sri Boutique. Discover your next favourite style with secure checkout and delivery across India.`
    : text;
}
