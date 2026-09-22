'use client';
import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';

export function CatalogRefresh() {
  const router = useRouter();
  const pathname = usePathname();
  useEffect(() => {
    if (!(pathname === '/' || pathname.startsWith('/category/') || pathname.startsWith('/product/'))) return;
    let stopped = false;
    let revision: string | null | undefined;
    let timer: ReturnType<typeof setTimeout>;
    const controller = new AbortController();
    async function poll() {
      let delay = 15000;
      try {
        if (document.visibilityState === 'visible') {
          const response = await fetch('/api/catalog?limit=1', { cache: 'no-store', signal: controller.signal });
          if (!response.ok) throw new Error('Refresh unavailable');
          const data = await response.json();
          delay = Math.max(15000, data.refreshSeconds * 1000);
          if (data.revision && data.revision !== revision) {
            revision = data.revision;
            router.refresh();
            window.dispatchEvent(new Event('catalog-updated'));
          }
        }
      } catch { delay = 60000; }
      if (!stopped) timer = setTimeout(poll, delay);
    }
    void poll();
    return () => { stopped = true; clearTimeout(timer); controller.abort(); };
  }, [pathname, router]);
  return null;
}
