import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/', name: 'OS Werkplek', short_name: 'OS Werkplek', lang: 'nl',
    description: 'De interne werkplek van OS Steakhouse.', start_url: '/kassa-afslag',
    scope: '/', display: 'standalone', background_color: '#0e0e0e', theme_color: '#0e0e0e',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
