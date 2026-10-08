import { useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Save, UserX, UserCheck } from 'lucide-react';
import { useCurrentUser } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useQuery } from '../../hooks/useQuery';
import { usePageTitle } from '../../hooks/usePageTitle';
import { getDepartmentDetail, setOfficerActive, updateDepartmentSla } from '../../services/departmentService';
import { errorMessage, isServiceError } from '../../services/api';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { Button, ButtonLink } from '../../components/ui/Button';
import { TextField } from '../../components/ui/Forms';
import { Alert, ErrorState, LoadingBlock } from '../../components/ui/Feedback';
import { ConfirmDialog } from '../../components/ui/Modal';
import { Badge } from '../../components/ui/Badge';
import { ChartCard, BarsChart, DonutChart } from '../../components/domain/Charts';
import { ApplicationStatusBadge } from '../../components/domain/Status';
import { ResponsiveList } from '../../components/ui/ResponsiveList';
import { formatDays, formatDate, formatRelative } from '../../utils/format';
import { auditActionLabel } from '../../config/audit';
import { certLabel } from '../../components/domain/ApplicationCards';
import { useNow } from '../../hooks/useNow';
import type { OfficerUser } from '../../types';
import { IntegrationBadge } from '../../components/ui/IntegrationBadge';

export default function DepartmentDetailPage() {
  const { id = '' } = useParams();
  const admin = useCurrentUser();
  const { toast } = useToast();
  const now = useNow(60_000);
  const { data, error, loading, reload } = useQuery(() => getDepartmentDetail(admin, id, now), [admin.id, id]);
  usePageTitle(data ? data.department.name : 'Department');
  const [slaDraft, setSlaDraft] = useState<string | null>(null);
  const [slaError, setSlaError] = useState<string | undefined>();
  const [toggle, setToggle] = useState<OfficerUser | null>(null);
  const [busy, setBusy] = useState(false);

  if (error !== undefined) {
    return (
      <div className="space-y-6">
        <PageHeader title="Department unavailable" breadcrumbs={[{ label: 'Departments', to: '/admin/departments' }]} id="dept-title" />
        <ErrorState error={error} onRetry={reload} />
      </div>
    );
  }
  if (loading || !data) return <LoadingBlock variant="detail" label="Loading department" />;

  const deptBucket = data.statusBreakdown.map((s) => ({ name: s.name, value: s.value }));
  const bottlenecks = data.bottlenecks.map((b) => ({ name: b.stage, value: Math.round(b.avgHours ?? 0) }));

  const sla = slaDraft ?? String(data.department.slaDays);
  const saveSla = async (e: FormEvent) => {
    e.preventDefault();
    const value = Number(sla);
    setSlaError(undefined);
    try {
      await updateDepartmentSla(admin, data.department.id, value);
      toast({ title: 'Service standard saved', description: `${data.department.name}: ${value} days.` });
      reload();
    } catch (err) {
      if (isServiceError(err) && err.fieldErrors?.slaDays) setSlaError(err.fieldErrors.slaDays);
      else toast({ tone: 'danger', title: 'Not saved', description: errorMessage(err) });
    }
  };

  const confirmToggle = async () => {
    if (!toggle) return;
    setBusy(true);
    try {
      await setOfficerActive(admin, toggle.id, !toggle.active);
      toast({ title: toggle.active ? 'Officer access disabled' : 'Officer access restored', description: `${toggle.name}. Logged in the audit trail.` });
      setToggle(null);
      reload();
    } catch (err) {
      toast({ tone: 'danger', title: 'Not changed', description: errorMessage(err) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: 'Departments', to: '/admin/departments' }, { label: data.department.shortName }]}
        title={data.department.name}
        description={data.department.description}
        actions={<IntegrationBadge kind="demo-data" />}
        id="dept-title"
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <Kpi label="Total" value={data.metrics.total} />
        <Kpi label="Pending" value={data.metrics.pending} />
        <Kpi label="Needs changes" value={data.metrics.changes} />
        <Kpi label="Approved" value={data.metrics.approved} />
        <Kpi label="Overdue" value={data.metrics.overdue} />
        <Kpi label="Avg processing" value={formatDays(data.metrics.avgHours === null ? null : data.metrics.avgHours / 24)} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader title="Officers" description={`Head: ${data.department.headName}. Disabling access blocks sign-in for that officer.`} />
          <CardBody className="space-y-3">
            {data.officers.map((o) => (
              <div key={o.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 p-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-navy-900">{o.name}</p>
                  <p className="text-xs text-slate-600">{o.employeeId} · {o.designation}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={o.active ? 'success' : 'danger'}>{o.active ? 'Active' : 'Disabled'}</Badge>
                  <Button size="sm" variant={o.active ? 'secondary' : 'success'} icon={o.active ? UserX : UserCheck} onClick={() => setToggle(o)}>
                    {o.active ? 'Disable' : 'Enable'}
                  </Button>
                </div>
              </div>
            ))}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Service standard" description="Target number of days from submission to decision." />
          <CardBody>
            <form onSubmit={saveSla} noValidate className="flex flex-col gap-4 sm:flex-row sm:items-end">
              <TextField label="Days" type="number" min={1} max={60} value={sla} onChange={(e) => setSlaDraft(e.target.value)} error={slaError} wrapperClassName="sm:w-40" inputMode="numeric" />
              <Button type="submit" icon={Save} variant="secondary">Save standard</Button>
            </form>
            <p className="mt-4 text-xs text-slate-600">Current: {data.department.slaDays} days. Changes apply to new applications and overdue checks.</p>
          </CardBody>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <ChartCard title="Bottleneck stages" description="Average hours in each stage" valueLabel="Average hours" data={bottlenecks}>
          <BarsChart horizontal data={bottlenecks} valueLabel="Average hours" unit=" h" />
        </ChartCard>
        <ChartCard title="Status breakdown" description="Files by current status" valueLabel="Applications" data={deptBucket}>
          <DonutChart data={deptBucket} valueLabel="Applications" />
        </ChartCard>
      </div>

      <section aria-labelledby="dept-apps-title" className="space-y-4">
        <h2 id="dept-apps-title" className="text-lg font-semibold text-navy-900">Applications in this department</h2>
        <ResponsiveList
          caption="Department applications"
          rows={data.applications.slice(0, 40)}
          rowKey={(a) => a.id}
          tableMinWidth="min-w-[760px]"
          columns={[
            { key: 'id', header: 'Application ID', cell: (a) => <Link to={`/admin/applications?open=${a.id}`} className="font-mono font-semibold text-navy-800 hover:underline focus-visible:outline-2 focus-visible:outline-navy-500">{a.id}</Link> },
            { key: 'cert', header: 'Certificate', cell: (a) => certLabel(a) },
            { key: 'submitted', header: 'Submitted', cell: (a) => formatDate(a.submittedAt) },
            { key: 'updated', header: 'Last update', cell: (a) => formatRelative(a.updatedAt, now) },
            { key: 'status', header: 'Status', cell: (a) => <ApplicationStatusBadge status={a.status} /> },
          ]}
          card={(a) => (
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="font-mono text-xs font-semibold text-navy-700">{a.id}</p>
              <p className="text-sm font-semibold text-navy-900">{certLabel(a)}</p>
              <div className="mt-2"><ApplicationStatusBadge status={a.status} /></div>
            </div>
          )}
        />
      </section>

      <Card>
        <CardHeader title="Recent activity" description="Audit entries for this department." actions={<ButtonLink to="/admin/audit-logs" variant="link" size="sm">Full audit log</ButtonLink>} />
        <CardBody>
          {data.recentActivity.length === 0 ? (
            <p className="text-sm text-slate-600">No activity recorded yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {data.recentActivity.map((l) => (
                <li key={l.id} className="flex flex-wrap items-start justify-between gap-2 py-3 text-sm">
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900">{auditActionLabel(l.action)}</p>
                    <p className="text-xs text-slate-600">{l.actorName} · {l.applicationId ?? 'no application'} · {l.detail}</p>
                  </div>
                  <span className="whitespace-nowrap text-xs text-slate-500">{formatRelative(l.at, now)}</span>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      <ConfirmDialog
        open={!!toggle}
        onClose={() => setToggle(null)}
        onConfirm={confirmToggle}
        loading={busy}
        title={toggle?.active ? `Disable ${toggle.name}?` : `Restore ${toggle?.name ?? ''}?`}
        description={toggle?.active ? 'The officer will not be able to sign in until access is restored. The change is recorded in the audit log.' : 'The officer can sign in and continue reviewing this department’s files.'}
        confirmLabel={toggle?.active ? 'Disable access' : 'Restore access'}
        variant={toggle?.active ? 'danger' : 'success'}
      >
        <Alert tone="info">This is a prototype control. In production, access changes also go through the identity provider.</Alert>
      </ConfirmDialog>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium text-slate-600">{label}</p>
      <p className="mt-1 text-xl font-bold tabular-nums text-navy-900">{value}</p>
    </div>
  );
}
