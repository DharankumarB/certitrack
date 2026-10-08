import { useState } from 'react';
import { Activity, CircleX, Clock, Gauge, Users } from 'lucide-react';
import { useCurrentUser } from '../../context/AuthContext';
import { useQuery } from '../../hooks/useQuery';
import { usePageTitle } from '../../hooks/usePageTitle';
import { getAdminAnalytics } from '../../services/analyticsService';
import { PageHeader } from '../../components/layout/PageHeader';
import { StatCard } from '../../components/ui/StatCard';
import { Segmented } from '../../components/ui/Tabs';
import { ErrorState, LoadingBlock, Alert } from '../../components/ui/Feedback';
import { ChartCard, BarsChart, DonutChart, TrendChart } from '../../components/domain/Charts';
import { IntegrationBadge } from '../../components/ui/IntegrationBadge';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { formatDays, formatHours, formatPercent } from '../../utils/format';
import type { RangeDays } from '../../utils/analytics';
import { Table } from '../../components/ui/Table';

export default function AdminAnalyticsPage() {
  usePageTitle('Analytics');
  const admin = useCurrentUser();
  const [range, setRange] = useState<RangeDays>(30);
  const { data, error, loading, reload } = useQuery(() => getAdminAnalytics(admin, range), [admin.id, range]);
  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics"
        description="Trends, decisions and bottlenecks across departments. Every value on this page is demo data."
        actions={
          <>
            <IntegrationBadge kind="demo-data" />
            <Segmented label="Date range" value={String(range) as '7' | '30' | '90'} onChange={(v) => setRange(Number(v) as RangeDays)} options={[{ value: '7', label: 'Last 7 days' }, { value: '30', label: 'Last 30 days' }, { value: '90', label: 'Last 90 days' }]} />
          </>
        }
        id="admin-analytics-title"
      />
      <Alert tone="info">Demo Data. These values are generated for the prototype and are not official statistics.</Alert>
      {error !== undefined && <ErrorState error={error} onRetry={reload} />}
      {loading && <LoadingBlock variant="cards" label="Calculating analytics" />}
      {data && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5 grid-cols-1">
            <StatCard label="Submitted" value={data.submitted} icon={Users} hint={`Last ${range} days`} />
            <StatCard label="Approval rate" value={formatPercent(data.approvalRate ?? NaN)} icon={Gauge} tone="green" hint="Of decided files" />
            <StatCard label="Rejection rate" value={formatPercent(data.rejectionRate ?? NaN)} icon={CircleX} tone="red" />
            <StatCard label="Avg processing time" value={formatDays(data.avgDays)} icon={Clock} tone="violet" />
            <StatCard label="AI flag rate" value={formatPercent(data.aiFlagRate ?? NaN)} icon={Activity} tone="amber" hint="Files with a warning" />
          </div>
          <div className="grid gap-6 xl:grid-cols-2 grid-cols-1">
            <ChartCard title="Submissions per day" description="Applications received" valueLabel="Applications" data={data.submissionsByDay} className="xl:col-span-2">
              <TrendChart data={data.submissionsByDay} valueLabel="Applications" />
            </ChartCard>
            <ChartCard title="Applications by type" valueLabel="Applications" data={data.byType}>
              <DonutChart data={data.byType} valueLabel="Applications" />
            </ChartCard>
            <ChartCard title="Processing time by department" description="Average days to outcome" valueLabel="Average days" data={data.processingByDepartment}>
              <BarsChart data={data.processingByDepartment} valueLabel="Average days" unit=" d" />
            </ChartCard>
            <ChartCard title="Status mix" valueLabel="Applications" data={data.byStatus}>
              <BarsChart data={data.byStatus} valueLabel="Applications" horizontal />
            </ChartCard>
            <ChartCard title="Bottleneck stages" description="Average hours in each stage" valueLabel="Average hours" data={data.bottlenecks.map((b) => ({ name: b.stage, value: Math.round(b.avgHours ?? 0) }))}>
              <BarsChart horizontal data={data.bottlenecks.map((b) => ({ name: b.stage, value: Math.round(b.avgHours ?? 0) }))} valueLabel="Average hours" unit=" h" />
            </ChartCard>
          </div>
          <Card>
            <CardHeader title="Department comparison" description="Demo data, current snapshot." />
            <CardBody>
              <Table caption="Department comparison" headers={['Department', 'Total', 'Pending', 'Needs changes', 'Approved', 'Rejected', 'Avg time', 'Overdue']}
                rows={data.departments.map((d) => [d.department.name, d.total, d.pending, d.changes, d.approved, d.rejected, formatHours(d.avgHours), d.overdue])} />
            </CardBody>
          </Card>
        </>
      )}
    </div>
  );
}
