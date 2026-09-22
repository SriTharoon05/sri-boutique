'use client';

import { ReactNode } from 'react';
import { Toaster } from '@/components/ui/sonner';
import { AuthProvider } from '@/components/providers/auth-provider';
import { CartProvider } from '@/components/providers/cart-provider';
import { VendorQuotaProvider } from '@/components/providers/vendor-quota-provider';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <CartProvider>
        <VendorQuotaProvider>{children}</VendorQuotaProvider>
        <Toaster position="bottom-right" richColors />
      </CartProvider>
    </AuthProvider>
  );
}
