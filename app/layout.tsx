import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';

/* One type family for the whole product — the Aurora rule. Plus Jakarta Sans
   is the same family NowTrendin uses, which is deliberate: the CEO's products
   should read as one house. What distinguishes Love Values is the palette,
   not a second typeface. Self-hosted by next/font, so there is no render-
   blocking request to Google and no layout shift. */
const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-jakarta',
  display: 'swap',
});

/* Canonical origin. Set NEXT_PUBLIC_SITE_URL on Heroku to whichever host you
   actually serve — if the apex forwards to www (the GoDaddy pattern), the
   canonical is the www host, and hardcoding the apex here would advertise a
   URL that only ever redirects. */
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.lovevalues.com';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: 'Love Values — know what you value, be truly seen',
  description:
    'A private, AI-guided confidant that helps you discover your core values, understand the patterns you bring to love, and find a partner who can truly see you.',
  openGraph: {
    title: 'Love Values — know what you value, be truly seen',
    description:
      'Almost every dating app starts with a face. This one starts with what you value — because that is what actually makes love last.',
    url: SITE_URL,
    siteName: 'Love Values',
    type: 'website',
  },
};

export const viewport: Viewport = {
  themeColor: '#ffffff',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={jakarta.variable}>
      <body>{children}</body>
    </html>
  );
}
