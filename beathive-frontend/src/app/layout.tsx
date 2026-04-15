// src/app/layout.tsx
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Providers from './providers';
import Navbar from '@/components/layout/Navbar';
import GlobalPlayer from '@/components/player/GlobalPlayer';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'BeatHive — Stock Sound Effects & Music',
  description: 'BeatHive — Ribuan sound effect premium untuk kreator konten, developer game, dan kreator video.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body className={`${inter.className} bg-gray-50 text-gray-900 antialiased`}>
        <Providers>
          <Navbar />
          <main className="min-h-screen pb-24">
            {children}
          </main>
          <GlobalPlayer />
        </Providers>
      </body>
    </html>
  );
}
