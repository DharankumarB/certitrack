import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Download, Eye, SearchX } from 'lucide-react';
import { useCurrentUser } from '../../context/AuthContext';
import { useQuery } from '../../hooks/useQuery';
import { useAppState } from '../../hooks/useAppState';
import { useNow } from '../../hooks/useNow';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { usePageTitle } from '../../hooks/usePageTitle';
import { listApplications } from '../../services/applicationService';
import { PageHeader } from '../../components/layout/PageHeader';
import { CERTIFICATE_TYPE_LIST } from '../../config/certificateTypes';
import { departmentOf } from '../../services/access';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { SelectField, TextField } from '../../components/ui/Forms';
import { ErrorState, LoadingBlock, EmptyState } from '../../components/ui/Feedback';
import { ResponsiveList } from '../../components/ui/ResponsiveList';
import { ApplicationCard, certLabel } from '../../components/domain/ApplicationCards';
import { ApplicationStatusBadge, PriorityBadge, AiPercent } from '../../components/domain/Status';
import { formatDate, formatDateTime } from '../../utils/format';
import { AI_FILTER_LABELS, derivePriority, filterApplications, groupDocumentsByApp, averageConfidence } from '../../utils/applicationRules';
import { APPLICATION_STATUS_META } from '../../config/workflow';
import { downloadText, toCsv } from '../../utils/csv';
import type { ApplicationFilters } from '../../types';
import { computeSteps, currentStage } from '../../utils/stages';
import { DEPARTMENT_NAME } from './shared';

