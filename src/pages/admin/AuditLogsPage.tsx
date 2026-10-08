import { useMemo } from 'react';
import { Download, ShieldCheck, CircleCheck, CircleX, TriangleAlert, Info } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { useCurrentUser } from '../../context/AuthContext';
import { useQuery } from '../../hooks/useQuery';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { usePageTitle } from '../../hooks/usePageTitle';
import { useNow } from '../../hooks/useNow';
import { listAuditLogs, type AuditFilters } from '../../services/auditService';
import { PageHeader } from '../../components/layout/PageHeader';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { SelectField, TextField } from '../../components/ui/Forms';
import { ErrorState, LoadingBlock, EmptyState } from '../../components/ui/Feedback';
import { ResponsiveList } from '../../components/ui/ResponsiveList';
import { Badge } from '../../components/ui/Badge';
import { AUDIT_ACTIONS, auditActionLabel, SECURITY_ACTIONS } from '../../config/audit';
import { formatDateTime } from '../../utils/format';
import { downloadText, toCsv } from '../../utils/csv';
import { IntegrationBadge } from '../../components/ui/IntegrationBadge';
import type { AuditLog } from '../../types';
import { cn } from '../../utils/cn';

const RESULT_META: Record<AuditLog['result'], { label: string; icon: typeof CircleCheck; cls: string }> = {
  success: { label: 'Success', icon: CircleCheck, cls: 'text-gov-700' },
  denied: { label: 'Denied', icon: CircleX, cls: 'text-red-800' },
  failed: { label: 'Failed', icon: TriangleAlert, cls: 'text-amber-800' },
  info: { label: 'Info', icon: Info, cls: 'text-navy-700' },
};

