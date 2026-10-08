import { useMemo, useState } from 'react';
import { BellOff, CheckCheck, Filter, MessageCircle } from 'lucide-react';
import { useCurrentUser } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useQuery } from '../../hooks/useQuery';
import { usePageTitle } from '../../hooks/usePageTitle';
import { listNotifications, markAllRead, setNotificationsRead } from '../../services/notificationService';
import { PageHeader } from '../../components/layout/PageHeader';
import { Segmented } from '../../components/ui/Tabs';
import { Button } from '../../components/ui/Button';
import { EmptyState, ErrorState, LoadingBlock, Alert } from '../../components/ui/Feedback';
import { Card, CardBody } from '../../components/ui/Card';
import { NotificationList, WhatsAppPreview } from '../../components/domain/Notifications';
import { IntegrationBadge } from '../../components/ui/IntegrationBadge';
import type { AppNotification, NotificationChannel } from '../../types';

export default function NotificationsPage() {
  usePageTitle('Notifications');
  const user = useCurrentUser();
  const { toast } = useToast();
  const { data, error, loading, reload } = useQuery(() => listNotifications(user), [user.id]);
  const [readFilter, setReadFilter] = useState<'all' | 'unread'>('all');
  const [channel, setChannel] = useState<'all' | NotificationChannel>('all');
  const [busy, setBusy] = useState(false);
  const basePath = `/${user.role}`;

  const unread = (data ?? []).filter((n) => !n.read).length;
  const items = useMemo(
    () => (data ?? []).filter((n) => (readFilter === 'all' || !n.read) && (channel === 'all' || n.channels.includes(channel))),
    [data, readFilter, channel],
  );
  const whatsapp = (data ?? []).find((n) => n.channels.includes('whatsapp'));

  const toggle = async (n: AppNotification) => {
    await setNotificationsRead(user, [n.id], !n.read);
  };
  const markAll = async () => {
    setBusy(true);
    try {
      await markAllRead(user);
      toast({ title: 'All notifications marked as read' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        description={user.role === 'citizen' ? 'Updates about your applications and certificates, in-app and by your chosen channels.' : 'Alerts for your queue and account. Filter by read state or channel.'}
        actions={
          <Button variant="secondary" icon={CheckCheck} onClick={() => void markAll()} disabled={unread === 0} loading={busy}>
            Mark all read
          </Button>
        }
        id="notif-title"
      />
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <Segmented
          label="Read state"
          value={readFilter}
          onChange={setReadFilter}
          options={[
            { value: 'all', label: 'All', count: data?.length ?? 0 },
            { value: 'unread', label: 'Unread', count: unread },
          ]}
        />
        <div className="flex flex-wrap items-center gap-2">
          <Filter className="size-4 text-slate-500" aria-hidden="true" />
          <Segmented
            label="Channel"
            value={channel}
            onChange={setChannel}
            options={[
              { value: 'all', label: 'Any channel' },
              { value: 'in_app', label: 'In-app' },
              { value: 'whatsapp', label: 'WhatsApp' },
              { value: 'email', label: 'Email' },
            ]}
          />
        </div>
      </div>
      {error !== undefined && <ErrorState error={error} onRetry={reload} />}
      {loading && <LoadingBlock variant="list" label="Loading notifications" />}
      <div className={user.role === 'citizen' ? 'grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]' : ''}>
        <div className="min-w-0">
          {data && items.length === 0 && (
            <EmptyState icon={BellOff} title={readFilter === 'unread' ? 'You are all caught up' : 'No notifications here'} description="New updates appear here as your applications move forward." />
          )}
          {items.length > 0 && <NotificationList items={items} basePath={basePath} onToggle={(n) => void toggle(n)} />}
        </div>
        {user.role === 'citizen' && (
          <aside aria-label="WhatsApp preview" className="space-y-4">
            <Card>
              <CardBody className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <MessageCircle className="size-4 text-navy-700" aria-hidden="true" />
                  <h2 className="text-sm font-semibold text-navy-900">WhatsApp integration preview</h2>
                </div>
                <IntegrationBadge kind="production" />
                {whatsapp ? (
                  <WhatsAppPreview title={whatsapp.title} message={whatsapp.body} />
                ) : (
                  <p className="text-sm text-slate-600">No WhatsApp-channel updates yet.</p>
                )}
                <Alert tone="info" title="Nothing is sent">
                  This prototype shows how the message would look. No WhatsApp message is delivered to any phone.
                </Alert>
              </CardBody>
            </Card>
          </aside>
        )}
      </div>
    </div>
  );
}
