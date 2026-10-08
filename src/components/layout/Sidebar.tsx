import { LogOut, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { NAV } from '../../config/navigation';
import type { User } from '../../types';
import { Logo } from '../ui/Logo';
import { NavList } from './NavList';
import type { NavCounts } from './navBadges';
import { useAuth } from '../../context/AuthContext';
import { Avatar } from './Avatar';
import { cn } from '../../utils/cn';

export function Sidebar({ user, collapsed, onToggle, counts }: { user: User; collapsed: boolean; onToggle: () => void; counts: NavCounts }) {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  return (
    <aside aria-label="Primary" className={cn('fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-navy-800 bg-navy-900 text-white transition-[width] duration-200 md:flex', collapsed ? 'w-20' : 'w-64')}>
      <div className={cn('flex h-16 shrink-0 items-center border-b border-white/10 px-4', collapsed && 'justify-center px-0')}>
        <Logo compact={collapsed} tone="light" />
      </div>
      <nav aria-label="Main navigation" className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-3 py-4">
        <NavList items={NAV[user.role]} counts={counts} collapsed={collapsed} id="sidebar-nav" />
      </nav>
      <div className={cn('shrink-0 border-t border-white/10 p-3', collapsed && 'flex flex-col items-center gap-2')}>
        <div className={cn('flex items-center gap-3', collapsed && 'justify-center')}>
          <Avatar name={user.name} size="sm" />
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{user.name}</p>
              <p className="truncate text-xs text-slate-300">{user.role === 'citizen' ? 'Citizen' : user.role === 'officer' ? 'Department officer' : 'Super Admin'}</p>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => void signOut().then(() => navigate('/login', { replace: true }))}
          className={cn('mt-3 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-200 hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-amber-300', collapsed && 'mt-2 justify-center px-2')}
          aria-label="Sign out"
        >
          <LogOut className="size-4 shrink-0" aria-hidden="true" />
          {!collapsed && 'Sign out'}
        </button>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={!collapsed}
          aria-controls="sidebar-nav"
          className={cn('mt-2 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-slate-300 hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-amber-300', collapsed && 'justify-center px-2')}
        >
          {collapsed ? <PanelLeftOpen className="size-4" aria-hidden="true" /> : <PanelLeftClose className="size-4" aria-hidden="true" />}
          {!collapsed && 'Collapse menu'}
          <span className="sr-only">{collapsed ? 'Expand sidebar' : 'Collapse sidebar'}</span>
        </button>
      </div>
    </aside>
  );
}