export default function AuditLogsPage() {
  usePageTitle('Audit logs');
  const admin = useCurrentUser();
  const [params, setParams] = useSearchParams();
  const now = useNow(60_000);
  const q = params.get('q') ?? '';
  const debouncedQ = useDebouncedValue(q, 200);
  const filters: AuditFilters = {
    q: debouncedQ,
    role: params.get('role') ?? 'all',
    action: params.get('action') ?? 'all',
    department: params.get('dept') ?? 'all',
    result: params.get('result') ?? 'all',
    range: (params.get('range') as AuditFilters['range']) ?? 'all',
  };
  const { data, error, loading, reload } = useQuery(() => listAuditLogs(admin, filters, now), [admin.id, JSON.stringify(filters)]);
  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (!value || value === 'all') next.delete(key);
    else next.set(key, value);
    setParams(next, { replace: true });
  };
  const actionOptions = useMemo(() => Object.entries(AUDIT_ACTIONS).map(([value, label]) => ({ value, label })), []);

  const exportCsv = () =>
    downloadText(
      'certitrack-audit-log.csv',
      toCsv(['Timestamp', 'User', 'Role', 'Action', 'Application ID', 'Department', 'IP (placeholder)', 'Device (placeholder)', 'Result', 'Detail'], (data ?? []).map((l) => [l.at, l.actorName, l.actorRole, auditActionLabel(l.action), l.applicationId ?? '', l.departmentId ?? '', l.ipMasked, l.device, l.result, l.detail])),
    );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit logs"
        description="Every important action: sign-ins, submissions, reviews, decisions, certificate events and access denials. Entries cannot be edited."
        actions={
          <>
            <IntegrationBadge kind="prototype" />
            <Button variant="secondary" icon={Download} onClick={exportCsv} disabled={!data || data.length === 0}>
              Export CSV
            </Button>
          </>
        }
        id="audit-title"
      />
      <Card className="p-4 sm:p-5">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6 grid-cols-1">
          <TextField label="Search" type="search" value={q} onChange={(e) => setParam('q', e.target.value)} placeholder="User, action or detail" autoComplete="off" wrapperClassName="xl:col-span-2" />
          <SelectField label="Date range" value={filters.range ?? 'all'} onChange={(e) => setParam('range', e.target.value)} options={[{ value: '24h', label: 'Last 24 hours' }, { value: '7d', label: 'Last 7 days' }, { value: '30d', label: 'Last 30 days' }, { value: 'all', label: 'All time' }]} />
          <SelectField label="Role" value={filters.role ?? 'all'} onChange={(e) => setParam('role', e.target.value)} options={[{ value: 'all', label: 'All roles' }, { value: 'citizen', label: 'Citizen' }, { value: 'officer', label: 'Officer' }, { value: 'admin', label: 'Super Admin' }, { value: 'system', label: 'System / AI' }, { value: 'public', label: 'Public' }]} />
          <SelectField label="Action" value={filters.action ?? 'all'} onChange={(e) => setParam('action', e.target.value)} options={[{ value: 'all', label: 'All actions' }, ...actionOptions]} />
          <SelectField label="Department" value={filters.department ?? 'all'} onChange={(e) => setParam('dept', e.target.value)} options={[{ value: 'all', label: 'All departments' }, { value: 'caste', label: 'Caste' }, { value: 'income', label: 'Income' }, { value: 'domicile', label: 'Domicile' }]} />
          <SelectField label="Result" value={filters.result ?? 'all'} onChange={(e) => setParam('result', e.target.value)} options={[{ value: 'all', label: 'Any result' }, { value: 'success', label: 'Success' }, { value: 'denied', label: 'Denied' }, { value: 'failed', label: 'Failed' }, { value: 'info', label: 'Info' }]} />
        </div>
        <p className="mt-3 text-xs text-slate-500">{data ? `${data.length} entries match.` : ''} Security-relevant events are marked with a shield.</p>
      </Card>
      {error !== undefined && <ErrorState error={error} onRetry={reload} />}
      {loading && <LoadingBlock variant="table" label="Loading audit trail" />}
      {data && data.length === 0 && <EmptyState icon={ShieldCheck} title="No audit entries match" description="Adjust the filters or widen the date range." />}
      {data && data.length > 0 && (
        <ResponsiveList
          caption="Audit log entries"
          rows={data}
          rowKey={(l) => l.id}
          pageSize={15}
          tableMinWidth="min-w-[1100px]"
          columns={[
            { key: 'at', header: 'Timestamp', cell: (l) => <span className="whitespace-nowrap text-xs">{formatDateTime(l.at)}</span> },
            { key: 'user', header: 'User', cell: (l) => <span className="font-medium">{l.actorName}</span> },
            { key: 'role', header: 'Role', cell: (l) => <span className="capitalize">{l.actorRole}</span> },
            { key: 'action', header: 'Action', cell: (l) => <span className="flex items-center gap-1.5">{SECURITY_ACTIONS.has(l.action) && <ShieldCheck className="size-3.5 text-amber-700" aria-label="Security event" />}{auditActionLabel(l.action)}</span> },
            { key: 'app', header: 'Application ID', cell: (l) => <span className="font-mono text-xs">{l.applicationId ?? '—'}</span> },
            { key: 'dept', header: 'Department', cell: (l) => <span className="capitalize">{l.departmentId ?? '—'}</span> },
            { key: 'ip', header: 'IP · device', cell: (l) => <span className="text-xs text-slate-600">{l.ipMasked} · {l.device}</span> },
            { key: 'result', header: 'Result', cell: (l) => { const m = RESULT_META[l.result]; const Icon = m.icon; return <span className={cn('inline-flex items-center gap-1 text-xs font-semibold', m.cls)}><Icon className="size-3.5" aria-hidden="true" />{m.label}</span>; } },
            { key: 'detail', header: 'Detail', cell: (l) => <span className="line-clamp-2 max-w-xs text-xs text-slate-600">{l.detail || '—'}</span> },
          ]}
          card={(l) => (
            <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold text-navy-900">{auditActionLabel(l.action)}</p>
                <Badge tone={l.result === 'denied' ? 'danger' : l.result === 'failed' ? 'warning' : 'success'}>{RESULT_META[l.result].label}</Badge>
              </div>
              <p className="mt-1 text-xs text-slate-600">{formatDateTime(l.at)} · {l.actorName} ({l.actorRole})</p>
              <p className="mt-1 text-xs text-slate-600">{l.applicationId ? `${l.applicationId} · ` : ''}{l.departmentId ? `${l.departmentId} dept · ` : ''}{l.ipMasked} · {l.device}</p>
              {l.detail && <p className="mt-2 text-xs text-slate-700">{l.detail}</p>}
            </div>
          )}
        />
      )}
    </div>
  );
}