export default function OfficerQueuePage() {
  const officer = useCurrentUser();
  const [params, setParams] = useSearchParams();
  const status = params.get('status') ?? 'all';
  const isPending = status === 'in_review';
  usePageTitle(isPending ? 'Pending review' : 'Application queue');
  const q = params.get('q') ?? '';
  const debouncedQ = useDebouncedValue(q, 200);
  const type = params.get('type') ?? 'all';
  const date = params.get('date') ?? 'all';
  const ai = params.get('ai') ?? 'all';
  const priority = params.get('priority') ?? 'all';
  const { data, error, loading, reload } = useQuery(() => listApplications(officer), [officer.id]);
  const docs = useAppState((s) => s.documents);
  const deliveries = useAppState((s) => s.deliveries);
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
    const filters: ApplicationFilters = {
      q: debouncedQ,
      status: (status === 'all' ? 'all' : status) as ApplicationFilters['status'],
      certificateType: type as ApplicationFilters['certificateType'],
      date: date as ApplicationFilters['date'],
      ai: ai as ApplicationFilters['ai'],
      priority: priority as ApplicationFilters['priority'],
    };
    return filterApplications(data, filters, byApp, now);
  }, [data, byApp, debouncedQ, status, type, date, ai, priority, now]);

  const exportCsv = () => {
    const rowsForCsv = rows.map((a) => [a.id, a.applicantName, certLabel(a), formatDate(a.submittedAt), Math.round(a.aiScore), currentStage(computeSteps(a, deliveries.find((d) => d.applicationId === a.id) ?? null)).label, derivePriority(a, byApp.get(a.id) ?? [], now), APPLICATION_STATUS_META[a.status].label]);
    downloadText(`${DEPARTMENT_NAME(officer).toLowerCase()}-queue.csv`, toCsv(['Application ID', 'Applicant', 'Certificate', 'Submitted', 'AI score', 'Current stage', 'Priority', 'Status'], rowsForCsv));
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={isPending ? 'Pending review' : 'Application queue'}
        description={`${DEPARTMENT_NAME(officer)} department only. Filter by status, date, AI result and priority.`}
        actions={
          <Button variant="secondary" icon={Download} onClick={exportCsv} disabled={rows.length === 0}>
            Export CSV
          </Button>
        }
        id="queue-title"
      />
      <Card className="p-4 sm:p-5">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6 grid-cols-1">
          <TextField label="Search" type="search" placeholder="ID or applicant" value={q} onChange={(e) => setParam('q', e.target.value)} wrapperClassName="xl:col-span-2" autoComplete="off" />
          <SelectField label="Certificate" value={type} onChange={(e) => setParam('type', e.target.value)} options={[{ value: 'all', label: 'All certificates' }, ...CERTIFICATE_TYPE_LIST.filter((c) => c.departmentId === departmentOf(officer)).map((c) => ({ value: c.id, label: c.label }))]} />
          <SelectField label="Status" value={status} onChange={(e) => setParam('status', e.target.value)} options={[{ value: 'all', label: 'All statuses' }, { value: 'in_review', label: 'Under review' }, { value: 'changes_requested', label: 'Needs changes' }, { value: 'esign_pending', label: 'Approved · e-sign' }, { value: 'issued', label: 'Issued' }, { value: 'rejected', label: 'Rejected' }]} />
          <SelectField label="Date submitted" value={date} onChange={(e) => setParam('date', e.target.value)} options={[{ value: 'all', label: 'Any time' }, { value: 'today', label: 'Today' }, { value: '7d', label: 'Last 7 days' }, { value: '30d', label: 'Last 30 days' }]} />
          <SelectField label="AI result" value={ai} onChange={(e) => setParam('ai', e.target.value)} options={Object.entries(AI_FILTER_LABELS).map(([value, label]) => ({ value, label }))} />
          <SelectField label="Priority" value={priority} onChange={(e) => setParam('priority', e.target.value)} options={[{ value: 'all', label: 'Any priority' }, { value: 'high', label: 'High' }, { value: 'normal', label: 'Normal' }, { value: 'low', label: 'Low' }]} />
        </div>
        <p className="mt-3 text-xs text-slate-500">Showing {rows.length} of {data?.length ?? 0} files.</p>
      </Card>
      {error !== undefined && <ErrorState error={error} onRetry={reload} />}
      {loading && <LoadingBlock variant="table" label="Loading queue" />}
      {data && rows.length === 0 && (
        <EmptyState icon={SearchX} title="No files match these filters" description="Widen the date range or clear the AI and priority filters." action={<Button variant="secondary" onClick={() => setParams(new URLSearchParams(), { replace: true })}>Clear filters</Button>} />
      )}
      {rows.length > 0 && (
        <ResponsiveList
          caption="Application queue"
          rows={rows}
          rowKey={(a) => a.id}
          tableMinWidth="min-w-[1000px]"
          columns={[
            { key: 'id', header: 'Application ID', cell: (a) => <Link to={`/officer/applications/${a.id}`} className="font-mono font-semibold text-navy-800 hover:underline focus-visible:outline-2 focus-visible:outline-navy-500">{a.id}</Link> },
            { key: 'applicant', header: 'Applicant', cell: (a) => a.applicantName },
            { key: 'cert', header: 'Certificate', cell: (a) => certLabel(a) },
            { key: 'submitted', header: 'Submitted', cell: (a) => <span className="whitespace-nowrap">{formatDateTime(a.submittedAt)}</span> },
            { key: 'ai', header: 'AI score', cell: (a) => <AiPercent value={averageConfidence(byApp.get(a.id) ?? []) || null} /> },
            { key: 'stage', header: 'Current stage', cell: (a) => <span className="whitespace-nowrap">{currentStage(computeSteps(a, deliveries.find((d) => d.applicationId === a.id) ?? null)).label}</span> },
            { key: 'priority', header: 'Priority', cell: (a) => <PriorityBadge priority={derivePriority(a, byApp.get(a.id) ?? [], now)} /> },
            { key: 'status', header: 'Status', cell: (a) => <ApplicationStatusBadge status={a.status} /> },
            { key: 'action', header: <span className="sr-only">Action</span>, cell: (a) => <Link to={`/officer/applications/${a.id}`} className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-sm font-semibold text-navy-800 hover:bg-navy-50 focus-visible:outline-2 focus-visible:outline-navy-500"><Eye className="size-4" aria-hidden="true" /> Review<span className="sr-only"> {a.id}</span></Link>, className: 'text-right' },
          ]}
          card={(a) => <ApplicationCard app={a} to={`/officer/applications/${a.id}`} priority={derivePriority(a, byApp.get(a.id) ?? [], now)} />}
        />
      )}
    </div>
  );
}
