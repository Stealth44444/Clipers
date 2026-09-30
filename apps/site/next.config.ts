import path from 'node:path';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@clipers/ui', '@clipers/db'],
  // Pin tracing to the monorepo root; otherwise Next picks up a stray lockfile above the repo.
  outputFileTracingRoot: path.join(__dirname, '../..'),
};

export default nextConfig;
