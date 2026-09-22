/** Storefront groups preserve supplier categories and their product assignments. */
export function categoryGroup(name: string) {
  const text = name.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  if (/saree/.test(text)) return { name: 'Sarees', slug: 'sarees' };
  if (/kurta|kurti|anarkali|salwar/.test(text)) return { name: 'Kurtas & Suit Sets', slug: 'kurtas-suit-sets' };
  if (/gown|frock|maxi|dress/.test(text)) return { name: 'Dresses & Gowns', slug: 'dresses-gowns' };
  if (/lehenga/.test(text)) return { name: 'Lehengas', slug: 'lehengas' };
  if (/co ord|coord/.test(text)) return { name: 'Co-ord Sets', slug: 'co-ord-sets' };
  if (/girl|kid|child/.test(text)) return { name: 'Kidswear', slug: 'kidswear' };
  if (/blouse|top|tunic|tshirt|t shirt/.test(text)) return { name: 'Tops & Blouses', slug: 'tops-blouses' };
  if (/legging|pant|trouser|bottom/.test(text)) return { name: 'Bottomwear', slug: 'bottomwear' };
  if (/bag|accessor/.test(text)) return { name: 'Bags & Accessories', slug: 'bags-accessories' };
  return { name: 'More Styles', slug: 'more-styles' };
}

const order = ['sarees', 'kurtas-suit-sets', 'dresses-gowns', 'co-ord-sets', 'lehengas', 'tops-blouses', 'kidswear', 'bottomwear', 'bags-accessories', 'more-styles'];
export function groupCategories<T extends { id: string; name: string; slug: string }>(categories: T[]) {
  const groups = new Map<string, T & { categoryIds: string[] }>();
  for (const category of categories) {
    const group = categoryGroup(category.name);
    const existing = groups.get(group.slug);
    if (existing) existing.categoryIds.push(category.id);
    else groups.set(group.slug, { ...category, ...group, description: `Shop ${group.name} at Sri Boutique. Discover your next favourite style with secure checkout and delivery across India.`, categoryIds: [category.id] });
  }
  return Array.from(groups.values()).sort((a, b) => order.indexOf(a.slug) - order.indexOf(b.slug));
}
