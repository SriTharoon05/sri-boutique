'use client';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
const VendorQuota = createContext({ blocked: true, message: 'Checking availability…' });
export const useVendorQuota = () => useContext(VendorQuota);
export function VendorQuotaProvider({ children }: { children: ReactNode }) {
  const [quota, setQuota] = useState({ blocked: true, message: 'Checking availability…' });
  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    const controller = new AbortController();
    async function refresh() {
      try {
        if (document.visibilityState === 'visible') {
          const response = await fetch('/api/vendor-quota', { cache: 'no-store', signal: controller.signal });
          if (!response.ok) throw new Error('Unavailable');
          const data = await response.json();
          if (!stopped) setQuota({ blocked: !data.ready || data.remaining <= 0,
            message: !data.ready ? 'Ordering is temporarily unavailable.' : data.remaining <= 0 ? 'These products are unavailable today. Available again after midnight IST.' : '' });
        }
      } catch { if (!stopped) setQuota({ blocked: true, message: 'Unable to check availability. Please try again shortly.' }); }
      if (!stopped) timer = setTimeout(refresh, 15000);
    }
    void refresh();
    return () => { stopped = true; clearTimeout(timer); controller.abort(); };
  }, []);
  return <VendorQuota.Provider value={quota}>{children}</VendorQuota.Provider>;
}
