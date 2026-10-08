import { useId, useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../utils/cn';

export function Disclosure({ title, children, defaultOpen = false, className, id }: { title: ReactNode; children: ReactNode; defaultOpen?: boolean; className?: string; id?: string }) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();
  return (
    <div className={cn('border-b border-slate-200 last:border-b-0', className)} id={id}>
      <h3>
        <button type="button" aria-expanded={open} aria-controls={panelId} onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between gap-4 py-4 text-left text-base font-semibold text-navy-900 focus-visible:outline-2 focus-visible:outline-navy-500">
          {title}
          <ChevronDown className={cn('size-5 shrink-0 text-slate-500 transition-transform', open && 'rotate-180')} aria-hidden="true" />
        </button>
      </h3>
      {open && (
        <div id={panelId} className="pb-5 text-sm leading-relaxed text-slate-700">
          {children}
        </div>
      )}
    </div>
  );
}
