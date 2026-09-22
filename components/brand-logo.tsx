import Image from 'next/image';

export function BrandLogo({ className = '', light = false, priority = false }: { className?: string; light?: boolean; priority?: boolean }) {
  return <Image src="/images/sri-boutique-horizontal.png" alt="Sri Boutique" width={2025} height={776} priority={priority} sizes="(max-width: 768px) 160px, 220px" className={`h-auto object-contain ${light ? 'brightness-0 invert' : ''} ${className}`} />;
}
