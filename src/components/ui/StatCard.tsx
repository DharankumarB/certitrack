import type { LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '../../utils/cn';

const TONES = {
  navy: 'bg-navy-50 text-navy-800',
  green: 'bg-gov-50 text-gov-700',
  amber: 'bg-amber-50 text-amber-800',
  red: 'bg-red-50 text-red-800',
  sky: 'bg-sky-50 text-sky-800',
  violet: 'bg-violet-50 text-violet-800',
} as const;

export function StatCard({ label, value, hint, icon: Icon, tone = 'navy', to }: { label: string; value: string | number; hint?: string; icon: LucideIcon; tone?: keyof typeof TONES; to?: string }) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-slate-600">{label}</p>
        <span className={cn('flex size-9 shrink-0 items-center justify-center rounded-lg', TONES[tone])}>
          <Icon className="size-5" aria-hidden="true" />
        </span>
      </div>
      <p className="mt-3 text-2xl font-bold tracking-tight text-navy-900 tabular-nums sm:text-3xl">{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </>
  );
  const cls = 'block rounded-xl border border-slate-200 bg-white p-5 shadow-sm';
  if (to) {
    return (
      <Link to={to} className={cn(cls, 'transition-colors hover:border-navy-300 focus-visible:outline-2 focus-visible:outline-navy-500')}>
        {body}
      </Link>
    );
  }
  return <div className={cls}>{body}</div>;
}
