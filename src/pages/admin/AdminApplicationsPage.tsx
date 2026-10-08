import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Download, Eye, SearchX, ShieldCheck } from 'lucide-react';
import { useCurrentUser } from '../../context/AuthContext';
import { useQuery } from '../../hooks/useQuery';
import { useAppState } from '../../hooks/useAppState';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { usePageTitle } from '../../hooks/usePageTitle';
import { listApplications } from '../../services/applicationService';
import { listDocumentMeta, type DocumentMeta } from '../../services/documentService';
import { PageHeader } from '../../components/layout/PageHeader';
import { Button } from '../../components/ui/Button';
import { Card, CardBody, KeyValue } from '../../components/ui/Card';
import { SelectField, TextField } from '../../components/ui/Forms';
import { ErrorState, LoadingBlock, EmptyState, Alert } from '../../components/ui/Feedback';
import { Modal } from '../../components/ui/Modal';
import { ResponsiveList } from '../../components/ui/ResponsiveList';
import { ApplicationStatusBadge, DocumentStatusBadge, PriorityBadge } from '../../components/domain/Status';
import { StageProgress } from '../../components/domain/Timeline';
import { ApplicationCard, certLabel } from '../../components/domain/ApplicationCards';
import { computeSteps } from '../../utils/stages';
import { filterApplications, derivePriority, groupDocumentsByApp } from '../../utils/applicationRules';
import { CERTIFICATE_TYPE_LIST, CERTIFICATE_TYPES } from '../../config/certificateTypes';
import { APPLICATION_STATUS_META, DELIVERY_STATUS_META } from '../../config/workflow';
import { formatDate, formatDateTime, formatBytes, formatPercent } from '../../utils/format';
import { downloadText, toCsv } from '../../utils/csv';
import { useNow } from '../../hooks/useNow';
import { Badge } from '../../components/ui/Badge';
import { IntegrationBadge } from '../../components/ui/IntegrationBadge';
import type { Application, ApplicationFilters } from '../../types';
import { currentStage } from '../../utils/stages';

export default function AdminApplicationsPage() {
  usePageTitle('Applications');
  const admin = useCurrentUser();
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const debouncedQ = useDebouncedValue(q, 200);
  const status = params.get('status') ?? 'all';
  const type = params.get('type') ?? 'all';
  const dept = params.get('dept') ?? 'all';
  const date = params.get('date') ?? 'all';
  const openId = params.get('open');
  const { data, error, loading, reload } = useQuery(() => listApplications(admin), [admin.id]);
  const docs = useAppState((s) => s.documents);
  const deliveries = useAppState((s) => s.deliveries);
  const departments = useAppState((s) => s.departments);
  const now = useNow(60_000);

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (!value || value === 'all') next.delete(key);
    else next.set(key, value);
    setParams(next, { replace: true });
  };

  const byApp = useMemo(() => groupDocumentsByApp(docs), [docs]);
  const rows = useMemo(() => {
    if (!data) return [];
    const base = filterApplications(
      data,
      { q: debouncedQ, status: status as ApplicationFilters['status'], certificateType: type as ApplicationFilters['certificateType'], date: date as ApplicationFilters['date'] },
      byApp,
      now,
    );
    return dept === 'all' ? base : base.filter((a) => a.departmentId === dept);
  }, [data, byApp, debouncedQ, status, type, dept, date, now]);

  const deptName = (a: Application) => departments.find((d) => d.id === a.departmentId)?.shortName ?? a.departmentId;
  const stageOf = (a: Application) => currentStage(computeSteps(a, deliveries.find((d) => d.applicationId === a.id) ?? null)).label;

  const exportCsv = () =>
    downloadText(
      'certitrack-applications.csv',
      toCsv(
        ['Application ID', 'Applicant', 'Certificate', 'Department', 'Submitted', 'Stage', 'Priority', 'Status'],
        rows.map((a) => [a.id, a.applicantName, certLabel(a), deptName(a), formatDate(a.submittedAt), stageOf(a), derivePriority(a, byApp.get(a.id) ?? [], now), APPLICATION_STATUS_META[a.status].label]),
      ),
    );

  const detailApp = data?.find((a) => a.id === openId) ?? null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Applications"
        description="Every application across departments. Super Admins see status and metadata. Document contents are restricted to the applicant and the owning department."
        actions={
          <Button variant="secondary" icon={Download} onClick={exportCsv} disabled={rows.length === 0}>
            Export CSV
          </Button>
        }
        id="admin-apps-title"
      />
      <Card className="p-4 sm:p-5">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <TextField label="Search" type="search" value={q} onChange={(e) => setParam('q', e.target.value)} placeholder="ID, applicant or certificate" autoComplete="off" wrapperClassName="xl:col-span-2" />
          <SelectField label="Department" value={dept} onChange={(e) => setParam('dept', e.target.value)} options={[{ value: 'all', label: 'All departments' }, ...departments.map((d) => ({ value: d.id, label: d.name }))]} />
          <SelectField label="Certificate" value={type} onChange={(e) => setParam('type', e.target.value)} options={[{ value: 'all', label: 'All certificates' }, ...CERTIFICATE_TYPE_LIST.map((c) => ({ value: c.id, label: c.label }))]} />
          <SelectField label="Status" value={status} onChange={(e) => setParam('status', e.target.value)} options={[{ value: 'all', label: 'All statuses' }, { value: 'open', label: 'Open' }, ...Object.entries(APPLICATION_STATUS_META).map(([value, m]) => ({ value, label: m.label }))]} />
          <SelectField label="Date" value={date} onChange={(e) => setParam('date', e.target.value)} options={[{ value: 'all', label: 'All time' }, { value: 'today', label: 'Today' }, { value: '7d', label: 'Last 7 days' }, { value: '30d', label: 'Last 30 days' }]} />
        </div>
        <p className="mt-3 text-xs text-slate-500">Showing {rows.length} of {data?.length ?? 0} applications.</p>
      </Card>
      {error !== undefined && <ErrorState error={error} onRetry={reload} />}
      {loading && <LoadingBlock variant="table" label="Loading applications" />}
      {data && rows.length === 0 && <EmptyState icon={SearchX} title="No applications match these filters" description="Clear the filters or try a different search." />}
      {rows.length > 0 && (
        <ResponsiveList
          caption="All applications"
          rows={rows}
          rowKey={(a) => a.id}
          tableMinWidth="min-w-[1080px]"
          columns={[
            { key: 'id', header: 'Application ID', cell: (a) => <button type="button" onClick={() => setParam('open', a.id)} className="font-mono font-semibold text-navy-800 hover:underline focus-visible:outline-2 focus-visible:outline-navy-500">{a.id}</button> },
            { key: 'applicant', header: 'Applicant', cell: (a) => a.applicantName },
            { key: 'cert', header: 'Certificate', cell: (a) => certLabel(a) },
            { key: 'dept', header: 'Department', cell: (a) => deptName(a) },
            { key: 'submitted', header: 'Submitted', cell: (a) => <span className="whitespace-nowrap">{formatDate(a.submittedAt)}</span> },
            { key: 'stage', header: 'Stage', cell: (a) => <span className="whitespace-nowrap">{stageOf(a)}</span> },
            { key: 'priority', header: 'Priority', cell: (a) => <PriorityBadge priority={derivePriority(a, byApp.get(a.id) ?? [], now)} /> },
            { key: 'status', header: 'Status', cell: (a) => <ApplicationStatusBadge status={a.status} /> },
            { key: 'action', header: <span className="sr-only">Details</span>, cell: (a) => <Button size="sm" variant="ghost" icon={Eye} onClick={() => setParam('open', a.id)}>Details<span className="sr-only"> for {a.id}</span></Button>, className: 'text-right' },
          ]}
          card={(a) => <ApplicationCard app={a} to={`/admin/applications?open=${a.id}`} />}
        />
      )}
      <AdminDetailModal app={detailApp} onClose={() => setParam('open', '')} deptName={detailApp ? deptName(detailApp) : ''} stage={detailApp ? stageOf(detailApp) : ''} />
    </div>
  );
}

