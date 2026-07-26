import type { Metadata } from 'next';
import './globals.css';

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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,600;1,9..144,400&family=Instrument+Sans:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
