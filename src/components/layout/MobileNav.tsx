import { Link, useLocation } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { mobileNavigationFor } from '../../config/navigation';
import type { User } from '../../types';
import { NavIcon } from './NavIcon';
import { cn } from '../../utils/cn';

/** Bottom navigation for phones: four primary destinations plus a "More" button that opens the full menu. */
export function MobileNav({ user, onMore, moreCount }: { user: User; onMore: () => void; moreCount: number }) {
  const location = useLocation();
  const items = mobileNavigationFor(user);
  return (
    <nav aria-label="Primary mobile" className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
      <ul className="grid grid-cols-5">
        {items.map((item) => {
          const active = location.pathname === item.to || location.pathname.startsWith(`${item.to}/`);
          return (
            <li key={item.to}>
              <Link to={item.to} aria-current={active ? 'page' : undefined} className={cn('flex min-h-16 flex-col items-center justify-center gap-1 px-1 py-2 text-[11px] font-medium focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-navy-500', active ? 'text-navy-900' : 'text-slate-600')}>
                <span className={cn('flex h-7 w-12 items-center justify-center rounded-full', active && 'bg-navy-100')}>
                  <NavIcon name={item.icon} className="size-5" />
                </span>
                <span className="max-w-full truncate">{shortLabel(item.label)}</span>
              </Link>
            </li>
          );
        })}
        <li>
          <button type="button" onClick={onMore} aria-label={`More navigation${moreCount ? `, ${moreCount} new items` : ''}`} className="flex min-h-16 w-full flex-col items-center justify-center gap-1 px-1 py-2 text-[11px] font-medium text-slate-600 focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-navy-500">
            <span className="relative flex h-7 w-12 items-center justify-center rounded-full">
              <Menu className="size-5" aria-hidden="true" />
              {moreCount > 0 && <span className="absolute right-2 top-0 size-2 rounded-full bg-red-700 ring-2 ring-white" aria-hidden="true" />}
            </span>
            More
          </button>
        </li>
      </ul>
    </nav>
  );
}

function shortLabel(label: string): string {
  const map: Record<string, string> = {
    'My Applications': 'Applications',
    'Track Application': 'Track',
    'Certificate Locker': 'Locker',
    'Application Queue': 'Queue',
    'AI Verification': 'AI check',
    'Processed Applications': 'Processed',
    'Departments': 'Depts',
    'Audit Logs': 'Audit',
  };
  return map[label] ?? label;
}
