import Link from 'next/link';

interface Category {
  id: string;
  name: string;
  slug: string;
  icon?: string;
  _count: { soundEffects: number };
}

async function getCategories(): Promise<Category[]> {
  const api = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';
  try {
    const res = await fetch(`${api}/sounds/categories`, { next: { revalidate: 3600 } });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : data.items ?? [];
  } catch {
    return [];
  }
}

export default async function HomePage() {
  const categories = await getCategories();

  return (
    <div className="max-w-5xl mx-auto px-4">

      {/* Hero */}
      <section className="py-20 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-violet-50 text-violet-700 text-xs font-medium rounded-full mb-6">
          <span className="w-1.5 h-1.5 bg-violet-500 rounded-full" />
          10,000+ ready-to-use sound effects
        </div>
        <h1 className="text-4xl md:text-5xl font-semibold text-gray-900 leading-tight mb-5">
          Premium sound effects<br />
          <span className="text-violet-600">for content creators</span>
        </h1>
        <p className="text-lg text-gray-400 max-w-xl mx-auto mb-8">
          Thousands of high-quality SFX for video, games, podcasts, and ads. Subscribe or buy individually — the choice is yours.
        </p>
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <Link href="/browse"
            className="px-6 py-3 bg-violet-600 text-white rounded-xl font-medium hover:bg-violet-700 transition-colors">
            Browse Sound Effects
          </Link>
          <Link href="/pricing"
            className="px-6 py-3 border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors">
            View Pricing
          </Link>
        </div>
      </section>

      {/* Categories */}
      {categories.length > 0 && (
        <section className="py-10">
          <h2 className="text-xl font-semibold text-gray-900 mb-5">Explore categories</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {categories.slice(0, 8).map((cat) => (
              <Link
                key={cat.slug}
                href={`/browse?categorySlug=${cat.slug}`}
                className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-100 hover:border-violet-200 hover:bg-violet-50 transition-all group"
              >
                <span className="text-2xl">{cat.icon || '🎵'}</span>
                <div>
                  <p className="text-sm font-medium text-gray-900 group-hover:text-violet-700">{cat.name}</p>
                  <p className="text-xs text-gray-400">{cat._count.soundEffects} SFX</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Features */}
      <section className="py-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            {
              icon: '🎧',
              title: 'Preview before you buy',
              desc: 'Listen to a 30-second preview of every sound effect before deciding.',
            },
            {
              icon: '📄',
              title: 'Clear & legal license',
              desc: 'Every purchase comes with a license document that is legally valid.',
            },
            {
              icon: '⚡',
              title: 'Instant download',
              desc: 'After payment, files are immediately available. High-resolution WAV format.',
            },
          ].map((f) => (
            <div key={f.title} className="p-5 bg-white rounded-2xl border border-gray-100">
              <div className="text-2xl mb-3">{f.icon}</div>
              <h3 className="text-sm font-semibold text-gray-900 mb-1.5">{f.title}</h3>
              <p className="text-sm text-gray-400 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="py-10 mb-10">
        <div className="bg-violet-600 rounded-2xl p-8 text-center text-white">
          <h2 className="text-2xl font-semibold mb-2">Start for free today</h2>
          <p className="text-violet-200 mb-6 text-sm">5 free downloads per month. No credit card required.</p>
          <Link href="/auth/register"
            className="inline-block px-6 py-2.5 bg-white text-violet-700 font-medium rounded-xl hover:bg-violet-50 transition-colors text-sm">
            Create Free Account
          </Link>
        </div>
      </section>
    </div>
  );
}
