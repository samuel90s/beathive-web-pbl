// src/app/layout.tsx
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Script from 'next/script';
import './globals.css';
import Providers from './providers';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import GlobalPlayer from '@/components/player/GlobalPlayer';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'BeatHive — Premium Sound Effects & Music',
  description: 'Thousands of premium sound effects for content creators, game developers, and video creators.',
};

const isProduction = process.env.NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION === 'true';
const midtransSnapUrl = isProduction
  ? 'https://app.midtrans.com/snap/snap.js'
  : 'https://app.sandbox.midtrans.com/snap/snap.js';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <head>
        {/* Apply stored theme before first paint to prevent flash */}
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var t=JSON.parse(localStorage.getItem('beathive-theme')||'{}').state?.theme||'dark';document.documentElement.classList.add(t);}catch(e){document.documentElement.classList.add('dark');}})();` }} />
      </head>
      <body className={`${inter.className} bg-base text-[#e2e3ef] antialiased`}>
        <Providers>
          <Navbar />
          <main className="min-h-screen pb-28">
            {children}
          </main>
          <Footer />
          <GlobalPlayer />
        </Providers>
        <Script
          src={midtransSnapUrl}
          data-client-key={process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY}
          strategy="lazyOnload"
        />
      </body>
    </html>
  );
}
