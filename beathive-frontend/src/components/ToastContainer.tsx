'use client';
import { useToastStore, type Toast, type ToastType } from '@/lib/store/toast.store';

const ICONS: Record<ToastType, JSX.Element> = {
  success: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6L9 17l-5-5"/>
    </svg>
  ),
  error: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
    </svg>
  ),
  warning: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
      <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  ),
  info: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  ),
};

const STYLES: Record<ToastType, { wrap: string; icon: string }> = {
  success: { wrap: 'bg-[#0f1a14] border-[#1a3a24]', icon: 'text-teal bg-teal/10' },
  error:   { wrap: 'bg-[#1a0f0f] border-[#3a1a1a]', icon: 'text-red-400 bg-red-500/10' },
  warning: { wrap: 'bg-[#1a160f] border-[#3a2e1a]', icon: 'text-amber-400 bg-amber-500/10' },
  info:    { wrap: 'bg-[#0f111a] border-[#1a1f3a]', icon: 'text-accent-bright bg-accent/10' },
};

function ToastItem({ toast }: { toast: Toast }) {
  const remove = useToastStore((s) => s.remove);
  const s = STYLES[toast.type];

  return (
    <div
      className={`flex items-start gap-3 w-full max-w-sm rounded-xl border shadow-elevated px-4 py-3 pointer-events-auto animate-slide-in ${s.wrap}`}
      role="alert"
    >
      <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${s.icon}`}>
        {ICONS[toast.type]}
      </div>
      <p className="flex-1 text-sm text-[#c4c6d8] leading-snug">{toast.message}</p>
      <button
        onClick={() => remove(toast.id)}
        className="text-[#3a3c4e] hover:text-[#8b8fa8] transition-colors flex-shrink-0 mt-0.5"
        aria-label="Tutup"
      >
        <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M1 1l12 12M13 1L1 13"/>
        </svg>
      </button>
    </div>
  );
}

export default function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);
  if (!toasts.length) return null;

  return (
    <div className="fixed bottom-6 right-4 z-[9999] flex flex-col gap-2 items-end pointer-events-none">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} />
      ))}
    </div>
  );
}
