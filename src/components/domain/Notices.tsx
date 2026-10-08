import { Info, Lock } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '../../utils/cn';

/** Required wording wherever AI output is shown. */
export function AIDisclaimer({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-start gap-3 rounded-xl border border-navy-100 bg-navy-50/70 px-4 py-3 text-sm text-navy-950', className)}>
      <Info className="mt-0.5 size-5 shrink-0 text-navy-700" aria-hidden="true" />
      <p>
        <span className="font-semibold">AI-assisted pre-verification provides decision support only.</span> Final decision is made by the authorized department officer.
      </p>
    </div>
  );
}

export function SecurityNote({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={cn('flex items-start gap-2 text-xs text-slate-600', className)}>
      <Lock className="mt-0.5 size-3.5 shrink-0 text-slate-500" aria-hidden="true" />
      <span>{children}</span>
    </p>
  );
}
