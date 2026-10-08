import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { CheckCircle2, Info, TriangleAlert, CircleX, X } from 'lucide-react';
import { cn } from '../utils/cn';

type Tone = 'success' | 'info' | 'warning' | 'danger';

interface ToastItem {
  id: number;
  tone: Tone;
  title: string;
  description?: string;
}

interface ToastApi {
  toast: (item: { tone?: Tone; title: string; description?: string }) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

const TONE: Record<Tone, { icon: typeof Info; cls: string }> = {
  success: { icon: CheckCircle2, cls: 'text-gov-700' },
  info: { icon: Info, cls: 'text-navy-700' },
  warning: { icon: TriangleAlert, cls: 'text-amber-700' },
  danger: { icon: CircleX, cls: 'text-red-700' },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => setItems((list) => list.filter((t) => t.id !== id)), []);

  const toast = useCallback<ToastApi['toast']>(
    ({ tone = 'success', title, description }) => {
      const id = nextId.current++;
      setItems((list) => [...list.slice(-2), { id, tone, title, description }]);
      window.setTimeout(() => dismiss(id), tone === 'danger' ? 7000 : 4500);
    },
    [dismiss],
  );

  const api = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed inset-x-3 bottom-24 z-[70] flex flex-col items-center gap-2 md:inset-x-auto md:bottom-6 md:right-6 md:items-end" aria-live="polite" aria-atomic="false">
        {items.map((item) => {
          const { icon: Icon, cls } = TONE[item.tone];
          return (
            <div key={item.id} role={item.tone === 'danger' ? 'alert' : 'status'} className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-lg animate-pop-in">
              <Icon className={cn('mt-0.5 size-5 shrink-0', cls)} aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-navy-900">{item.title}</p>
                {item.description && <p className="mt-0.5 text-sm text-slate-600">{item.description}</p>}
              </div>
              <button type="button" onClick={() => dismiss(item.id)} className="rounded-md p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy-600" aria-label="Dismiss notification">
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
}
