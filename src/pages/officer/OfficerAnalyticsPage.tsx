import { useState } from 'react';
import { BarChart3, Clock, Gauge, ShieldAlert, Users, Activity } from 'lucide-react';
import { useCurrentUser } from '../../context/AuthContext';
import { useQuery } from '../../hooks/useQuery';
import { usePageTitle } from '../../hooks/usePageTitle';
import { getOfficerAnalytics } from '../../services/analyticsService';
import { PageHeader } from '../../components/layout/PageHeader';
import { StatCard } from '../../components/ui/StatCard';
import { Segmented } from '../../components/ui/Tabs';
import { ErrorState, LoadingBlock, Alert } from '../../components/ui/Feedback';
import { ChartCard, BarsChart, DonutChart, TrendChart } from '../../components/domain/Charts';
import { IntegrationBadge } from '../../components/ui/IntegrationBadge';
import { formatDays, formatPercent } from '../../utils/format';
import { DEPARTMENT_NAME } from './shared';
import type { RangeDays } from '../../utils/analytics';

export default function OfficerAnalyticsPage() {
  usePageTitle('Department analytics');
  const officer = useCurrentUser();
  const [range, setRange] = useState<RangeDays>(30);
  const { data, error, loading, reload } = useQuery(() => getOfficerAnalytics(officer, range), [officer.id, range]);
  const dept = DEPARTMENT_NAME(officer);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Department analytics"
        description={`Performance for the ${dept} department. Values are labelled as demo data in this prototype.`}
        actions={
          <>
            <IntegrationBadge kind="demo-data" />
            <Segmented label="Date range" value={String(range) as '7' | '30' | '90'} onChange={(v) => setRange(Number(v) as RangeDays)} options={[{ value: '7', label: 'Last 7 days' }, { value: '30', label: 'Last 30 days' }, { value: '90', label: 'Last 90 days' }]} />
          </>
        }
        id="analytics-title"
      />
      {error !== undefined && <ErrorState error={error} onRetry={reload} />}
      {loading && <LoadingBlock variant="cards" label="Calculating analytics" />}
      {data && (
        <>
          <Alert tone="info">Demo Data. Figures are generated from the prototype dataset and do not represent official statistics.</Alert>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5 grid-cols-1">
            <StatCard label="Submitted" value={data.submitted} icon={Users} hint={`Last ${range} days`} />
            <StatCard label="Approval rate" value={formatPercent(data.approvalRate ?? NaN)} icon={Gauge} tone="green" />
            <StatCard label="Rejection rate" value={formatPercent(data.rejectionRate ?? NaN)} icon={ShieldAlert} tone="red" />
            <StatCard label="Avg processing time" value={formatDays(data.avgDays)} icon={Clock} tone="violet" />
            <StatCard label="AI flag rate" value={formatPercent(data.aiFlagRate ?? NaN)} icon={Activity} tone="amber" hint="Documents with a warning" />
          </div>
          <div className="grid gap-6 xl:grid-cols-2 grid-cols-1">
            <ChartCard title="Submissions per day" description="New applications into this department" valueLabel="Applications" data={data.submissionsByDay} className="xl:col-span-2">
              <TrendChart data={data.submissionsByDay} valueLabel="Applications" />
            </ChartCard>
            <ChartCard title="Status mix" description="Where files stand now" valueLabel="Applications" data={data.byStatus}>
              <BarsChart data={data.byStatus} valueLabel="Applications" />
            </ChartCard>
            <ChartCard title="Priority mix" description="Open and recent files by priority" valueLabel="Applications" data={[{ name: 'High', value: data.priority.high }, { name: 'Normal', value: data.priority.normal }, { name: 'Low', value: data.priority.low }]}>
              <DonutChart data={[{ name: 'High', value: data.priority.high }, { name: 'Normal', value: data.priority.normal }, { name: 'Low', value: data.priority.low }]} valueLabel="Applications" />
            </ChartCard>
            <ChartCard title="Bottleneck stages" description="Average hours spent in each stage" valueLabel="Average hours" data={data.bottlenecks.map((b) => ({ name: b.stage, value: Math.round(b.avgHours ?? 0) }))} className="xl:col-span-2">
              <BarsChart horizontal data={data.bottlenecks.map((b) => ({ name: b.stage, value: Math.round(b.avgHours ?? 0) }))} valueLabel="Average hours" unit=" h" />
            </ChartCard>
          </div>
          <p className="flex items-center gap-2 text-xs text-slate-500"><BarChart3 className="size-3.5" aria-hidden="true" /> Waiting now: {data.bottlenecks.map((b) => `${b.stage} ${b.waiting}`).join(' · ')}</p>
        </>
      )}
    </div>
  );
}
