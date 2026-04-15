// src/lib/api/orders.ts
import { apiClient } from './client';
import type { Order, CartItem } from '@/types';

export const ordersApi = {
  create: async (items: CartItem[]) => {
    const { data } = await apiClient.post('/orders', {
      items: items.map((i) => ({
        soundEffectId: i.sound.id,
        licenseType: i.licenseType,
      })),
    });
    return data as { orderId: string; totalAmount: number; snapToken: string };
  },

  getMyOrders: async (): Promise<Order[]> => {
    const { data } = await apiClient.get('/orders/me');
    return data;
  },
};
