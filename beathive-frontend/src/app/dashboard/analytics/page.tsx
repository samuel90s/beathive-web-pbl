// src/app/dashboard/analytics/page.tsx
'use client';
import { useQuery } from '@tanstack/react-query';
import { useRequireAuth } from '@/lib/hooks/useAuth';
import { soundsApi } from '@/lib/api/sounds';

function Bar({ value, max, label }: { value: number; max: number; label: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-[#5a5d72] w-8 text-right flex-shrink-0">{label}</span>
      <div className="flex-1 h-5 bg-white/[0.04] rounded-md overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-violet-600 to-accent rounded-md transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-[#6b6f82] w-8 flex-shrink-0">{value}</span>
    </div>
  );
}

export default function AnalyticsPage() {
  const isAuth = useRequireAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['creatorAnalytics'],
    queryFn: soundsApi.getCreatorAnalytics,
    enabled: isAuth,
  });

  const maxDownloads = Math.max(...(data?.monthlyDownloads?.map(d => d.downloads) ?? [1]), 1);
  const maxSoundDownloads = Math.max(...(data?.topSounds?.map(s => s.downloadCount) ?? [1]), 1);

  return (
    <div className="px-8 py-8 pb-28">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Analytics</h1>
        <p className="text-sm text-[#5a5d72] mt-1">Performa sound kamu dalam 6 bulan terakhir</p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array(3).fill(0).map((_, i) => <div key={i} className="h-32 card rounded-2xl animate-pulse" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">

          {/* Monthly downloads chart */}
          <div className="card rounded-2xl p-6">
            <h2 className="text-base font-semibold text-white mb-5">Download per Bulan</h2>
            <div className="space-y-3">
              {data?.monthlyDownloads?.map(item => (
                <Bar key={item.month} value={item.downloads} max={maxDownloads} label={item.label} />
              ))}
            </div>
            <p className="text-xs text-[#3a3c4e] mt-4">
              Total: <span className="text-[#6b6f82]">{data?.monthlyDownloads?.reduce((s, d) => s + d.downloads, 0) ?? 0} downloads</span> dalam 6 bulan
            </p>
          </div>

          {/* Top sounds */}
          <div className="card rounded-2xl p-6">
            <h2 className="text-base font-semibold text-white mb-5">Sound Terpopuler</h2>
            {!data?.topSounds?.length ? (
              <div className="text-center py-8">
                <p className="text-sm text-[#5a5d72]">Belum ada sound yang diupload</p>
              </div>
            ) : (
              <div className="space-y-4">
                {data.topSounds.map((sound, i) => (
                  <div key={sound.id} className="flex items-center gap-3">
                    <span className="text-sm font-bold text-[#3a3c4e] w-6 text-right flex-shrink-0">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-[#c4c6d8] truncate font-medium">{sound.title}</p>
                      <div className="mt-1.5 h-2 bg-white/[0.04] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-teal-600 to-cyan-500 rounded-full transition-all duration-500"
                          style={{ width: `${Math.round((sound.downloadCount / maxSoundDownloads) * 100)}%` }}
                        />
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm text-[#c4c6d8] font-semibold">{sound.downloadCount}</p>
                      <p className="text-[11px] text-[#3a3c4e]">{sound.playCount} plays</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}
