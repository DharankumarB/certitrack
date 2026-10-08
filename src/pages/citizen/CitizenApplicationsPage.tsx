import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { FilePlus2, FolderOpen, SearchX } from 'lucide-react';
import { useCurrentUser } from '../../context/AuthContext';
import { useQuery } from '../../hooks/useQuery';
import { useAppState } from '../../hooks/useAppState';
import { usePageTitle } from '../../hooks/usePageTitle';
import { listApplications } from '../../services/applicationService';
import { PageHeader } from '../../components/layout/PageHeader';
import { ButtonLink } from '../../components/ui/Button';
import { ErrorState, LoadingBlock, EmptyState } from '../../components/ui/Feedback';
import { ResponsiveList } from '../../components/ui/ResponsiveList';
import { ApplicationCard, certLabel } from '../../components/domain/ApplicationCards';
import { ApplicationStatusBadge } from '../../components/domain/Status';
import { SelectField, TextField } from '../../components/ui/Forms';
import { APPLICATION_STATUS_META } from '../../config/workflow';
import { CERTIFICATE_TYPE_LIST } from '../../config/certificateTypes';
import { formatDate, formatRelative } from '../../utils/format';
import { useNow } from '../../hooks/useNow';
import { filterApplications, groupDocumentsByApp } from '../../utils/applicationRules';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { Card } from '../../components/ui/Card';
import type { ApplicationStatus } from '../../types';

const STATUS_FILTERS: Array<{ value: string; label: string }> = [
  { value: 'all', label: 'All statuses' },
  { value: 'open', label: 'Open' },
  { value: 'changes_requested', label: APPLICATION_STATUS_META.changes_requested.label },
  { value: 'in_review', label: APPLICATION_STATUS_META.in_review.label },
  { value: 'esign_pending', label: APPLICATION_STATUS_META.esign_pending.label },
  { value: 'issued', label: APPLICATION_STATUS_META.issued.label },
  { value: 'delivered', label: APPLICATION_STATUS_META.delivered.label },
  { value: 'rejected', label: APPLICATION_STATUS_META.rejected.label },
];

export default function CitizenApplicationsPage() {
  usePageTitle('My applications');
  const user = useCurrentUser();
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const status = params.get('status') ?? 'all';
  const type = params.get('type') ?? 'all';
  const debouncedQ = useDebouncedValue(q, 200);
  const { data, error, loading, reload } = useQuery(() => listApplications(user), [user.id]);
  const docs = useAppState((s) => s.documents);
  const now = useNow(60_000);
  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (!value || value === 'all') next.delete(key);
    else next.set(key, value);
    setParams(next, { replace: true });
  };
  const rows = useMemo(() => {
    if (!data) return [];
    const byApp = groupDocumentsByApp(docs);
    return filterApplications(
      data,
      { q: debouncedQ, status: status as ApplicationStatus | 'all' | 'open', certificateType: type as 'all' | 'caste' | 'income' | 'domicile' },
      byApp,
      now,
    );
  }, [data, docs, debouncedQ, status, type, now]);

  return (
    <div className="space-y-6">
      <PageHeader title="My applications" description="Every application you have submitted, with its current stage." actions={<ButtonLink to="/citizen/apply" icon={FilePlus2}>New application</ButtonLink>} id="apps-title" />
      <Card className="p-4 sm:p-5">
        <div className="grid gap-4 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)] grid-cols-1">
          <TextField label="Search" type="search" placeholder="Application ID or certificate" value={q} onChange={(e) => setParam('q', e.target.value)} autoComplete="off" />
          <SelectField label="Status" value={status} onChange={(e) => setParam('status', e.target.value)} options={STATUS_FILTERS} />
          <SelectField label="Certificate" value={type} onChange={(e) => setParam('type', e.target.value)} options={[{ value: 'all', label: 'All certificates' }, ...CERTIFICATE_TYPE_LIST.map((c) => ({ value: c.id, label: c.label }))]} />
        </div>
      </Card>
      {error !== undefined && <ErrorState error={error} onRetry={reload} />}
      {loading && <LoadingBlock variant="table" label="Loading applications" />}
      {data && data.length === 0 && <EmptyState icon={FolderOpen} title="You have not applied yet" description="Start an application for a caste, income or domicile certificate." action={<ButtonLink to="/citizen/apply">Apply for a certificate</ButtonLink>} />}
      {data && data.length > 0 && rows.length === 0 && <EmptyState icon={SearchX} title="No applications match these filters" description="Clear the filters to see all applications." action={<button type="button" className="text-sm font-semibold text-navy-800 underline" onClick={() => setParams(new URLSearchParams(), { replace: true })}>Clear filters</button>} />}
      {rows.length > 0 && (
        <ResponsiveList
          caption="Your applications"
          rows={rows}
          rowKey={(a) => a.id}
          tableMinWidth="min-w-[760px]"
          columns={[
            { key: 'id', header: 'Application ID', cell: (a) => <Link to={`/citizen/applications/${a.id}`} className="font-mono font-semibold text-navy-800 hover:underline focus-visible:outline-2 focus-visible:outline-navy-500">{a.id}</Link> },
            { key: 'cert', header: 'Certificate', cell: (a) => certLabel(a) },
            { key: 'submitted', header: 'Submitted', cell: (a) => formatDate(a.submittedAt) },
            { key: 'status', header: 'Status', cell: (a) => <ApplicationStatusBadge status={a.status} /> },
            { key: 'updated', header: 'Last update', cell: (a) => formatRelative(a.updatedAt, now) },
            { key: 'action', header: <span className="sr-only">Actions</span>, cell: (a) => <Link to={`/citizen/applications/${a.id}`} className="text-sm font-semibold text-navy-800 hover:underline focus-visible:outline-2 focus-visible:outline-navy-500">View<span className="sr-only"> {a.id}</span></Link>, className: 'text-right' },
          ]}
          card={(a) => <ApplicationCard app={a} to={`/citizen/applications/${a.id}`} />}
        />
      )}
    </div>
  );
}
