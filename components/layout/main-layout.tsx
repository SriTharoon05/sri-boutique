'use client';

import { ReactNode } from 'react';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { MobileBottomNav } from '@/components/layout/mobile-bottom-nav';
import { CatalogRefresh } from '@/components/providers/catalog-refresh';

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col pb-20 md:pb-0">
      <CatalogRefresh />
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
      <MobileBottomNav />
    </div>
  );
}
