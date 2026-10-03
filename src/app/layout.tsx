import type { Metadata, Viewport } from 'next';
import { Navigation } from '@/components/navigation';
import { Footer } from '@/components/footer';
import { asset, site } from '@/lib/site';
import './globals.css';
import './subject-tags.css';
import './tex-fonts.css';
import './tex-reader.css';
import './texloom-figures.css';

export const metadata: Metadata = {
  metadataBase: new URL(`${site.url}/`),
  title: { default: 'Lemniro — Mathematics, understood.', template: '%s · Lemniro' },
  description: site.description,
  applicationName: 'Lemniro',
  icons: { icon: asset('/icon.svg') },
  openGraph: { siteName: 'Lemniro', type: 'website', locale: 'en_US' },
  twitter: { card: 'summary' },
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#f6f4ef' };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><a className="skip-link" href="#main-content">Skip to content</a><Navigation /><main id="main-content">{children}</main><Footer /></body></html>;
}
