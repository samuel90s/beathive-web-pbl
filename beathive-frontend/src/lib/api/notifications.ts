import { apiClient } from './client';
import type { UserNotification } from '@/types';

export const notificationsApi = {
  list: async (limit = 20) => {
    const { data } = await apiClient.get(`/notifications?limit=${limit}`);
    return data as { items: UserNotification[]; unreadCount: number };
  },

  markRead: async (id: string) => {
    const { data } = await apiClient.patch(`/notifications/${id}/read`);
    return data as { ok: boolean };
  },

  markAllRead: async () => {
    const { data } = await apiClient.patch('/notifications/read-all');
    return data as { ok: boolean };
  },
};
