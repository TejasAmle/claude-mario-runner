import type { Metadata, Viewport } from 'next';
import { Inter, Instrument_Serif, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const sans = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const serif = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-serif',
  display: 'swap',
});

const mono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'claude-mario-runner · global leaderboard',
  description:
    'Public leaderboard for claude-mario-runner, a Chrome-dino-style terminal infinite runner.',
  openGraph: {
    title: 'claude-mario-runner · global leaderboard',
    description: 'Top scores across the world. Play: npx claude-mario-runner',
    type: 'website',
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F5F4EF' },
    { media: '(prefers-color-scheme: dark)', color: '#1D1B16' },
  ],
};

/**
 * Blocking inline script that runs before first paint so we never flash the
 * wrong theme on page load. It reads localStorage first, falls back to
 * prefers-color-scheme, and writes data-theme on <html> synchronously.
 */
const themeInit = `(function(){try{var t=localStorage.getItem('cmr-theme');if(!t){t=window.matchMedia('(prefers-color-scheme: light)').matches?'light':'dark';}document.documentElement.setAttribute('data-theme',t);}catch(e){document.documentElement.setAttribute('data-theme','dark');}})();`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <html
      lang="en"
      className={`${sans.variable} ${serif.variable} ${mono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
