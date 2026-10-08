import { Activity, Database, Server, ShieldCheck, Truck } from 'lucide-react';
import { useCurrentUser } from '../../context/AuthContext';
import { useQuery } from '../../hooks/useQuery';
import { usePageTitle } from '../../hooks/usePageTitle';
import { useNow } from '../../hooks/useNow';
import { getSystemActivity } from '../../services/systemService';
import { PageHeader } from '../../components/layout/PageHeader';
import { StatCard } from '../../components/ui/StatCard';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { ErrorState, LoadingBlock, Alert } from '../../components/ui/Feedback';
import { IntegrationBadge } from '../../components/ui/IntegrationBadge';
import { DeliveryStatusBadge } from '../../components/domain/Status';
import { NotificationList } from '../../components/domain/Notifications';
import { auditActionLabel } from '../../config/audit';
import { formatDateTime, formatRelative } from '../../utils/format';
import { AI_ENGINE_ID, AI_CHECK_ORDER, AI_CHECK_LABELS } from '../../services/aiEngine';
import { AI_STAGES } from '../../services/documentService';
import { Badge } from '../../components/ui/Badge';
import { Table } from '../../components/ui/Table';

export default function SystemActivityPage() {
  usePageTitle('System activity');
  const admin = useCurrentUser();
  const now = useNow(20_000);
  const { data, error, loading, reload } = useQuery(() => getSystemActivity(admin), [admin.id]);
  return (
    <div className="space-y-8">
      <PageHeader title="System activity" description="Live counts, simulated services in progress, system alerts and the latest audit entries." actions={<IntegrationBadge kind="simulated" />} id="system-title" />
      {error !== undefined && <ErrorState error={error} onRetry={reload} />}
      {loading && <LoadingBlock variant="cards" label="Checking system activity" />}
      {data && (
        <>
          {!data.storage.persistent && <Alert tone="warning" title="Changes are kept in this tab only">{data.storage.notice ?? 'Browser storage is unavailable.'}</Alert>}
          {data.storage.notice && data.storage.persistent && <Alert tone="info">{data.storage.notice}</Alert>}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <StatCard label="Applications" value={data.counts.applications} icon={Database} hint="In the local dataset" />
            <StatCard label="Documents" value={data.counts.documents} icon={Server} tone="sky" />
            <StatCard label="Certificates" value={data.counts.certificates} icon={ShieldCheck} tone="green" />
            <StatCard label="e-Sign queue" value={data.esignPending} icon={Activity} tone="amber" hint="Awaiting simulated signature" />
            <StatCard label="Courier in progress" value={data.deliveriesInProgress.length} icon={Truck} tone="violet" />
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <Card>
              <CardHeader title="Simulated services" description="Behaviour the prototype runs in the browser." />
              <CardBody>
                <ul className="space-y-4 text-sm">
                  <li className="flex items-start gap-3"><Badge tone="violet">Simulated</Badge><span>AI pre-verification engine <span className="font-mono text-xs">{AI_ENGINE_ID}</span>: nine checks per document, deterministic results, advisory only.</span></li>
                  <li className="flex items-start gap-3"><Badge tone="violet">Simulated</Badge><span>e-Sign: queued approvals are signed automatically after a short delay.</span></li>
                  <li className="flex items-start gap-3"><Badge tone="violet">Simulated</Badge><span>Courier: dispatch to delivery steps advance on a timer.</span></li>
                  <li className="flex items-start gap-3"><Badge tone="warning">Production integration required</Badge><span>DigiLocker-style record linking, WhatsApp Business API, e-mail delivery, OCR and e-sign providers.</span></li>
                </ul>
                <p className="mt-4 text-xs text-slate-500">Seeded {formatDateTime(data.seededAt)} · AI stages: {AI_STAGES.join(' → ')}</p>
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Deliveries in progress" />
              <CardBody>
                {data.deliveriesInProgress.length === 0 ? (
                  <p className="text-sm text-slate-600">No courier shipments in progress.</p>
                ) : (
                  <Table caption="Deliveries in progress" headers={['Tracking ID', 'Application', 'Status', 'Location', 'Next update']} rows={data.deliveriesInProgress.map((d) => [<span key="t" className="font-mono text-xs">{d.trackingId}</span>, d.applicationId, <DeliveryStatusBadge key="s" status={d.status} />, d.currentLocation, d.nextStepAt ? formatRelative(d.nextStepAt, now) : '—'])} />
                )}
              </CardBody>
            </Card>
          </div>

          <Card>
            <CardHeader title="AI check catalogue" description="The nine checks that run on every uploaded document." />
            <CardBody>
              <ul className="grid gap-2 sm:grid-cols-3">
                {AI_CHECK_ORDER.map((k) => (
                  <li key={k} className="rounded-lg bg-slate-50 px-3 py-2 text-sm font-medium text-slate-800">{AI_CHECK_LABELS[k]}</li>
                ))}
              </ul>
            </CardBody>
          </Card>

          <section aria-labelledby="sys-alerts" className="space-y-3">
            <h2 id="sys-alerts" className="text-lg font-semibold text-navy-900">System alerts</h2>
            {data.systemNotifications.length === 0 ? <p className="text-sm text-slate-600">No alerts.</p> : <NotificationList items={data.systemNotifications} basePath="/admin" onToggle={() => undefined} />}
          </section>

          <Card>
            <CardHeader title="Latest audit entries" actions={<a href="/admin/audit-logs" className="text-sm font-semibold text-navy-800 hover:underline">Open audit logs</a>} />
            <CardBody>
              <ul className="divide-y divide-slate-100">
                {data.auditLogs.slice(0, 12).map((l) => (
                  <li key={l.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                    <span className="min-w-0"><span className="font-medium text-slate-900">{auditActionLabel(l.action)}</span> <span className="text-slate-600">· {l.actorName}</span></span>
                    <span className="whitespace-nowrap text-xs text-slate-500">{formatRelative(l.at, now)}</span>
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>
        </>
      )}
    </div>
  );
}
