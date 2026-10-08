import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { useCurrentUser, useAuth } from '../context/AuthContext';
import { usePersistentState } from '../hooks/usePersistentState';
import { Sidebar } from '../components/layout/Sidebar';
import { Topbar } from '../components/layout/Topbar';
import { MobileNav } from '../components/layout/MobileNav';
import { NavList } from '../components/layout/NavList';
import { DemoBanner } from '../components/layout/DemoBanner';
import { useNavCounts } from '../components/layout/navBadges';
import { Drawer } from '../components/ui/Modal';
import { Avatar } from '../components/layout/Avatar';
import { LoadingBlock } from '../components/ui/Feedback';
import { navigationFor, ROLE_LABEL } from '../config/navigation';
import { cn } from '../utils/cn';
import { useAppState } from '../hooks/useAppState';
import { useNavigate } from 'react-router-dom';

export function AppShell() {
  const user = useCurrentUser();
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const departments = useAppState((s) => s.departments);
  const [collapsed, setCollapsed] = usePersistentState<boolean>('certitrack.sidebar.collapsed', () => typeof window !== 'undefined' && window.innerWidth < 1280);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const counts = useNavCounts(user);
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    mainRef.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0 });
  }, [location.pathname]);

  const portalLabel = useMemo(() => {
    if (user.role === 'citizen') return 'Citizen portal';
    if (user.role === 'super_admin' || user.role === 'admin') return 'Super Admin console';
    const dept = 'departmentId' in user ? departments.find((d) => d.id === user.departmentId) : undefined;
    return `${dept?.shortName ?? 'Department'} department · Department staff console`;
  }, [user, departments]);

  return (
    <div className="min-h-dvh bg-slate-50">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[80] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-navy-900 focus:shadow-lg">
        Skip to main content
      </a>
      <Sidebar user={user} collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} counts={counts} />
      <div className={cn('flex min-h-dvh min-w-0 flex-col transition-[padding] duration-200', collapsed ? 'md:pl-20' : 'md:pl-64')}>
        <Topbar user={user} collapsed={collapsed} onToggleSidebar={() => setCollapsed((v) => !v)} onOpenMenu={() => setDrawerOpen(true)} portalLabel={portalLabel} />
        <DemoBanner user={user} />
        <main id="main-content" ref={mainRef} tabIndex={-1} className="mx-auto w-full min-w-0 max-w-[1400px] flex-1 px-4 pb-28 pt-6 outline-none sm:px-6 md:pb-10 lg:px-8">
          <Suspense fallback={<LoadingBlock variant="detail" label="Loading page" />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
      <MobileNav user={user} onMore={() => setDrawerOpen(true)} moreCount={counts.unread} />
      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="CertiTrack menu">
        <div className="flex flex-col gap-4 p-3">
          <div className="flex items-center gap-3 rounded-xl bg-white/5 p-3">
            <Avatar name={user.name} />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{user.name}</p>
              <p className="truncate text-xs text-slate-300">{ROLE_LABEL[user.role]}</p>
            </div>
          </div>
          <NavList items={navigationFor(user)} counts={counts} onNavigate={() => setDrawerOpen(false)} />
          <button
            type="button"
            onClick={() => void signOut().then(() => navigate('/login', { replace: true }))}
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-200 hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-amber-300"
          >
            <LogOut className="size-5" aria-hidden="true" />
            Sign out
          </button>
        </div>
      </Drawer>
    </div>
  );
}
