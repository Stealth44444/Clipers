import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Clipers App',
    short_name: 'Clipers',
    description: '브랜드·크리에이터·운영자용 Clipers 앱',
    start_url: '/',
    display: 'standalone',
    background_color: '#111111',
    theme_color: '#111111',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
