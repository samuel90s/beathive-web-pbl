// src/app/providers.tsx
'use client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import ToastContainer from '@/components/ToastContainer';
import { useThemeStore } from '@/lib/store/theme.store';

function ThemeInitializer() {
  const { theme } = useThemeStore();
  useEffect(() => {
    const html = document.documentElement;
    html.classList.remove('dark', 'light');
    html.classList.add(theme);
  }, [theme]);
  return null;
}

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
  }));

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeInitializer />
        {children}
        <ToastContainer />
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
