import type { LucideIcon } from 'lucide-react';
import { cn } from '../../utils/cn';

export type BadgeTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'progress' | 'demo' | 'violet';

const TONES: Record<BadgeTone, string> = {
  neutral: 'bg-slate-100 text-slate-700 ring-slate-200',
  info: 'bg-sky-50 text-sky-800 ring-sky-200',
  success: 'bg-gov-50 text-gov-700 ring-gov-100',
  warning: 'bg-amber-50 text-amber-800 ring-amber-200',
  danger: 'bg-red-50 text-red-800 ring-red-200',
  progress: 'bg-violet-50 text-violet-800 ring-violet-200',
  demo: 'bg-navy-50 text-navy-800 ring-navy-100',
  violet: 'bg-violet-50 text-violet-800 ring-violet-200',
};

/** Status is always conveyed by text and icon, never by colour alone. */
export function Badge({ tone = 'neutral', icon: Icon, children, className, title }: { tone?: BadgeTone; icon?: LucideIcon; children: React.ReactNode; className?: string; title?: string }) {
  return (
    <span title={title} className={cn('inline-flex max-w-full items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset whitespace-nowrap', TONES[tone], className)}>
      {Icon && <Icon className="size-3.5 shrink-0" aria-hidden="true" />}
      <span className="truncate">{children}</span>
    </span>
  );
}

export function ProgressBar({ value, label, tone = 'navy' }: { value: number; label: string; tone?: 'navy' | 'green' | 'amber' | 'red' }) {
  const clamped = Math.max(0, Math.min(100, Math.round(value)));
  const color = { navy: 'bg-navy-700', green: 'bg-gov-600', amber: 'bg-amber-500', red: 'bg-red-600' }[tone];
  return (
    <div role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={clamped} aria-label={label} className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
      <div className={cn('h-full rounded-full transition-[width] duration-500', color)} style={{ width: `${clamped}%` }} />
    </div>
  );
}
