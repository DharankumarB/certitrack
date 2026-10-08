import { Link } from 'react-router-dom';
import { Clock, Eye, FileClock, ListChecks, ScanSearch, TriangleAlert, BadgeCheck } from 'lucide-react';
import { useCurrentUser } from '../../context/AuthContext';
import { useQuery } from '../../hooks/useQuery';
import { usePageTitle } from '../../hooks/usePageTitle';
import { getOfficerDashboard } from '../../services/analyticsService';
import { PageHeader } from '../../components/layout/PageHeader';
import { StatCard } from '../../components/ui/StatCard';
import { ButtonLink } from '../../components/ui/Button';
import { ErrorState, LoadingBlock, EmptyState } from '../../components/ui/Feedback';
import { ChartCard, DonutChart } from '../../components/domain/Charts';
import { AIDisclaimer } from '../../components/domain/Notices';
import { ResponsiveList } from '../../components/ui/ResponsiveList';
import { ApplicationCard } from '../../components/domain/ApplicationCards';
import { ApplicationStatusBadge, PriorityBadge } from '../../components/domain/Status';
import { formatDate, formatDays, formatRelative, greeting, firstName } from '../../utils/format';
import { useAppState } from '../../hooks/useAppState';
import { derivePriority, groupDocumentsByApp } from '../../utils/applicationRules';
import { useNow } from '../../hooks/useNow';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { DEPARTMENT_NAME } from './shared';

export default function OfficerDashboardPage() {
  usePageTitle('Officer dashboard');
  const officer = useCurrentUser();
  const now = useNow(30_000);
  const { data, error, loading, reload } = useQuery(() => getOfficerDashboard(officer), [officer.id]);
  const docs = useAppState((s) => s.documents);
  const dept = DEPARTMENT_NAME(officer);
  const queue = data?.queue ?? [];
  const byApp = groupDocumentsByApp(docs);
  const priorityData = data
    ? [
        { name: 'High', value: data.priority.high },
        { name: 'Normal', value: data.priority.normal },
        { name: 'Low', value: data.priority.low },
      ]
    : [];

  return (
    <div className="space-y-8">
      <PageHeader
        title={`${greeting(now)}, ${firstName(officer.name)}`}
        description={`Your ${dept} queue. Only files from this department are shown.`}
        actions={<ButtonLink to="/officer/applications?status=in_review" icon={ListChecks}>Open pending review</ButtonLink>}
        id="officer-dash-title"
      />
      {error !== undefined && <ErrorState error={error} onRetry={reload} />}
      {loading && <LoadingBlock variant="cards" label="Loading your queue" />}
      {data && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <StatCard label="Pending" value={data.pending} icon={Clock} hint="Not yet opened" to="/officer/applications?status=in_review" />
            <StatCard label="Under review" value={data.underReview} icon={Eye} tone="sky" hint="Opened by an officer" />
            <StatCard label="Requires changes" value={data.changes} icon={TriangleAlert} tone="amber" to="/officer/applications?status=changes_requested" />
            <StatCard label="Approved" value={data.approved} icon={BadgeCheck} tone="green" hint="Approved or issued" />
            <StatCard label="Avg processing time" value={formatDays(data.avgDays)} icon={FileClock} tone="violet" hint="Closed files (demo)" />
          </div>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
            <section aria-labelledby="queue-title" className="min-w-0 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <h2 id="queue-title" className="text-lg font-semibold text-navy-900">Next in queue</h2>
                <Link to="/officer/applications" className="text-sm font-semibold text-navy-800 hover:underline focus-visible:outline-2 focus-visible:outline-navy-500">Full queue</Link>
              </div>
              {queue.length === 0 ? (
                <EmptyState icon={ListChecks} title="Your queue is clear" description="New applications from your department appear here after the AI pre-check." />
              ) : (
                <ResponsiveList
                  caption="Queue preview"
                  rows={queue.slice(0, 6)}
                  rowKey={(a) => a.id}
                  tableMinWidth="min-w-[640px]"
                  columns={[
                    { key: 'id', header: 'Application ID', cell: (a) => <Link to={`/officer/applications/${a.id}`} className="font-mono font-semibold text-navy-800 hover:underline focus-visible:outline-2 focus-visible:outline-navy-500">{a.id}</Link> },
                    { key: 'applicant', header: 'Applicant', cell: (a) => a.applicantName },
                    { key: 'due', header: 'Due', cell: (a) => <span className="whitespace-nowrap">{formatDate(a.expectedBy)}</span> },
                    { key: 'priority', header: 'Priority', cell: (a) => <PriorityBadge priority={derivePriority(a, byApp.get(a.id) ?? [], now)} /> },
                    { key: 'status', header: 'Status', cell: (a) => <ApplicationStatusBadge status={a.status} /> },
                    { key: 'action', header: <span className="sr-only">Action</span>, cell: (a) => <ButtonLink to={`/officer/applications/${a.id}`} size="sm" variant="secondary" icon={Eye}>Review</ButtonLink> },
                  ]}
                  card={(a) => <ApplicationCard app={a} to={`/officer/applications/${a.id}`} priority={derivePriority(a, byApp.get(a.id) ?? [], now)} />}
                />
              )}
            </section>
            <div className="min-w-0 space-y-6">
              <Card>
                <CardHeader title="AI flags" description="Documents with a possible duplicate, edit or name issue." />
                <CardBody className="space-y-4">
                  <p className="text-3xl font-bold text-navy-900">{data.aiFlagged}</p>
                  <AIDisclaimer />
                  <ButtonLink to="/officer/ai-verification" variant="secondary" icon={ScanSearch} size="sm">Review AI verification queue</ButtonLink>
                </CardBody>
              </Card>
              <ChartCard title="Queue by priority" description="Open files in your department" valueLabel="Applications" data={priorityData}>
                <DonutChart data={priorityData} valueLabel="Applications" />
              </ChartCard>
            </div>
          </div>
          <p className="text-xs text-slate-500">Last refreshed {formatRelative(new Date(now).toISOString(), now)}. Department analytics are labelled Demo Data.</p>
        </>
      )}
    </div>
  );
}

