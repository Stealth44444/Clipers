import path from 'node:path';
import type { NextConfig } from 'next';

// No page here is meant to be framed by another site (clickjacking); Vercel adds HSTS itself.
const SECURITY_HEADERS = [
  { key: 'Content-Security-Policy', value: "frame-ancestors 'none'" },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
];

const nextConfig: NextConfig = {
  transpilePackages: ['@clipers/ui', '@clipers/db'],
  // Pin tracing to the monorepo root; otherwise Next picks up a stray lockfile above the repo.
  outputFileTracingRoot: path.join(__dirname, '../..'),
  async headers() {
    return [{ source: '/:path*', headers: SECURITY_HEADERS }];
  },
};

export default nextConfig;