function AdminDetailModal({ app, onClose, deptName, stage }: { app: Application | null; onClose: () => void; deptName: string; stage: string }) {
  return (
    <Modal open={!!app} onClose={onClose} size="xl" title={app ? `${app.id} · ${certLabel(app)}` : ''} description={app ? `${deptName} · submitted ${formatDateTime(app.submittedAt)}` : undefined}>
      {app && <AdminDetailBody key={app.id} app={app} stage={stage} />}
    </Modal>
  );
}

function AdminDetailBody({ app, stage }: { app: Application; stage: string }) {
  const admin = useCurrentUser();
  const [meta, setMeta] = useState<{ loading: boolean; items?: DocumentMeta[]; error?: unknown }>({ loading: true });
  const deliveries = useAppState((s) => s.deliveries);
  useEffect(() => {
    let active = true;
    listDocumentMeta(admin, app.id)
      .then((items) => active && setMeta({ loading: false, items }))
      .catch((error: unknown) => active && setMeta({ loading: false, error }));
    return () => {
      active = false;
    };
  }, [app.id, admin]);
  const delivery = deliveries.find((d) => d.applicationId === app.id);
  return (
    <>
      <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-2">
            <ApplicationStatusBadge status={app.status} />
            <Badge tone="neutral">Stage: {stage}</Badge>
            {delivery && <Badge tone="info">Courier: {DELIVERY_STATUS_META[delivery.status].label}</Badge>}
          </div>
          <StageProgress steps={computeSteps(app, delivery ?? null)} />
          <KeyValue
            columns={2}
            items={[
              { label: 'Applicant', value: app.applicantName },
              { label: 'Certificate type', value: CERTIFICATE_TYPES[app.certificateType].label },
              { label: 'District', value: `${app.district} · ${app.taluk}` },
              { label: 'AI score (average)', value: `${Math.round(app.aiScore)}%` },
              { label: 'Decision expected by', value: formatDate(app.expectedBy) },
              { label: 'Certificate number', value: app.certificateId ? 'Issued' : '—' },
            ]}
          />
          <Card>
            <CardBody className="space-y-3">
              <p className="flex items-center gap-2 text-sm font-semibold text-navy-900"><ShieldCheck className="size-4" aria-hidden="true" /> Document metadata</p>
              <Alert tone="info">Super Admins can see file names, status and confidence, but not the document contents or AI detail. Those belong to the applicant and the owning department.</Alert>
              {meta.loading && <LoadingBlock variant="list" label="Loading document list" />}
              {meta.error !== undefined && <ErrorState error={meta.error} />}
              <ul className="divide-y divide-slate-100">
                {(meta.items ?? []).map((d) => (
                  <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                    <div className="min-w-0">
                      <p className="font-medium text-slate-900">{d.label}</p>
                      <p className="truncate text-xs text-slate-600">{d.fileName} · {formatBytes(d.fileSize)} · v{d.version}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {d.confidence !== null && <span className="text-xs text-slate-600">AI {formatPercent(d.confidence)}</span>}
                      <DocumentStatusBadge status={d.status} />
                    </div>
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>
          <IntegrationBadge kind="prototype" />
      </div>
    </>
  );
}

