// src/components/sounds/WaveformBar.tsx
'use client';
import { memo, useMemo } from 'react';

interface Props {
  data: number[];
  isActive: boolean;
  progress: number; // 0–100
}

function WaveformBar({ data, isActive, progress }: Props) {
  const bars = useMemo(() => {
    const raw = data?.length ? data : Array(48).fill(0).map((_, i) => Math.sin(i * 0.4) * 0.4 + 0.5);
    const max = Math.max(...raw, 1);
    return raw.map((v) => (v as number) / max);
  }, [data]);
  const progressIdx = Math.floor((progress / 100) * bars.length);

  return (
    <div className="flex items-center gap-[2px] h-9 w-full overflow-hidden">
      {bars.map((height, i) => {
        const played = isActive && i < progressIdx;
        const active = isActive && !played;
        const h = Math.max(3, Math.round(height * 32));
        return (
          <div
            key={i}
            className="flex-1 rounded-[1px] transition-all duration-75"
            style={{
              height: `${h}px`,
              backgroundColor: played
                ? '#F7941D'
                : active
                ? 'var(--wave-active)'
                : 'var(--wave-muted)',
              minWidth: '2px',
            }}
          />
        );
      })}
    </div>
  );
}

export default memo(WaveformBar);
