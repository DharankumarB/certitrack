import type { LucideIcon } from 'lucide-react';
import { AlertTriangle, Inbox, RotateCw, Info, CheckCircle2, CircleX, TriangleAlert } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '../../utils/cn';
import { Button } from './Button';
import { errorMessage } from '../../services/api';

type AlertTone = 'info' | 'success' | 'warning' | 'danger';
const ALERT: Record<AlertTone, { cls: string; icon: LucideIcon }> = {
  info: { cls: 'border-sky-200 bg-sky-50 text-sky-950', icon: Info },
  success: { cls: 'border-gov-100 bg-gov-50 text-gov-700', icon: CheckCircle2 },
  warning: { cls: 'border-amber-200 bg-amber-50 text-amber-950', icon: TriangleAlert },
  danger: { cls: 'border-red-200 bg-red-50 text-red-950', icon: CircleX },
};

/** Inline message block. Always pairs colour with an icon and a text title. */
export function Alert({ tone = 'info', title, children, className, action }: { tone?: AlertTone; title?: ReactNode; children?: ReactNode; className?: string; action?: ReactNode }) {
  const { cls, icon: Icon } = ALERT[tone];
  return (
    <div role={tone === 'danger' ? 'alert' : 'status'} className={cn('flex items-start gap-3 rounded-xl border px-4 py-3 text-sm', cls, className)}>
      <Icon className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={cn(title ? 'mt-0.5' : undefined, 'text-current/90')}>{children}</div>}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({ icon: Icon = Inbox, title, description, action, className }: { icon?: LucideIcon; title: string; description?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn('flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center', className)}>
      <span className="mb-4 flex size-12 items-center justify-center rounded-full bg-navy-50 text-navy-700">
        <Icon className="size-6" aria-hidden="true" />
      </span>
      <h3 className="text-base font-semibold text-navy-900">{title}</h3>
      {description && <p className="mt-1 max-w-md text-sm text-slate-600">{description}</p>}
      {action && <div className="mt-5 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  );
}

export function ErrorState({ error, onRetry, title = 'We could not load this', className }: { error: unknown; onRetry?: () => void; title?: string; className?: string }) {
  return (
    <div role="alert" className={cn('flex flex-col items-center justify-center rounded-xl border border-red-200 bg-red-50/60 px-6 py-10 text-center', className)}>
      <span className="mb-3 flex size-12 items-center justify-center rounded-full bg-red-100 text-red-800">
        <AlertTriangle className="size-6" aria-hidden="true" />
      </span>
      <h3 className="text-base font-semibold text-red-950">{title}</h3>
      <p className="mt-1 max-w-md text-sm text-red-900/80">{errorMessage(error)}</p>
      {onRetry && (
        <Button variant="secondary" className="mt-5" icon={RotateCw} onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-md bg-slate-200/80', className)} aria-hidden="true" />;
}

/** Loading placeholder shaped like the content it replaces. */
export function LoadingBlock({ variant = 'cards', label = 'Loading…' }: { variant?: 'cards' | 'list' | 'detail' | 'chart' | 'table'; label?: string }) {
  return (
    <div role="status" aria-live="polite" className="w-full">
      <span className="sr-only">{label}</span>
      {variant === 'cards' && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 grid-cols-1">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      )}
      {variant === 'list' && (
        <div className="space-y-3">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      )}
      {variant === 'table' && (
        <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-4">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-10" />
          ))}
        </div>
      )}
      {variant === 'chart' && <Skeleton className="h-72 rounded-xl" />}
      {variant === 'detail' && (
        <div className="grid gap-4 lg:grid-cols-3 grid-cols-1">
          <Skeleton className="h-96 rounded-xl lg:col-span-2" />
          <Skeleton className="h-96 rounded-xl" />
        </div>
      )}
    </div>
  );
}
