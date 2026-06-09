// src/lib/hooks/useSounds.ts
'use client';
import { useQuery } from '@tanstack/react-query';
import { soundsApi } from '@/lib/api/sounds';
import type { SoundFilters } from '@/types';

export function useSounds(filters: SoundFilters = {}, enabled = true) {
  return useQuery({
    queryKey: ['sounds', filters],
    queryFn: () => soundsApi.getAll(filters),
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
    placeholderData: (previousData) => previousData,
    refetchOnWindowFocus: false,
    enabled,
  });
}

export function useSound(slug: string) {
  return useQuery({
    queryKey: ['sound', slug],
    queryFn: () => soundsApi.getOne(slug),
    enabled: !!slug,
  });
}
