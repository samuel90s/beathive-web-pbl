import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-white border-t border-gray-100 mt-16">
      <div className="max-w-7xl mx-auto px-4 py-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
          <div className="col-span-2 md:col-span-1">
            <span className="text-lg font-semibold">beat<span className="text-violet-600">hive</span></span>
            <p className="text-xs text-gray-400 mt-2 leading-relaxed">
              Premium sound effects for content creators, game developers, and filmmakers.
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-3">Explore</p>
            <ul className="space-y-2">
              <li><Link href="/browse" className="text-sm text-gray-500 hover:text-violet-600 transition-colors">Browse Sounds</Link></li>
              <li><Link href="/pricing" className="text-sm text-gray-500 hover:text-violet-600 transition-colors">Pricing</Link></li>
              <li><Link href="/wishlist" className="text-sm text-gray-500 hover:text-violet-600 transition-colors">Wishlist</Link></li>
            </ul>
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-3">Creator</p>
            <ul className="space-y-2">
              <li><Link href="/studio" className="text-sm text-gray-500 hover:text-violet-600 transition-colors">Studio</Link></li>
              <li><Link href="/dashboard" className="text-sm text-gray-500 hover:text-violet-600 transition-colors">Dashboard</Link></li>
            </ul>
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-3">Legal</p>
            <ul className="space-y-2">
              <li><span className="text-sm text-gray-500">Terms of Service</span></li>
              <li><span className="text-sm text-gray-500">Privacy Policy</span></li>
              <li><span className="text-sm text-gray-500">License FAQ</span></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-100 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-gray-400">© {new Date().getFullYear()} BeatHive. All rights reserved.</p>
          <p className="text-xs text-gray-400">Made for creators, by creators.</p>
        </div>
      </div>
    </footer>
  );
}
