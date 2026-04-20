import type { Metadata, Viewport } from 'next';
import './globals.css';

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
  themeColor: '#1A1815',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
