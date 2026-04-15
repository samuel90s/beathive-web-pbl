// src/lib/api/subscriptions.ts
import { apiClient } from './client';
import type { Subscription } from '@/types';

export const subscriptionsApi = {
  getMy: async (): Promise<Subscription> => {
    const { data } = await apiClient.get('/subscriptions/me');
    return data;
  },

  upgrade: async (planSlug: string, billingCycle: 'monthly' | 'yearly') => {
    const { data } = await apiClient.post('/subscriptions/upgrade', {
      planSlug,
      billingCycle,
    });
    return data as { snapToken: string; orderId: string; price: number };
  },

  cancel: async () => {
    const { data } = await apiClient.delete('/subscriptions/me');
    return data as { message: string; accessUntil: string };
  },
};
