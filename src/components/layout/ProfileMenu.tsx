import { Link, useNavigate } from 'react-router-dom';
import { CircleHelp, LogOut, UserRound } from 'lucide-react';
import { Popover } from '../ui/Popover';
import { Avatar } from './Avatar';
import { useAuth } from '../../context/AuthContext';
import { ROLE_LABEL } from '../../config/navigation';
import type { User } from '../../types';

export function ProfileMenu({ user, basePath }: { user: User; basePath: string }) {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const subtitle = user.role === 'officer' ? `${ROLE_LABEL.officer} · ${user.departmentId === 'caste' ? 'Caste' : user.departmentId === 'income' ? 'Income' : 'Domicile'}` : ROLE_LABEL[user.role];
  return (
    <Popover
      label="Account menu"
      panelClassName="w-64"
      trigger={({ onClick, id, open, 'aria-expanded': expanded, 'aria-haspopup': haspopup }) => (
        <button
          type="button"
          onClick={onClick}
          aria-controls={open ? id : undefined}
          aria-expanded={expanded}
          aria-haspopup={haspopup}
          aria-label={`Account menu for ${user.name}`}
          className="flex items-center gap-2 rounded-lg p-1 pr-2 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-navy-500"
        >
          <Avatar name={user.name} size="sm" />
          <span className="hidden min-w-0 text-left md:block">
            <span className="block max-w-[10rem] truncate text-sm font-semibold text-navy-900">{user.name}</span>
            <span className="block text-xs text-slate-500">{subtitle}</span>
          </span>
        </button>
      )}
    >
      {(close) => (
        <div className="flex flex-col">
          <div className="border-b border-slate-100 px-3 py-3">
            <p className="truncate text-sm font-semibold text-navy-900">{user.name}</p>
            <p className="truncate text-xs text-slate-500">{user.email}</p>
          </div>
          <div className="py-1">
            <MenuLink to={`${basePath}/profile`} onClick={close} icon={UserRound} label="Profile and settings" />
            <MenuLink to="/help" onClick={close} icon={CircleHelp} label="Help and FAQs" />
          </div>
          <div className="border-t border-slate-100 pt-1">
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                close();
                void signOut().then(() => navigate('/login', { replace: true }));
              }}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-red-800 hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-navy-500"
            >
              <LogOut className="size-4" aria-hidden="true" />
              Sign out
            </button>
          </div>
        </div>
      )}
    </Popover>
  );
}

function MenuLink({ to, onClick, icon: Icon, label }: { to: string; onClick: () => void; icon: typeof UserRound; label: string }) {
  return (
    <Link to={to} onClick={onClick} className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-800 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-navy-500">
      <Icon className="size-4 text-slate-500" aria-hidden="true" />
      {label}
    </Link>
  );
}
