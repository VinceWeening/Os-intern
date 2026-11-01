import type { Metadata, Viewport } from 'next';
import { Karla, Roboto_Slab } from 'next/font/google';
import './globals.css';

// Karla as on the OS ordering site; a sturdy slab serif that matches the logo lettering.
const karla = Karla({ subsets: ['latin'], variable: '--font-karla', display: 'swap' });
const slab = Roboto_Slab({ subsets: ['latin'], weight: ['500', '700'], variable: '--font-slab', display: 'swap' });

export const metadata: Metadata = {
  title: { default: 'OS Werkplek', template: '%s · OS Werkplek' },
  description: 'De interne werkplek van OS Steakhouse Heiloo en Heerhugowaard.',
  applicationName: 'OS Werkplek',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'OS Werkplek' },
  robots: { index: false, follow: false },
};
export const viewport: Viewport = {
  width: 'device-width', initialScale: 1,
  themeColor: [{ media: '(prefers-color-scheme: dark)', color: '#0e0e0e' }, { media: '(prefers-color-scheme: light)', color: '#f4f4f5' }],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="nl" className={`${karla.variable} ${slab.variable}`}><body><a className="skip-link" href="#inhoud">Naar inhoud</a>{children}</body></html>;
}
