// src/app/not-found.tsx
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center mx-auto mb-6">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18V5l12-2v13"/>
            <circle cx="6" cy="18" r="3"/>
            <circle cx="18" cy="16" r="3"/>
            <line x1="6" y1="15" x2="18" y2="9" stroke="#ef4444" strokeWidth="2"/>
          </svg>
        </div>
        <h1 className="text-6xl font-bold text-white mb-2">404</h1>
        <p className="text-lg font-medium text-[#c4c6d8] mb-2">Page not found</p>
        <p className="text-sm text-[#6b6f82] mb-8 leading-relaxed">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link
            href="/browse"
            className="px-5 py-2.5 btn-accent rounded-xl text-sm font-medium transition-colors"
          >
            Browse Sounds
          </Link>
          <Link
            href="/"
            className="px-5 py-2.5 rounded-xl text-sm font-medium border border-rim text-[#8b8fa8] hover:text-white hover:bg-white/[0.05] transition-colors"
          >
            Go Home
          </Link>
        </div>
      </div>
    </div>
  );
}
