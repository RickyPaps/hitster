import type { Metadata, Viewport } from 'next';
import { Monoton } from 'next/font/google';
import './globals.css';

const monoton = Monoton({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Hitster - Music Bingo',
  description: 'The ultimate music bingo party game',
};

export const viewport: Viewport = {
  interactiveWidget: 'overlays-content',
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={monoton.variable} suppressHydrationWarning>
      <body className="antialiased" suppressHydrationWarning>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:rounded-lg focus:bg-fuchsia-600 focus:text-white focus:text-sm focus:font-bold"
        >
          Skip to content
        </a>
        <main id="main-content">
          {children}
        </main>
      </body>
    </html>
  );
}
