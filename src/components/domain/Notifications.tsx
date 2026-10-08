import { BadgeCheck, Bell, CircleAlert, FileCheck2, Mail, MessageCircle, ShieldAlert, Smartphone, Truck, UserCog } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { AppNotification, NotificationChannel, NotificationKind } from '../../types';
import { formatRelative } from '../../utils/format';
import { cn } from '../../utils/cn';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { useNow } from '../../hooks/useNow';

const KIND_ICON: Record<NotificationKind, typeof Bell> = {
  application: FileCheck2,
  changes: CircleAlert,
  approval: BadgeCheck,
  rejection: ShieldAlert,
  certificate: BadgeCheck,
  delivery: Truck,
  officer: UserCog,
  system: Bell,
  security: ShieldAlert,
};

const CHANNEL_META: Record<NotificationChannel, { label: string; icon: typeof Bell }> = {
  in_app: { label: 'In-app', icon: Bell },
  whatsapp: { label: 'WhatsApp (preview)', icon: MessageCircle },
  email: { label: 'Email (preview)', icon: Mail },
};

export function ChannelChips({ channels }: { channels: NotificationChannel[] }) {
  return (
    <ul className="flex flex-wrap gap-1.5" aria-label="Delivery channels">
      {channels.map((c) => {
        const meta = CHANNEL_META[c];
        const Icon = meta.icon;
        return (
          <li key={c}>
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
              <Icon className="size-3" aria-hidden="true" />
              {meta.label}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

export function NotificationList({ items, onToggle, onOpenLink, basePath }: { items: AppNotification[]; onToggle: (n: AppNotification) => void; onOpenLink?: (n: AppNotification) => void; basePath: string }) {
  const now = useNow(60_000);
  return (
    <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white" aria-label="Notifications">
      {items.map((n) => {
        const Icon = KIND_ICON[n.kind] ?? Bell;
        const toneCls = n.tone === 'danger' ? 'bg-red-50 text-red-800' : n.tone === 'warning' ? 'bg-amber-50 text-amber-800' : n.tone === 'success' ? 'bg-gov-50 text-gov-700' : 'bg-navy-50 text-navy-800';
        return (
          <li key={n.id} className={cn('flex gap-4 p-4 sm:p-5', !n.read && 'bg-navy-50/40')}>
            <span className={cn('mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-full', toneCls)} aria-hidden="true">
              <Icon className="size-5" />
            </span>
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                {!n.read && <Badge tone="danger">Unread</Badge>}
                <h3 className="text-sm font-semibold text-navy-900">{n.title}</h3>
                <span className="text-xs text-slate-500">· {formatRelative(n.createdAt, now)}</span>
              </div>
              <p className="text-sm leading-relaxed text-slate-700">{n.body}</p>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <ChannelChips channels={n.channels} />
                <div className="flex flex-wrap gap-1">
                  {n.applicationId && (
                    <Link
                      to={`${basePath}/applications/${n.applicationId}`}
                      onClick={() => onOpenLink?.(n)}
                      className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-navy-800 hover:bg-navy-50 focus-visible:outline-2 focus-visible:outline-navy-500"
                    >
                      Open {n.applicationId}
                    </Link>
                  )}
                  <Button variant="ghost" size="sm" onClick={() => onToggle(n)} aria-label={`${n.read ? 'Mark as unread' : 'Mark as read'}: ${n.title}`}>
                    {n.read ? 'Mark unread' : 'Mark read'}
                  </Button>
                </div>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/** A WhatsApp-style preview. It is never sent, and the label says so. */
export function WhatsAppPreview({ message, title }: { message: string; title: string }) {
  return (
    <div className="mx-auto w-full max-w-sm overflow-hidden rounded-[2rem] border-[10px] border-navy-950 bg-[#e5ddd5] shadow-xl" role="img" aria-label={`WhatsApp preview: ${message}`}>
      <div className="flex items-center gap-3 bg-[#075e54] px-4 py-3 text-white">
        <span className="flex size-9 items-center justify-center rounded-full bg-white/20">
          <Smartphone className="size-4" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">CertiTrack Updates</p>
          <p className="text-[11px] text-white/80">Business account · preview</p>
        </div>
      </div>
      <div className="space-y-3 p-4">
        <p className="w-fit rounded-lg bg-white px-3 py-2 text-[11px] text-slate-500">Today</p>
        <div className="ml-auto max-w-[90%] rounded-lg rounded-tr-none bg-[#dcf8c6] p-3 text-sm text-slate-900 shadow-sm">
          <p className="mb-1 text-xs font-semibold text-[#075e54]">{title}</p>
          <p className="leading-relaxed">{message}</p>
          <p className="mt-1 text-right text-[10px] text-slate-500">preview</p>
        </div>
      </div>
      <p className="flex items-center justify-center gap-1.5 bg-white/90 px-3 py-2 text-center text-[11px] font-semibold text-amber-900">
        WhatsApp integration preview · not sent
      </p>
    </div>
  );
}

