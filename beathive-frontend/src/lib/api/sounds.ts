// src/lib/api/sounds.ts
import { apiClient } from './client';
import type { SoundsResponse, SoundEffect, SoundFilters } from '@/types';

export const soundsApi = {
  getAll: async (filters: SoundFilters = {}): Promise<SoundsResponse> => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== '') params.set(k, String(v));
    });
    const { data } = await apiClient.get(`/sounds?${params}`);
    return data;
  },

  getOne: async (slug: string): Promise<SoundEffect> => {
    const { data } = await apiClient.get(`/sounds/${slug}`);
    return data;
  },

  requestDownload: async (id: string) => {
    const { data } = await apiClient.post(`/sounds/${id}/download`);
    return data as { downloadUrl: string; expiresAt: string; fileName: string };
  },
};
