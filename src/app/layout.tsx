import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'OS Werkplek', template: '%s · OS Werkplek' },
  description: 'De interne werkplek van OS Steakhouse Heiloo en Heerhugowaard.',
  applicationName: 'OS Werkplek',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'OS Werkplek' },
  robots: { index: false, follow: false },
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#171511' };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="nl"><body><a className="skip-link" href="#inhoud">Naar inhoud</a>{children}</body></html>;
}
