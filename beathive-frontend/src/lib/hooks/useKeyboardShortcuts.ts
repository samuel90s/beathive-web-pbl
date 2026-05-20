// src/lib/hooks/useKeyboardShortcuts.ts
'use client';
import { useEffect } from 'react';
import { usePlayerStore } from '@/lib/store/player.store';

export function useKeyboardShortcuts() {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Jangan aktif saat user sedang di input/textarea
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable
      ) return;

      const store = usePlayerStore.getState();

      switch (e.key) {
        case ' ':
          // Space: play/pause
          if (!store.currentTrack) return;
          e.preventDefault();
          store.isPlaying ? store.pause() : store.resume();
          break;

        case 'ArrowLeft':
          // Rewind 10 detik
          if (!store.currentTrack) return;
          e.preventDefault();
          if (store.audioRef?.current) {
            store.audioRef.current.currentTime = Math.max(
              0, store.audioRef.current.currentTime - 10
            );
          }
          break;

        case 'ArrowRight':
          // Forward 10 detik
          if (!store.currentTrack) return;
          e.preventDefault();
          if (store.audioRef?.current) {
            store.audioRef.current.currentTime = Math.min(
              store.audioRef.current.duration || 0,
              store.audioRef.current.currentTime + 10
            );
          }
          break;

        case 'm':
        case 'M':
          // Mute/unmute
          e.preventDefault();
          if (store.audioRef?.current) {
            store.audioRef.current.muted = !store.audioRef.current.muted;
          }
          break;
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);
}
