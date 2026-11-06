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

const FETCH_SHIM_SCRIPT = `
(function () {
  try {
    var currentFetch = window.fetch ? window.fetch.bind(window) : undefined;
    var winDesc = Object.getOwnPropertyDescriptor(window, 'fetch');
    if (!winDesc || winDesc.configurable) {
      Object.defineProperty(window, 'fetch', {
        configurable: true,
        enumerable: true,
        get: function () { return currentFetch; },
        set: function (fn) { if (typeof fn === 'function') { currentFetch = fn; } }
      });
    }
    if (typeof Window !== 'undefined' && Window.prototype) {
      var protoDesc = Object.getOwnPropertyDescriptor(Window.prototype, 'fetch');
      if (!protoDesc || protoDesc.configurable) {
        Object.defineProperty(Window.prototype, 'fetch', {
          configurable: true,
          enumerable: true,
          get: function () { return currentFetch; },
          set: function (fn) { if (typeof fn === 'function') { currentFetch = fn; } }
        });
      }
    }
  } catch (_) {}

  window.addEventListener('error', function (event) {
    var msg = String((event && event.message) || '');
    var file = String((event && event.filename) || '');
    if (
      msg.indexOf('Cannot set property fetch') !== -1 ||
      file.indexOf('chrome-extension://') === 0
    ) {
      event.stopImmediatePropagation();
      event.preventDefault();
      return false;
    }
  }, true);
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${markerFont.variable} ${handFont.variable} ${monoFont.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: FETCH_SHIM_SCRIPT }} />
      </head>
      <body
        suppressHydrationWarning
        className="sketch-sheet min-h-screen antialiased"
      >
        {children}
      </body>
    </html>
  );
}
