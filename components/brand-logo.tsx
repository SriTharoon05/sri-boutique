import Image from 'next/image';

export function BrandLogo({ className = '', light = false, priority = false }: { className?: string; light?: boolean; priority?: boolean }) {
  return <Image src="/images/sri-boutique-wordmark.png" alt="Sri Boutique" width={1419} height={1108} priority={priority} sizes="(max-width: 768px) 100px, 180px" className={`h-auto object-contain ${light ? 'brightness-0 invert' : ''} ${className}`} />;
}
