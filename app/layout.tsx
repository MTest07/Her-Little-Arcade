import type { Metadata } from 'next';
import { Shantell_Sans, Patrick_Hand, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const markerFont = Shantell_Sans({
  subsets: ['latin'],
  weight: ['600', '700', '800'],
  variable: '--font-sketch-marker',
});

const handFont = Patrick_Hand({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-sketch-hand',
});

const monoFont = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  variable: '--font-mono',
});

export const metadata: Metadata = {
  title: 'Her Little Arcade',
  description:
    'A cozy, personalized online arcade for two with 21 single-player and multiplayer games, custom chess clocks, private rooms, voice and text chat, shared memories, and progression.',
  openGraph: {
    title: 'Her Little Arcade',
    description:
      'A cozy, personalized online arcade for two with 21 single-player and multiplayer games, custom chess clocks, private rooms, voice and text chat, shared memories, and progression.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Her Little Arcade',
    description:
      'A cozy, personalized online arcade for two with 21 single-player and multiplayer games, custom chess clocks, private rooms, voice and text chat, shared memories, and progression.',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${markerFont.variable} ${handFont.variable} ${monoFont.variable}`}
    >
      <body
        suppressHydrationWarning
        className="sketch-sheet min-h-screen antialiased"
      >
        {children}
      </body>
    </html>
  );
}
