// src/lib/hooks/useAuth.ts
'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/auth.store';
import { useCartStore } from '@/lib/store/cart.store';
import { authApi } from '@/lib/api/auth';

export function useAuth() {
  const store = useAuthStore();
  const cart = useCartStore();
  const router = useRouter();

  // Fetch user data saat mount jika ada token
  useEffect(() => {
    if (store.accessToken && !store.user) {
      authApi.getMe()
        .then((user) => store.setUser(user))
        .catch(() => store.logout());
    }
  }, []);

  const login = async (email: string, password: string) => {
    // Clear previous user's cart before logging in as new user
    cart.clearCart();
    const result = await authApi.login(email, password);
    store.setAuth(result.user, result.accessToken, result.refreshToken);
    return result;
  };

  const register = async (name: string, email: string, password: string, role?: string) => {
    cart.clearCart();
    const result = await authApi.register(name, email, password, role);
    store.setAuth(result.user, result.accessToken, result.refreshToken);
    return result;
  };

  const logout = () => {
    cart.clearCart(); // Clear cart on logout so next user starts fresh
    store.logout();
    router.push('/');
  };

  return {
    user: store.user,
    isAuthenticated: store.isAuthenticated,
    login,
    register,
    logout,
  };
}

// Guard hook — redirect ke login kalau belum auth
export function useRequireAuth() {
  const { isAuthenticated } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthenticated]);

  return isAuthenticated;
}
