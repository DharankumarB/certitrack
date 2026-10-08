import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Download, Eye } from 'lucide-react';
import { useCurrentUser } from '../../context/AuthContext';
import { useQuery } from '../../hooks/useQuery';
import { useAppState } from '../../hooks/useAppState';
import { usePageTitle } from '../../hooks/usePageTitle';
import { listApplications } from '../../services/applicationService';
import { PageHeader } from '../../components/layout/PageHeader';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Segmented } from '../../components/ui/Tabs';
import { TextField } from '../../components/ui/Forms';
import { ErrorState, LoadingBlock, EmptyState } from '../../components/ui/Feedback';
import { ResponsiveList } from '../../components/ui/ResponsiveList';
import { ApplicationStatusBadge } from '../../components/domain/Status';
import { ApplicationCard, certLabel } from '../../components/domain/ApplicationCards';
import { DECIDED_STATUSES } from '../../config/workflow';
import { formatDate, formatDateTime } from '../../utils/format';
import { downloadText, toCsv } from '../../utils/csv';
import { APPLICATION_STATUS_META } from '../../config/workflow';
import { DEPARTMENT_NAME } from './shared';
import type { Application } from '../../types';

type Tab = 'all' | 'approved' | 'changes' | 'rejected';

export default function ProcessedPage() {
  usePageTitle('Processed applications');
  const officer = useCurrentUser();
  const { data, error, loading, reload } = useQuery(() => listApplications(officer), [officer.id]);
  const users = useAppState((s) => s.users);
  const certificates = useAppState((s) => s.certificates);
  const [tab, setTab] = useState<Tab>('all');
  const [q, setQ] = useState('');
  const processed = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (data ?? [])
      .filter((a) => DECIDED_STATUSES.includes(a.status))
      .filter((a) => (tab === 'all' ? true : tab === 'approved' ? a.status === 'esign_pending' || a.status === 'issued' || a.status === 'delivered' : tab === 'changes' ? a.status === 'changes_requested' : a.status === 'rejected'))
      .filter((a) => !term || `${a.id} ${a.applicantName} ${certificates.find((c) => c.applicationId === a.id)?.certificateNumber ?? ''}`.toLowerCase().includes(term))
      .sort((x, y) => Date.parse(y.updatedAt) - Date.parse(x.updatedAt));
  }, [data, tab, q, certificates]);

  const reviewerName = (a: Application) => users.find((u) => u.id === a.reviewerId)?.name ?? '—';
  const certNumber = (a: Application) => certificates.find((c) => c.applicationId === a.id)?.certificateNumber ?? '—';

  const exportCsv = () => {
    downloadText(
      `${DEPARTMENT_NAME(officer).toLowerCase()}-processed.csv`,
      toCsv(['Application ID', 'Applicant', 'Certificate', 'Decision', 'Decided', 'Reviewer', 'Certificate number'], processed.map((a) => [a.id, a.applicantName, certLabel(a), APPLICATION_STATUS_META[a.status].label, formatDate(a.completedAt ?? a.updatedAt), reviewerName(a), certNumber(a)])),
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Processed applications"
        description={`Files from the ${DEPARTMENT_NAME(officer)} department that you or a colleague have decided.`}
        actions={
          <Button variant="secondary" icon={Download} onClick={exportCsv} disabled={processed.length === 0}>
            Export CSV
          </Button>
        }
        id="processed-title"
      />
      <Card className="p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <Segmented
            label="Decision"
            value={tab}
            onChange={setTab}
            options={[
              { value: 'all', label: 'All processed' },
              { value: 'approved', label: 'Approved' },
              { value: 'changes', label: 'Changes requested' },
              { value: 'rejected', label: 'Rejected' },
            ]}
          />
          <TextField label="Search processed" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="ID, name or certificate number" autoComplete="off" wrapperClassName="lg:w-80" />
        </div>
      </Card>
      {error !== undefined && <ErrorState error={error} onRetry={reload} />}
      {loading && <LoadingBlock variant="table" label="Loading processed files" />}
      {data && processed.length === 0 && <EmptyState icon={Eye} title="No processed files here" description="Approved, returned and rejected files appear in this list." />}
      {processed.length > 0 && (
        <ResponsiveList
          caption="Processed applications"
          rows={processed}
          rowKey={(a) => a.id}
          tableMinWidth="min-w-[960px]"
          columns={[
            { key: 'id', header: 'Application ID', cell: (a) => <Link to={`/officer/applications/${a.id}`} className="font-mono font-semibold text-navy-800 hover:underline focus-visible:outline-2 focus-visible:outline-navy-500">{a.id}</Link> },
            { key: 'applicant', header: 'Applicant', cell: (a) => a.applicantName },
            { key: 'cert', header: 'Certificate', cell: (a) => certLabel(a) },
            { key: 'decision', header: 'Decision', cell: (a) => <ApplicationStatusBadge status={a.status} /> },
            { key: 'decided', header: 'Decided', cell: (a) => <span className="whitespace-nowrap">{formatDateTime(a.completedAt ?? a.updatedAt)}</span> },
            { key: 'reviewer', header: 'Reviewer', cell: (a) => reviewerName(a) },
            { key: 'number', header: 'Certificate no.', cell: (a) => <span className="font-mono text-xs">{certNumber(a)}</span> },
            { key: 'action', header: <span className="sr-only">Action</span>, cell: (a) => <Link to={`/officer/applications/${a.id}`} className="text-sm font-semibold text-navy-800 hover:underline focus-visible:outline-2 focus-visible:outline-navy-500">Open<span className="sr-only"> {a.id}</span></Link>, className: 'text-right' },
          ]}
          card={(a) => <ApplicationCard app={a} to={`/officer/applications/${a.id}`} extra={<span>Reviewer: {reviewerName(a)} · {certNumber(a)}</span>} />}
        />
      )}
    </div>
  );
}
