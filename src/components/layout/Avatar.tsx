import { cn } from '../../utils/cn';
import { initials } from '../../utils/format';

export function Avatar({ name, size = 'md', className }: { name: string; size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const dims = { sm: 'size-8 text-xs', md: 'size-9 text-sm', lg: 'size-14 text-lg' }[size];
  return (
    <span className={cn('inline-flex shrink-0 items-center justify-center rounded-full bg-amber-300 font-bold text-navy-950', dims, className)} aria-hidden="true">
      {initials(name)}
    </span>
  );
}
