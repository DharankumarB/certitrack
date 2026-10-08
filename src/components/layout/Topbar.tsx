import { useState } from 'react';
import { Menu, PanelLeftClose, PanelLeftOpen, Search } from 'lucide-react';
import type { User } from '../../types';
import { Logo } from '../ui/Logo';
import { GlobalSearch } from './GlobalSearch';
import { NotificationBell } from './NotificationBell';
import { ProfileMenu } from './ProfileMenu';
import { ROLE_HOME, workspaceBaseFor } from '../../config/navigation';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';

export function Topbar({ user, collapsed, onToggleSidebar, onOpenMenu, portalLabel }: { user: User; collapsed: boolean; onToggleSidebar: () => void; onOpenMenu: () => void; portalLabel: string }) {
  const basePath = workspaceBaseFor(user);
  const [searchOpen, setSearchOpen] = useState(false);
  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/85">
      <div className="flex h-16 items-center gap-2 px-4 sm:gap-3 sm:px-6 lg:px-8">
        <Button variant="ghost" size="icon" className="md:hidden" onClick={onOpenMenu} aria-label="Open navigation menu" icon={Menu} />
        <Button variant="ghost" size="icon" className="hidden md:inline-flex" onClick={onToggleSidebar} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} aria-expanded={!collapsed} aria-controls="sidebar-nav" icon={collapsed ? PanelLeftOpen : PanelLeftClose} />
        <div className="flex min-w-0 flex-1 items-center md:flex-none">
          <a href={ROLE_HOME[user.role]} className="md:hidden" aria-label="CertiTrack home">
            <Logo compact />
          </a>
          <div className="hidden min-w-0 md:block">
            <p className="truncate text-sm font-semibold text-navy-900">{portalLabel}</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setSearchOpen(true)} aria-label="Search applications, certificates and applicants" icon={Search} />
        <div className="hidden min-w-0 md:block md:w-64 xl:w-80">
          <GlobalSearch user={user} />
        </div>
        <NotificationBell user={user} basePath={basePath} />
        <ProfileMenu user={user} basePath={basePath} />
      </div>
      <Modal open={searchOpen} onClose={() => setSearchOpen(false)} title="Search" description="Find by Application ID, certificate number or applicant name." size="md">
        <GlobalSearch user={user} autoFocus onSelect={() => setSearchOpen(false)} />
      </Modal>
    </header>
  );
}
