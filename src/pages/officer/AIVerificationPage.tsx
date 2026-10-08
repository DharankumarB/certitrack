import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ScanSearch, ShieldAlert, Eye } from 'lucide-react';
import { useCurrentUser } from '../../context/AuthContext';
import { useAppState } from '../../hooks/useAppState';
import { usePageTitle } from '../../hooks/usePageTitle';
import { PageHeader } from '../../components/layout/PageHeader';
import { Segmented } from '../../components/ui/Tabs';
import { Card, CardBody } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/Feedback';
import { AIDisclaimer } from '../../components/domain/Notices';
import { DocumentCard, AIPanel } from '../../components/domain/DocumentReview';
import { Button } from '../../components/ui/Button';
import { DocumentPreviewModal } from '../../components/domain/DocumentReview';
import { docHasPotentialIssue, docIsHighConfidence, docIsUnreadable, effectiveDocStatus, isOpenStatus } from '../../utils/applicationRules';
import { departmentOf } from '../../services/access';
import { REQUIREMENTS } from '../../config/certificateTypes';
import { certLabel } from '../../components/domain/ApplicationCards';
import { formatPercent } from '../../utils/format';
import type { Document } from '../../types';
import { IntegrationBadge } from '../../components/ui/IntegrationBadge';

type Filter = 'all' | 'high' | 'review' | 'issue' | 'unreadable';

export default function AIVerificationPage() {
  usePageTitle('AI verification');
  const officer = useCurrentUser();
  const applications = useAppState((s) => s.applications);
  const documents = useAppState((s) => s.documents);
  const [filter, setFilter] = useState<Filter>('all');
  const [preview, setPreview] = useState<string | null>(null);

  const docs = useMemo(() => {
    const dept = departmentOf(officer);
    const mine = new Map(applications.filter((a) => a.departmentId === dept && isOpenStatus(a.status)).map((a) => [a.id, a] as const));
    return documents.filter((d) => mine.has(d.applicationId));
  }, [applications, documents, officer]);

  const matches = (d: Document): boolean => {
    switch (filter) {
      case 'high':
        return docIsHighConfidence(d.ai);
      case 'review':
        return d.ai?.verdict === 'warning' || d.ai?.verdict === 'needs_changes';
      case 'issue':
        return docHasPotentialIssue(d.ai);
      case 'unreadable':
        return docIsUnreadable(d.ai);
      default:
        return true;
    }
  };
  const visible = docs.filter(matches);
  const counts = {
    all: docs.length,
    high: docs.filter((d) => docIsHighConfidence(d.ai)).length,
    review: docs.filter((d) => d.ai?.verdict === 'warning' || d.ai?.verdict === 'needs_changes').length,
    issue: docs.filter((d) => docHasPotentialIssue(d.ai)).length,
    unreadable: docs.filter((d) => docIsUnreadable(d.ai)).length,
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI verification queue"
        description="Documents in open files from your department, with AI findings for each. Use this list to focus on the files that need a careful look."
        actions={<IntegrationBadge kind="ai" />}
        id="ai-title"
      />
      <AIDisclaimer />
      <Segmented
        label="AI result filter"
        value={filter}
        onChange={setFilter}
        options={[
          { value: 'all', label: 'All', count: counts.all },
          { value: 'high', label: 'High confidence', count: counts.high },
          { value: 'review', label: 'Needs review', count: counts.review },
          { value: 'issue', label: 'Potential issue', count: counts.issue },
          { value: 'unreadable', label: 'Unreadable', count: counts.unreadable },
        ]}
      />
      {visible.length === 0 && <EmptyState icon={ScanSearch} title="Nothing in this filter" description="Documents in open files will appear here with their AI findings." />}
      <div className="grid gap-5 xl:grid-cols-2">
        {visible.map((d) => {
          const app = applications.find((a) => a.id === d.applicationId);
          return (
            <Card key={d.id} className="min-w-0">
              <CardBody className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <Link to={`/officer/applications/${d.applicationId}`} className="font-mono font-semibold text-navy-800 hover:underline focus-visible:outline-2 focus-visible:outline-navy-500">
                    {d.applicationId}
                  </Link>
                  <span className="text-slate-600">
                    {app ? `${app.applicantName} · ${certLabel(app)}` : ''}
                  </span>
                </div>
                <DocumentCard doc={d} showAi={false}>
                  <Button variant="secondary" size="sm" icon={Eye} onClick={() => setPreview(d.id)}>
                    Preview
                  </Button>
                  <Link to={`/officer/applications/${d.applicationId}`} className="inline-flex items-center rounded-lg px-3 py-1.5 text-sm font-semibold text-navy-800 hover:bg-navy-50 focus-visible:outline-2 focus-visible:outline-navy-500">
                    Open file
                  </Link>
                </DocumentCard>
                <p className="flex items-center gap-2 text-xs text-slate-600">
                  <ShieldAlert className="size-3.5" aria-hidden="true" />
                  {REQUIREMENTS[d.requirementId].label} · AI confidence {formatPercent(d.ai?.confidence ?? 0)} · status {effectiveDocStatus(d).replace('_', ' ')}
                </p>
                <AIPanel ai={d.ai} compact />
              </CardBody>
            </Card>
          );
        })}
      </div>
      <DocumentPreviewModal viewer={officer} documentId={preview} open={!!preview} onClose={() => setPreview(null)} title="Document preview" />
    </div>
  );
}
