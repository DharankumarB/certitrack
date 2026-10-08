import { cn } from '../../utils/cn';

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={cn('size-9 shrink-0', className)} aria-hidden="true">
      <rect width="40" height="40" rx="10" className="fill-navy-800" />
      <path d="M11 21.5l5.5 5.5L29 14.5" fill="none" stroke="#f59e0b" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Logo({ compact = false, tone = 'dark', taglineFromSm = false }: { compact?: boolean; tone?: 'dark' | 'light'; taglineFromSm?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <LogoMark />
      {!compact && (
        <span className="leading-none">
          <span className={cn('block text-lg font-bold tracking-tight', tone === 'dark' ? 'text-navy-900' : 'text-white')}>CertiTrack</span>
          <span className={cn('mt-1 block text-[11px] font-medium', taglineFromSm && 'hidden sm:block', tone === 'dark' ? 'text-slate-500' : 'text-slate-300')}>One portal · every certificate</span>
        </span>
      )}
    </span>
  );
}
