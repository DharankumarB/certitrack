import { Link, useNavigate } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { Popover } from '../ui/Popover';
import { Button } from '../ui/Button';
import { useAppState } from '../../hooks/useAppState';
import { useQuery } from '../../hooks/useQuery';
import { listNotifications, markAllRead, setNotificationsRead, unreadCountFor } from '../../services/notificationService';
import { formatRelative } from '../../utils/format';
import { cn } from '../../utils/cn';
import type { User } from '../../types';
import { useNow } from '../../hooks/useNow';

export function NotificationBell({ user, basePath }: { user: User; basePath: string }) {
  const notifications = useAppState((s) => s.notifications);
  const unread = unreadCountFor(user.id, notifications);
  const now = useNow(60_000);
  const navigate = useNavigate();
  return (
    <Popover
      label="Notifications"
      panelClassName="w-[min(92vw,380px)] p-0"
      trigger={({ onClick, id, open, 'aria-expanded': expanded, 'aria-haspopup': haspopup }) => (
        <button
          type="button"
          onClick={onClick}
          aria-controls={open ? id : undefined}
          aria-expanded={expanded}
          aria-haspopup={haspopup}
          aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}
          className="relative inline-flex size-10 items-center justify-center rounded-lg text-slate-700 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-navy-500"
        >
          <Bell className="size-5" aria-hidden="true" />
          {unread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex min-w-5 items-center justify-center rounded-full bg-red-700 px-1 text-[11px] font-bold leading-5 text-white ring-2 ring-white">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </button>
      )}
    >
      {(close) => <BellPanel user={user} basePath={basePath} onNavigate={(to) => { close(); navigate(to); }} now={now} />}
    </Popover>
  );
}

function BellPanel({ user, basePath, onNavigate, now }: { user: User; basePath: string; onNavigate: (to: string) => void; now: number }) {
  const { data, loading } = useQuery(() => listNotifications(user), [user.id]);
  const recent = (data ?? []).slice(0, 6);
  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
        <h2 className="text-sm font-semibold text-navy-900">Notifications</h2>
        <Button variant="link" size="sm" onClick={() => void markAllRead(user)} className="text-xs">
          Mark all read
        </Button>
      </div>
      <ul className="max-h-96 divide-y divide-slate-100 overflow-y-auto">
        {loading && <li className="px-4 py-6 text-center text-sm text-slate-500">Loading…</li>}
        {!loading && recent.length === 0 && <li className="px-4 py-6 text-center text-sm text-slate-500">No notifications yet.</li>}
        {recent.map((n) => (
          <li key={n.id}>
            <button
              type="button"
              onClick={() => {
                void setNotificationsRead(user, [n.id], true);
                onNavigate(n.applicationId ? `${basePath}/applications/${n.applicationId}` : `${basePath}/notifications`);
              }}
              className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-navy-500"
            >
              <span className={cn('mt-1.5 size-2 shrink-0 rounded-full', n.read ? 'bg-transparent' : 'bg-red-700')} aria-hidden="true" />
              <span className="min-w-0 flex-1">
                <span className={cn('block truncate text-sm', n.read ? 'font-medium text-slate-700' : 'font-semibold text-navy-900')}>
                  {n.read ? '' : <span className="sr-only">Unread: </span>}
                  {n.title}
                </span>
                <span className="mt-0.5 line-clamp-2 block text-xs text-slate-600">{n.body}</span>
                <span className="mt-1 block text-[11px] text-slate-500">{formatRelative(n.createdAt, now)}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
      <div className="border-t border-slate-100 p-2">
        <Link to={`${basePath}/notifications`} onClick={() => onNavigate(`${basePath}/notifications`)} className="block rounded-lg px-3 py-2 text-center text-sm font-semibold text-navy-800 hover:bg-navy-50 focus-visible:outline-2 focus-visible:outline-navy-500">
          View all notifications
        </Link>
      </div>
    </div>
  );
}
