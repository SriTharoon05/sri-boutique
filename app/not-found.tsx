import Link from 'next/link';
import { MainLayout } from '@/components/layout/main-layout';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <MainLayout>
      <main className="container mx-auto flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
        <p className="text-sm font-medium tracking-widest text-primary">404</p>
        <h1 className="mt-3 font-display text-4xl font-semibold">We couldn’t find that page</h1>
        <p className="mt-3 max-w-md text-muted-foreground">The product or collection may have moved or is no longer available.</p>
        <Button asChild className="mt-6"><Link href="/">Browse the collection</Link></Button>
      </main>
    </MainLayout>
  );
}
