// Next.js configuration: redirects, response headers and image optimization.
// Replaces vercel.json from the static build, so the same rules apply on Vercel, `next start` and any other host.
import type { NextConfig } from 'next';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import legacyRedirects from './config/redirects.json';

const isDev = process.env.NODE_ENV !== 'production';

// The chat widget is a prebuilt script served from /public. A content hash in its URL lets it be cached immutably.
const viaVersion = createHash('sha256').update(readFileSync('./public/js/via.js')).digest('hex').slice(0, 10);

// Next.js inlines small bootstrap scripts (the RSC payload) into statically generated HTML, so script-src needs
// 'unsafe-inline' unless every page is rendered per request with a nonce. All content is static and escaped by React,
// so static pages served from the CDN are the better trade-off here. Everything else stays locked to 'self'.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "connect-src 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
  "base-uri 'self'",
  "object-src 'none'",
].join('; ');

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()' },
  { key: 'Content-Security-Policy', value: csp },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  trailingSlash: false,
  env: { NEXT_PUBLIC_VIA_VERSION: viaVersion },
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 604800, // 7 days, matching the previous /img cache policy
  },
  async redirects() {
    return [
      // Every legacy URL from the previous site keeps resolving with a permanent (301) redirect.
      ...legacyRedirects.map(r => ({ ...r, statusCode: 301 })),
      // Clean URLs: the static build served /about/index.html and /about.html; both now redirect to /about.
      { source: '/:path*/index.html', destination: '/:path*', statusCode: 301 },
      { source: '/:path*.html', destination: '/:path*', statusCode: 301 },
    ];
  },
  async headers() {
    return [
      { source: '/js/:path*', headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }] },
      { source: '/img/:path*', headers: [{ key: 'Cache-Control', value: 'public, max-age=604800, stale-while-revalidate=86400' }] },
      { source: '/:path*', headers: securityHeaders },
    ];
  },
};

export default nextConfig;
