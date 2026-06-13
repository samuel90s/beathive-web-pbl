// src/lib/store/cart.store.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CartItem, LicenseType, AudioAsset } from '@/types';

interface CartState {
  items: CartItem[];
  addItem: (sound: AudioAsset, licenseType: LicenseType) => void;
  removeItem: (soundId: string) => void;
  updateLicense: (soundId: string, licenseType: LicenseType) => void;
  clearCart: () => void;
  totalAmount: () => number;
  hasItem: (soundId: string) => boolean;
}

type PersistedCartItem = Omit<CartItem, 'licenseType'> & {
  licenseType: string;
};

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (sound, licenseType) => {
        const exists = get().items.find((i) => i.sound.id === sound.id);
        if (exists) return;
        set((state) => ({ items: [...state.items, { sound, licenseType }] }));
      },

      removeItem: (soundId) =>
        set((state) => ({
          items: state.items.filter((i) => i.sound.id !== soundId),
        })),

      updateLicense: (soundId, licenseType) =>
        set((state) => ({
          items: state.items.map((i) =>
            i.sound.id === soundId ? { ...i, licenseType } : i,
          ),
        })),

      clearCart: () => set({ items: [] }),

      totalAmount: () => {
        return get().items.reduce((sum, item) => {
          const price =
            item.licenseType === 'commercial'
              ? item.sound.price * 2
              : item.sound.price;
          return sum + price;
        }, 0);
      },

      hasItem: (soundId) => get().items.some((i) => i.sound.id === soundId),
    }),
    {
      name: 'beathive-cart',
      version: 1,
      migrate: (persistedState: unknown) => {
        const state = persistedState as Omit<Partial<CartState>, 'items'> & {
          items?: PersistedCartItem[];
        };
        return {
          ...state,
          items: (state.items ?? []).map((item): CartItem => ({
            ...item,
            licenseType:
              item.licenseType === 'sync' || item.licenseType === 'broadcast'
                ? 'commercial'
                : item.licenseType === 'commercial'
                  ? 'commercial'
                  : 'personal',
          })),
        };
      },
    },
  ),
);
