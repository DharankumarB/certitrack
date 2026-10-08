import { useId, type KeyboardEvent, type ReactNode } from 'react';
import { cn } from '../../utils/cn';

export interface SegmentOption<T extends string> {
  value: T;
  label: ReactNode;
  count?: number;
}

/** Segmented control for filters and ranges. Radio semantics keep it keyboard friendly. */
export function Segmented<T extends string>({ label, value, onChange, options, className }: { label: string; value: T; onChange: (v: T) => void; options: SegmentOption<T>[]; className?: string }) {
  const groupId = useId();
  const onKey = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const next = (index + (e.key === 'ArrowRight' ? 1 : options.length - 1)) % options.length;
    onChange(options[next]!.value);
    document.getElementById(`${groupId}-${next}`)?.focus();
  };
  return (
    <div role="radiogroup" aria-label={label} className={cn('inline-flex max-w-full flex-wrap gap-1 rounded-xl bg-slate-100 p-1', className)}>
      {options.map((opt, i) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            id={`${groupId}-${i}`}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(opt.value)}
            onKeyDown={(e) => onKey(e, i)}
            className={cn('inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-navy-500', active ? 'bg-white text-navy-900 shadow-sm' : 'text-slate-600 hover:text-slate-900')}
          >
            {opt.label}
            {opt.count !== undefined && <span className={cn('rounded-full px-1.5 text-xs', active ? 'bg-navy-50 text-navy-800' : 'bg-slate-200 text-slate-700')}>{opt.count}</span>}
          </button>
        );
      })}
    </div>
  );
}

export function Tabs<T extends string>({ label, value, onChange, options }: { label: string; value: T; onChange: (v: T) => void; options: SegmentOption<T>[] }) {
  return (
    <div role="tablist" aria-label={label} className="flex gap-1 overflow-x-auto border-b border-slate-200">
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(opt.value)}
            className={cn('-mb-px inline-flex shrink-0 items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-navy-500', active ? 'border-navy-800 text-navy-900' : 'border-transparent text-slate-600 hover:text-slate-900')}
          >
            {opt.label}
            {opt.count !== undefined && <span className="rounded-full bg-slate-100 px-2 text-xs text-slate-700">{opt.count}</span>}
          </button>
        );
      })}
    </div>
  );
}
