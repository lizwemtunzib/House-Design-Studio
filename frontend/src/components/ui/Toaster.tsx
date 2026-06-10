import { create } from 'zustand';
import { useEffect } from 'react';

interface Toast { id: string; type: 'success' | 'error' | 'info'; message: string; }
interface ToastStore { toasts: Toast[]; add: (t: Omit<Toast, 'id'>) => void; remove: (id: string) => void; }

export const useToastStore = create<ToastStore>()((set) => ({
  toasts: [],
  add: (t) => set((s) => ({ toasts: [...s.toasts, { ...t, id: Math.random().toString(36).slice(2) }] })),
  remove: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

export const toast = {
  success: (message: string) => useToastStore.getState().add({ type: 'success', message }),
  error: (message: string) => useToastStore.getState().add({ type: 'error', message }),
  info: (message: string) => useToastStore.getState().add({ type: 'info', message }),
};

function ToastItem({ t }: { t: Toast }) {
  const remove = useToastStore((s) => s.remove);
  useEffect(() => { const timer = setTimeout(() => remove(t.id), 4000); return () => clearTimeout(timer); }, [t.id, remove]);
  const colors = { success: 'bg-green-50 border-green-200 text-green-800', error: 'bg-red-50 border-red-200 text-red-800', info: 'bg-blue-50 border-blue-200 text-blue-800' };
  const icons = { success: '✓', error: '✕', info: 'ℹ' };
  return (
    <div className={`flex items-start gap-3 px-4 py-3 rounded-xl border shadow-lg animate-slide-up ${colors[t.type]} max-w-sm w-full`}>
      <span className="font-bold text-base flex-shrink-0">{icons[t.type]}</span>
      <p className="text-sm font-medium flex-1">{t.message}</p>
      <button onClick={() => remove(t.id)} className="opacity-60 hover:opacity-100 transition-opacity flex-shrink-0">✕</button>
    </div>
  );
}

export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 items-end">
      {toasts.map((t) => <ToastItem key={t.id} t={t} />)}
    </div>
  );
}
