import { Link } from 'react-router-dom';
import { Building2, ArrowRight } from 'lucide-react';
import { useCurrentUser } from '../../context/AuthContext';
import { useQuery } from '../../hooks/useQuery';
import { usePageTitle } from '../../hooks/usePageTitle';
import { listDepartmentSummaries } from '../../services/departmentService';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card, CardBody } from '../../components/ui/Card';
import { ErrorState, LoadingBlock } from '../../components/ui/Feedback';
import { IntegrationBadge } from '../../components/ui/IntegrationBadge';
import { formatDays } from '../../utils/format';
import { CERTIFICATE_TYPES } from '../../config/certificateTypes';

export default function DepartmentsPage() {
  usePageTitle('Departments');
  const admin = useCurrentUser();
  const { data, error, loading, reload } = useQuery(() => listDepartmentSummaries(admin), [admin.id]);
  return (
    <div className="space-y-6">
      <PageHeader title="Departments" description="Each department has its own officers, queue and service standard. Open a department to manage officers and review performance." actions={<IntegrationBadge kind="demo-data" />} id="depts-title" />
      {error !== undefined && <ErrorState error={error} onRetry={reload} />}
      {loading && <LoadingBlock variant="cards" label="Loading departments" />}
      {data && (
        <ul className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {data.map((d) => (
            <li key={d.department.id}>
              <Card className="flex h-full flex-col">
                <CardBody className="flex flex-1 flex-col gap-4">
                  <div className="flex items-start gap-3">
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-navy-900 text-amber-300">
                      <Building2 className="size-5" aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <h2 className="font-semibold text-navy-900">{d.department.name}</h2>
                      <p className="text-xs text-slate-600">Head: {d.department.headName} · {d.officers.length} officers</p>
                    </div>
                  </div>
                  <p className="text-sm text-slate-600">{d.department.description}</p>
                  <dl className="grid grid-cols-2 gap-3 text-sm">
                    <Metric label="Total applications" value={d.metrics.total} />
                    <Metric label="Pending" value={d.metrics.pending} />
                    <Metric label="Needs changes" value={d.metrics.changes} />
                    <Metric label="Overdue" value={d.metrics.overdue} />
                    <Metric label="Issued" value={d.metrics.issued} />
                    <Metric label="Avg time" value={formatDays(d.metrics.avgHours === null ? null : d.metrics.avgHours / 24)} />
                  </dl>
                  <p className="text-xs text-slate-500">Service standard {d.department.slaDays} days · {d.department.certificateTypes.map((t) => CERTIFICATE_TYPES[t].shortLabel).join(', ')}</p>
                  <Link to={`/admin/departments/${d.department.id}`} className="mt-auto inline-flex items-center gap-1 text-sm font-semibold text-navy-800 hover:underline focus-visible:outline-2 focus-visible:outline-navy-500">
                    Open department <ArrowRight className="size-4" aria-hidden="true" />
                  </Link>
                </CardBody>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg bg-slate-50 p-2.5">
      <dt className="text-xs text-slate-600">{label}</dt>
      <dd className="text-base font-bold tabular-nums text-navy-900">{value}</dd>
    </div>
  );
}
