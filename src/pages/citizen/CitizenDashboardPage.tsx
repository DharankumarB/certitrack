import { Link } from 'react-router-dom';
import { ArrowRight, Bell, FilePlus2, FolderOpen, Lock, Route, TriangleAlert, ShieldCheck } from 'lucide-react';
import { useCurrentUser } from '../../context/AuthContext';
import { useQuery } from '../../hooks/useQuery';
import { useAppState } from '../../hooks/useAppState';
import { usePageTitle } from '../../hooks/usePageTitle';
import { useNow } from '../../hooks/useNow';
import { getCitizenDashboard } from '../../services/analyticsService';
import { unreadCountFor } from '../../services/notificationService';
import { PageHeader } from '../../components/layout/PageHeader';
import { StatCard } from '../../components/ui/StatCard';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { ButtonLink } from '../../components/ui/Button';
import { Alert, EmptyState, ErrorState, LoadingBlock } from '../../components/ui/Feedback';
import { ApplicationCard, certLabel } from '../../components/domain/ApplicationCards';
import { StageProgress } from '../../components/domain/Timeline';
import { computeSteps, currentStage, nextStepText } from '../../utils/stages';
import { formatDate, formatRelative, greeting, firstName } from '../../utils/format';
import { ApplicationStatusBadge, DeliveryStatusBadge } from '../../components/domain/Status';
import { ResponsiveList } from '../../components/ui/ResponsiveList';
import { Badge } from '../../components/ui/Badge';
import { CERTIFICATE_TYPES } from '../../config/certificateTypes';

export default function CitizenDashboardPage() {
  usePageTitle('Dashboard');
  const user = useCurrentUser();
  const { data, error, loading, reload } = useQuery(() => getCitizenDashboard(user), [user.id]);
  const notifications = useAppState((s) => s.notifications);
  const unread = unreadCountFor(user.id, notifications);
  const now = useNow(30_000);
  const latest = data?.latest ?? null;

  return (
    <div className="space-y-8">
      <PageHeader title={`${greeting(now)}, ${firstName(user.name)}`} description="Here is where your certificates stand today." id="dash-title" actions={<ButtonLink to="/citizen/apply" icon={FilePlus2}>Apply for a certificate</ButtonLink>} />
      {error !== undefined && <ErrorState error={error} onRetry={reload} />}
      {loading && <LoadingBlock variant="cards" label="Loading your dashboard" />}
      {data && (
        <>
          {data.changesCount > 0 && (
            <Alert tone="warning" title={`${data.changesCount === 1 ? 'One application needs' : `${data.changesCount} applications need`} your action`} action={<ButtonLink to="/citizen/applications?status=changes_requested" size="sm" variant="secondary">Review</ButtonLink>}>
              A document was flagged. Upload the corrected file and your application returns to the officer queue automatically.
            </Alert>
          )}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Active applications" value={data.activeCount} icon={FolderOpen} to="/citizen/applications" hint="Open or in progress" />
            <StatCard label="Needs your action" value={data.changesCount} icon={TriangleAlert} tone="amber" to="/citizen/applications?status=changes_requested" hint="Documents to correct" />
            <StatCard label="Certificates in locker" value={data.certificateCount} icon={Lock} tone="green" to="/citizen/locker" hint="View, download, share" />
            <StatCard label="Unread notifications" value={unread} icon={Bell} tone="sky" to="/citizen/notifications" hint="In-app updates" />
          </div>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
            <Card className="min-w-0">
              <CardHeader title="Live status" description="Your most recent active application." actions={latest && <Badge tone="success">Live</Badge>} />
              <CardBody>
                {latest ? (
                  <LiveStatus appId={latest.id} />
                ) : (
                  <EmptyState icon={FilePlus2} title="No active applications" description="Apply for a certificate to see live status here." action={<ButtonLink to="/citizen/apply">Start an application</ButtonLink>} />
                )}
              </CardBody>
            </Card>
            <Card className="min-w-0">
              <CardHeader title="Quick actions" />
              <CardBody className="grid gap-3">
                <ButtonLink to="/citizen/apply" icon={FilePlus2} variant="secondary" className="justify-start">Apply for a certificate</ButtonLink>
                <ButtonLink to="/citizen/track" icon={Route} variant="secondary" className="justify-start">Track an application</ButtonLink>
                <ButtonLink to="/citizen/locker" icon={ShieldCheck} variant="secondary" className="justify-start">Open Certificate Locker</ButtonLink>
                <ButtonLink to="/citizen/notifications" icon={Bell} variant="secondary" className="justify-start">Notifications</ButtonLink>
              </CardBody>
            </Card>
          </div>

          <section aria-labelledby="recent-title" className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h2 id="recent-title" className="text-lg font-semibold text-navy-900">Recent applications</h2>
              <Link to="/citizen/applications" className="inline-flex items-center gap-1 text-sm font-semibold text-navy-800 hover:underline focus-visible:outline-2 focus-visible:outline-navy-500">
                View all <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </div>
            {data.recent.length === 0 ? (
              <EmptyState icon={FolderOpen} title="No applications yet" description="Your applications will appear here once you submit one." action={<ButtonLink to="/citizen/apply">Apply now</ButtonLink>} />
            ) : (
              <ResponsiveList
                caption="Recent applications"
                rows={data.recent}
                rowKey={(a) => a.id}
                tableMinWidth="min-w-[640px]"
                columns={[
                  { key: 'id', header: 'Application ID', cell: (a) => <Link to={`/citizen/applications/${a.id}`} className="font-mono font-semibold text-navy-800 hover:underline focus-visible:outline-2 focus-visible:outline-navy-500">{a.id}</Link> },
                  { key: 'cert', header: 'Certificate', cell: (a) => certLabel(a) },
                  { key: 'submitted', header: 'Submitted', cell: (a) => formatDate(a.submittedAt) },
                  { key: 'status', header: 'Status', cell: (a) => <ApplicationStatusBadge status={a.status} /> },
                ]}
                card={(a) => <ApplicationCard app={a} to={`/citizen/applications/${a.id}`} />}
              />
            )}
          </section>
        </>
      )}
    </div>
  );
}

