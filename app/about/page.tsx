import { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { MainLayout } from '@/components/layout/main-layout';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Our Story | Sri Boutique',
  description: 'Discover the heritage and craftsmanship behind Sri Boutique — handwoven sarees and ethnic wear, made with artisans across India.',
};

export default function AboutPage() {
  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-12 md:py-20">
        {/* Hero */}
        <div className="max-w-3xl mx-auto text-center mb-16">
          <span className="text-sm font-medium tracking-widest text-primary mb-4 block">
            OUR HERITAGE
          </span>
          <h1 className="font-display text-4xl md:text-5xl font-semibold mb-6">
            Crafted With Care, Worn With Pride
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Sri Boutique began with a simple belief — that traditional Indian
            craftsmanship deserves a place in the modern wardrobe, not just in
            memory.
          </p>
        </div>

        {/* Image + Story */}
        <div className="grid md:grid-cols-2 gap-8 md:gap-16 items-center mb-20">
          <div className="relative aspect-square rounded-lg overflow-hidden">
            <Image
              src="/images/sarees/kanchipuram-maroon.png"
              alt="Traditional handloom weaving"
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover"
            />
          </div>

          <div className="space-y-6">
            <h2 className="font-display text-2xl md:text-3xl font-semibold">
              Where Tradition Meets Everyday Life
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              Every saree, lehenga, and kurti at Sri Boutique starts as a
              conversation with the artisans who make it — weavers preserving
              techniques passed down through generations, working alongside us
              to bring their craft to homes across India.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              We hand-inspect every piece before it reaches you, because a
              handwoven saree carries hours of skilled work, and we want that
              care to be visible the moment you unbox it.
            </p>
          </div>
        </div>

        {/* Values */}
        <div className="grid sm:grid-cols-3 gap-8 mb-20 text-center">
          <div>
            <h3 className="font-display text-xl font-medium mb-2">
              Authentic Craftsmanship
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              We work directly with weavers and artisans, not intermediaries —
              so what you buy genuinely supports the hands that made it.
            </p>
          </div>
          <div>
            <h3 className="font-display text-xl font-medium mb-2">
              Quality You Can Trust
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Every piece is inspected for fabric quality, stitching, and
              finish before it&apos;s listed — no exceptions.
            </p>
          </div>
          <div>
            <h3 className="font-display text-xl font-medium mb-2">
              Made For Real Life
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Traditional craftsmanship, chosen and styled for how people
              actually dress today — not just for special occasions.
            </p>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <Button asChild size="lg">
            <Link href="/#categories">
              Explore Our Collection
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </MainLayout>
  );
}
