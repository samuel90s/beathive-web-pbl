// src/app/page.tsx
import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="max-w-5xl mx-auto px-4">

      {/* Hero */}
      <section className="py-20 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-violet-50 text-violet-700 text-xs font-medium rounded-full mb-6">
          <span className="w-1.5 h-1.5 bg-violet-500 rounded-full" />
          10.000+ sound effect siap pakai
        </div>
        <h1 className="text-4xl md:text-5xl font-semibold text-gray-900 leading-tight mb-5">
          Sound effect premium<br />
          <span className="text-violet-600">untuk kreator konten</span>
        </h1>
        <p className="text-lg text-gray-400 max-w-xl mx-auto mb-8">
          Ribuan SFX berkualitas tinggi untuk video, game, podcast, dan iklan. Berlangganan atau beli satuan — pilihan ada di tangan kamu.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link href="/browse"
            className="px-6 py-3 bg-violet-600 text-white rounded-xl font-medium hover:bg-violet-700 transition-colors">
            Browse Sound Effects
          </Link>
          <Link href="/pricing"
            className="px-6 py-3 border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors">
            Lihat Harga
          </Link>
        </div>
      </section>

      {/* Categories */}
      <section className="py-10">
        <h2 className="text-xl font-semibold text-gray-900 mb-5">Jelajahi kategori</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { slug: 'aksi', label: 'Aksi & Efek', icon: '💥', count: '1.2k+' },
            { slug: 'alam', label: 'Alam', icon: '🌿', count: '800+' },
            { slug: 'ui-game', label: 'UI / Game', icon: '🎮', count: '2k+' },
            { slug: 'suasana', label: 'Suasana', icon: '🌆', count: '600+' },
            { slug: 'manusia', label: 'Manusia', icon: '🚶', count: '400+' },
            { slug: 'kendaraan', label: 'Kendaraan', icon: '🚗', count: '300+' },
            { slug: 'hewan', label: 'Hewan', icon: '🐾', count: '250+' },
            { slug: 'elektronik', label: 'Elektronik', icon: '⚡', count: '500+' },
          ].map((cat) => (
            <Link
              key={cat.slug}
              href={`/browse?categorySlug=${cat.slug}`}
              className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-100 hover:border-violet-200 hover:bg-violet-50 transition-all group"
            >
              <span className="text-2xl">{cat.icon}</span>
              <div>
                <p className="text-sm font-medium text-gray-900 group-hover:text-violet-700">{cat.label}</p>
                <p className="text-xs text-gray-400">{cat.count} SFX</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="py-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            {
              icon: '🎧',
              title: 'Preview sebelum beli',
              desc: 'Dengarkan preview 30 detik untuk setiap sound effect sebelum memutuskan.',
            },
            {
              icon: '📄',
              title: 'Lisensi jelas & legal',
              desc: 'Setiap pembelian dilengkapi sertifikat lisensi PDF yang sah secara hukum.',
            },
            {
              icon: '⚡',
              title: 'Download instan',
              desc: 'Setelah bayar, file langsung tersedia. Format WAV resolusi tinggi.',
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
          <h2 className="text-2xl font-semibold mb-2">Mulai gratis sekarang</h2>
          <p className="text-violet-200 mb-6 text-sm">5 download gratis per bulan. Tidak perlu kartu kredit.</p>
          <Link href="/auth/register"
            className="inline-block px-6 py-2.5 bg-white text-violet-700 font-medium rounded-xl hover:bg-violet-50 transition-colors text-sm">
            Buat Akun Gratis
          </Link>
        </div>
      </section>
    </div>
  );
}