function LiveStatus({ appId }: { appId: string }) {
  const app = useAppState((s) => s.applications.find((a) => a.id === appId));
  const delivery = useAppState((s) => s.deliveries.find((d) => d.applicationId === appId) ?? null);
  const dept = useAppState((s) => s.departments.find((d) => app && d.id === app.departmentId));
  const now = useNow(15_000);
  if (!app) return null;
  const steps = computeSteps(app, delivery);
  const stage = currentStage(steps);
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-xs font-semibold text-navy-700">{app.id}</p>
          <h3 className="text-base font-semibold text-navy-900">{CERTIFICATE_TYPES[app.certificateType].label}</h3>
          <p className="text-sm text-slate-600">
            You are at <span className="font-semibold text-slate-900">{stage.label}</span> · {dept?.name}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <ApplicationStatusBadge status={app.status} />
          <span className="text-xs text-slate-500">Updated {formatRelative(app.updatedAt, now)}</span>
        </div>
      </div>
      <StageProgress steps={steps} />
      <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700">{nextStepText(app, delivery, dept?.name ?? 'Department')}</p>
      {delivery && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 p-3 text-sm">
          <span className="font-medium text-slate-800">Courier · {delivery.trackingId}</span>
          <DeliveryStatusBadge status={delivery.status} />
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <ButtonLink to={`/citizen/applications/${app.id}`} variant="secondary" size="sm">View timeline</ButtonLink>
        <ButtonLink to={`/citizen/track?app=${app.id}`} variant="secondary" size="sm" icon={Route}>Where is my file?</ButtonLink>
      </div>
    </div>
  );
}

