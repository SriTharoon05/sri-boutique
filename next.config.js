/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: process.env.PRODUCTION_CHECK === '1' ? '.next-production-check' : '.next',
  poweredByHeader: false,
  compress: true,
  async redirects() {
    return ['product', 'category'].flatMap((section) => [{
      source: `/${section}/:name(.*)-shescale-:suffix([^/]+)`,
      destination: `/${section}/:name-sb-:suffix`,
      permanent: true,
    }, {
      source: `/${section}/:name-shescale`,
      destination: `/${section}/:name-sb`,
      permanent: true,
    }]);
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 86400,
    remotePatterns: [
      { protocol: 'https', hostname: '**.supabase.co' },
      { protocol: 'https', hostname: 'images.pexels.com' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: 'shescale.in' },
      { protocol: 'https', hostname: 'cdn.shescale.in' },
      { protocol: 'https', hostname: 'she-scale.s3.ap-south-1.amazonaws.com' },
    ],
  },
  async headers() {
    return [{
      source: '/:path*',
      headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
      ],
    }];
  },
};

module.exports = nextConfig;
