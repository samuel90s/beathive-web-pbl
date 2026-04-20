// src/components/sounds/WaveformBar.tsx
'use client';
import { memo } from 'react';

interface Props {
  data: number[];
  isActive: boolean;
  progress: number; // 0–100
}

function WaveformBar({ data, isActive, progress }: Props) {
  const bars = data?.length ? data : Array(40).fill(8);
  const progressIdx = Math.floor((progress / 100) * bars.length);

  return (
    <div className="flex items-center gap-[2px] h-8">
      {bars.map((height, i) => (
        <div
          key={i}
          className="w-[2px] rounded-full transition-colors"
          style={{
            height: `${Math.min(height, 28)}px`,
            backgroundColor:
              isActive && i < progressIdx
                ? '#7c3aed'
                : isActive
                ? '#c4b5fd'
                : '#e5e7eb',
          }}
        />
      ))}
    </div>
  );
}

export default memo(WaveformBar);
