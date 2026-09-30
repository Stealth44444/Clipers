import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@clipers/ui', '@clipers/db'],
};

export default nextConfig;
