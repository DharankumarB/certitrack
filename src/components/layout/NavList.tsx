import { Link, useLocation } from 'react-router-dom';
import type { NavItem } from '../../config/navigation';
import { cn } from '../../utils/cn';
import { NavIcon } from './NavIcon';
import type { NavCounts } from './navBadges';
import { activeNavIndex } from './navigation';

export function NavList({ items, counts, collapsed = false, onNavigate, id }: { items: NavItem[]; counts: NavCounts; collapsed?: boolean; onNavigate?: () => void; id?: string }) {
  const location = useLocation();
  const active = activeNavIndex(items, location.pathname, location.search);
  return (
    <ul id={id} className="flex flex-col gap-1">
      {items.map((item, index) => {
        const isActive = index === active;
        const count = item.badge ? counts[item.badge] : 0;
        const to = item.query ? `${item.to}?${new URLSearchParams(item.query).toString()}` : item.to;
        return (
          <li key={`${item.to}-${item.label}`}>
            <Link
              to={to}
              onClick={onNavigate}
              aria-current={isActive ? 'page' : undefined}
              title={collapsed ? item.label : undefined}
              className={cn(
                'group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-200 transition-colors',
                'hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-amber-300',
                isActive && 'bg-white/12 text-white shadow-[inset_3px_0_0_0_#f59e0b]',
                collapsed && 'justify-center px-0',
              )}
            >
              <NavIcon name={item.icon} className="size-5 shrink-0" />
              <span className={cn('min-w-0 flex-1 truncate', collapsed && 'sr-only')}>{item.label}</span>
              {count > 0 && (
                <span className={cn('ml-auto rounded-full bg-amber-400 px-1.5 text-xs font-bold text-navy-950', collapsed && 'absolute right-1.5 top-1.5 size-2.5 p-0 text-[0px]')} aria-label={`${count} ${item.badge === 'unread' ? 'unread' : 'pending'}`}>
                  {collapsed ? '' : count > 99 ? '99+' : count}
                </span>
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
