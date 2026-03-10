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
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={monoton.variable} suppressHydrationWarning>
      <body className="antialiased" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
