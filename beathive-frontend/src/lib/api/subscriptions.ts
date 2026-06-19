// src/lib/api/subscriptions.ts
import { apiClient } from './client';
import type { Subscription } from '@/types';

export const subscriptionsApi = {
  getMy: async (): Promise<Subscription> => {
    const { data } = await apiClient.get('/subscriptions/me');
    return data;
  },

  upgrade: async (planSlug: string, billingCycle: 'monthly' | 'yearly' | '1month' | '3months' | '6months' | '12months') => {
    const { data } = await apiClient.post('/subscriptions/upgrade', {
      planSlug,
      billingCycle,
    }, { timeout: 20_000 });
    return data as { snapToken: string; orderId: string; price: number };
  },

  verifyPayment: async (orderId: string) => {
    const { data } = await apiClient.post('/subscriptions/verify-payment', { orderId });
    return data as { activated: boolean; alreadyActive?: boolean };
  },

  cancel: async () => {
    const { data } = await apiClient.delete('/subscriptions/me');
    return data as { message: string; accessUntil: string };
  },
};
