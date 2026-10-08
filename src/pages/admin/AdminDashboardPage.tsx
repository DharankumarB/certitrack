import { Link } from 'react-router-dom';
import { Activity, BadgeCheck, CalendarClock, CircleX, FolderOpen, Hourglass } from 'lucide-react';
import { useCurrentUser } from '../../context/AuthContext';
import { useQuery } from '../../hooks/useQuery';
import { usePageTitle } from '../../hooks/usePageTitle';
import { getAdminDashboard } from '../../services/analyticsService';
import { PageHeader } from '../../components/layout/PageHeader';
import { StatCard } from '../../components/ui/StatCard';
import { ErrorState, LoadingBlock } from '../../components/ui/Feedback';
import { ChartCard, BarsChart, DonutChart } from '../../components/domain/Charts';
import { IntegrationBadge } from '../../components/ui/IntegrationBadge';
import { ButtonLink } from '../../components/ui/Button';
import { formatDays } from '../../utils/format';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { ProgressBar } from '../../components/ui/Badge';
import { formatHours } from '../../utils/format';

export default function AdminDashboardPage() {
  usePageTitle('Admin dashboard');
  const admin = useCurrentUser();
  const { data, error, loading, reload } = useQuery(() => getAdminDashboard(admin), [admin.id]);
  return (
    <div className="space-y-8">
      <PageHeader
        title="Portfolio dashboard"
        description="All departments in one view: volumes, decisions, processing times and where files wait."
        actions={
          <>
            <IntegrationBadge kind="demo-data" />
            <ButtonLink to="/admin/analytics" variant="secondary">Analytics</ButtonLink>
          </>
        }
        id="admin-dash-title"
      />
      {error !== undefined && <ErrorState error={error} onRetry={reload} />}
      {loading && <LoadingBlock variant="cards" label="Loading portfolio" />}
      {data && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
            <StatCard label="Total applications" value={data.kpis.total} icon={FolderOpen} to="/admin/applications" hint="All time (demo)" />
            <StatCard label="Pending" value={data.kpis.pending} icon={Hourglass} tone="amber" hint="Open in departments" />
            <StatCard label="Approved" value={data.kpis.approved} icon={BadgeCheck} tone="green" hint="Approved, issued or delivered" />
            <StatCard label="Rejected" value={data.kpis.rejected} icon={CircleX} tone="red" />
            <StatCard label="Avg processing time" value={formatDays(data.kpis.avgDays)} icon={Activity} tone="violet" hint="Submission to outcome" />
            <StatCard label="Applications today" value={data.kpis.today} icon={CalendarClock} tone="sky" />
          </div>
          <div className="grid gap-6 xl:grid-cols-2">
            <ChartCard title="Applications by certificate type" description="Volume per certificate" valueLabel="Applications" data={data.byType}>
              <DonutChart data={data.byType} valueLabel="Applications" />
            </ChartCard>
            <ChartCard title="Applications by department" description="Share of work per department" valueLabel="Applications" data={data.byDepartment}>
              <BarsChart data={data.byDepartment} valueLabel="Applications" />
            </ChartCard>
            <ChartCard title="Processing time by department" description="Average days from submission to outcome" valueLabel="Average days" data={data.processingByDepartment} >
              <BarsChart data={data.processingByDepartment} valueLabel="Average days" unit=" d" />
            </ChartCard>
            <ChartCard title="Applications by status" description="Where every file stands" valueLabel="Applications" data={data.byStatus}>
              <BarsChart data={data.byStatus} valueLabel="Applications" horizontal />
            </ChartCard>
          </div>
          <ChartCard title="Bottleneck stages" description="Average hours per stage and files waiting now" valueLabel="Average hours" data={data.bottlenecks.map((b) => ({ name: b.stage, value: Math.round(b.avgHours ?? 0) }))}>
            <BarsChart horizontal data={data.bottlenecks.map((b) => ({ name: b.stage, value: Math.round(b.avgHours ?? 0) }))} valueLabel="Average hours" unit=" h" />
            <ul className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              {data.bottlenecks.map((b) => (
                <li key={b.stage} className="rounded-lg bg-slate-50 p-3 text-sm">
                  <p className="font-semibold text-navy-900">{b.stage}</p>
                  <p className="text-xs text-slate-600">Avg {formatHours(b.avgHours)} · waiting {b.waiting}</p>
                  <ProgressBar value={Math.min(100, (b.waiting / Math.max(1, data.kpis.pending)) * 100)} label={`${b.stage} share of pending files`} />
                </li>
              ))}
            </ul>
          </ChartCard>
          <Card>
            <CardHeader title="Department health" description="Open items, overdue files and AI flags." actions={<Link to="/admin/departments" className="text-sm font-semibold text-navy-800 hover:underline">All departments</Link>} />
            <CardBody>
              <ul className="grid gap-4 md:grid-cols-3">
                {data.departments.map((d) => (
                  <li key={d.department.id} className="rounded-xl border border-slate-200 p-4">
                    <p className="font-semibold text-navy-900">{d.department.name}</p>
                    <p className="mt-2 text-sm text-slate-600">Pending {d.pending} · Changes {d.changes} · Overdue <span className={d.overdue ? 'font-semibold text-red-800' : ''}>{d.overdue}</span></p>
                    <p className="text-xs text-slate-500">AI flags {d.aiFlags} · Avg {formatDays(d.avgHours === null ? null : d.avgHours / 24)}</p>
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
