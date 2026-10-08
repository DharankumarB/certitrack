import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ArrowLeft, Eye, FileCheck2, Flag, Phone, ShieldAlert, ThumbsUp, Undo2, XCircle } from 'lucide-react';
import { useCurrentUser } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useQuery } from '../../hooks/useQuery';
import { useAppState } from '../../hooks/useAppState';
import { usePageTitle } from '../../hooks/usePageTitle';
import { useNow } from '../../hooks/useNow';
import { approveApplication, getApplication, logContactReveal, rejectApplication, requestChanges, setPriority, startReview } from '../../services/applicationService';
import { decideDocument, listDocuments } from '../../services/documentService';
import { errorMessage, isServiceError } from '../../services/api';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card, CardBody, CardHeader, KeyValue } from '../../components/ui/Card';
import { Button, ButtonLink } from '../../components/ui/Button';
import { Alert, EmptyState, ErrorState, LoadingBlock } from '../../components/ui/Feedback';
import { SelectField } from '../../components/ui/Forms';
import { Badge } from '../../components/ui/Badge';
import { ApplicationStatusBadge, PriorityBadge, DocumentStatusBadge, CHECK_ICON } from '../../components/domain/Status';
import { ApplicationTimeline } from '../../components/domain/Timeline';
import { AIDisclaimer, SecurityNote } from '../../components/domain/Notices';
import { DocumentCard, DocumentPreviewModal, AIPanel } from '../../components/domain/DocumentReview';
import { ApproveDialog, ChangesDialog, RejectDialog } from '../../components/domain/DecisionDialogs';
import { CERTIFICATE_TYPES, REQUIREMENTS } from '../../config/certificateTypes';
import { effectiveDocStatus, derivePriority, averageConfidence, docHasPotentialIssue } from '../../utils/applicationRules';
import { formatDate, formatDateTime, formatPercent, maskEmail, maskMobile, formatRelative } from '../../utils/format';
import { cn } from '../../utils/cn';
import type { Application, Document } from '../../types';

type Dialog = 'approve' | 'changes' | 'reject' | null;

export default function OfficerReviewPage() {
  const { id = '' } = useParams();
  const officer = useCurrentUser();
  const { toast } = useToast();
  const now = useNow(60_000);
  usePageTitle(`Review ${id}`);
  const app = useQuery(() => getApplication(officer, id), [id, officer.id]);
  const docs = useQuery(() => listDocuments(officer, id), [id, officer.id]);
  const deliveries = useAppState((s) => s.deliveries);
  const users = useAppState((s) => s.users);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [busy, setBusy] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const startedFor = useRef<string | null>(null);

  // Opening a new file starts the review clock once (idempotent on the server).
  useEffect(() => {
    const current = app.data;
    if (!current || current.status !== 'in_review' || current.reviewStartedAt || startedFor.current === current.id) return;
    startedFor.current = current.id;
    startReview(officer, current.id).then(() => app.reload()).catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only react to the loaded application id
  }, [app.data?.id, app.data?.status, app.data?.reviewStartedAt]);

  if (app.error !== undefined) {
    const forbidden = isServiceError(app.error) && app.error.code === 'FORBIDDEN';
    return (
      <div className="space-y-6">
        <PageHeader title={forbidden ? 'Not available to your department' : 'Application unavailable'} breadcrumbs={[{ label: 'Queue', to: '/officer/applications' }, { label: id }]} id="review-title" />
        {forbidden ? (
          <Alert tone="danger" title="This file belongs to another department">
            <p>{errorMessage(app.error)}</p>
            <p className="mt-2">Officers can only open files from their own department, so no details are shown here.</p>
            <div className="mt-4"><ButtonLink to="/officer/applications" variant="secondary" size="sm" icon={ArrowLeft}>Back to my queue</ButtonLink></div>
          </Alert>
        ) : (
          <ErrorState error={app.error} onRetry={app.reload} />
        )}
      </div>
    );
  }
  if (app.loading || !app.data) return <LoadingBlock variant="detail" label="Loading application" />;

  const a: Application = app.data;
  const documents: Document[] = docs.data ?? [];
  const delivery = deliveries.find((d) => d.applicationId === a.id) ?? null;
  const type = CERTIFICATE_TYPES[a.certificateType];
  const open = a.status === 'in_review' || a.status === 'changes_requested';
  const allVerified = documents.length > 0 && documents.every((d) => effectiveDocStatus(d) === 'verified');
  const anyFlagged = documents.some((d) => effectiveDocStatus(d) === 'needs_changes');
  const confidence = averageConfidence(documents);
  const issues = documents.filter((d) => docHasPotentialIssue(d.ai)).length;
  const overdue = open && Date.parse(a.expectedBy) < now;
  const reviewer = users.find((u) => u.id === a.reviewerId);

  const afterDecision = (message: string) => {
    toast({ title: message });
    app.reload();
    docs.reload();
    setDialog(null);
  };

  const decide = async (doc: Document, decision: 'accepted' | null) => {
    try {
      await decideDocument(officer, doc.id, { decision, remark: '' });
      docs.reload();
    } catch (err) {
      toast({ tone: 'danger', title: 'Decision not saved', description: errorMessage(err) });
    }
  };

  const reveal = async () => {
    try {
      await logContactReveal(officer, a.id);
      setRevealed(true);
    } catch (err) {
      toast({ tone: 'danger', title: 'Could not reveal contact details', description: errorMessage(err) });
    }
  };

  return (
    <div className="space-y-6 pb-28 lg:pb-8">
      <PageHeader
        breadcrumbs={[{ label: 'Queue', to: '/officer/applications' }, { label: a.id }]}
        title={`${type.label} · ${a.applicantName}`}
        description={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="font-mono font-semibold text-navy-900">{a.id}</span>
            <span>Submitted {formatDateTime(a.submittedAt)}</span>
            <span>Due {formatDate(a.expectedBy)}{overdue ? ' (overdue)' : ''}</span>
          </span>
        }
        actions={<ApplicationStatusBadge status={a.status} />}
        id="review-title"
      />

      {!open && (
        <Alert tone={a.status === 'rejected' ? 'danger' : 'success'} title={`This file is ${a.status.replace('_', ' ')}`}>
          Decisions are final for this file. Use the processed list to find it later.
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.25fr)] grid-cols-1">
        {/* Left: details */}
        <div className="min-w-0 space-y-6">
          <Card>
            <CardHeader title="Applicant" actions={!revealed ? <Button variant="secondary" size="sm" icon={Phone} onClick={() => void reveal()}>Reveal contact</Button> : <Badge tone="warning" icon={ShieldAlert}>Contact revealed · logged</Badge>} />
            <CardBody>
              <KeyValue
                items={[
                  { label: 'Name', value: a.applicantName },
                  { label: 'Date of birth', value: formatDate(`${a.applicantDob}T00:00:00`) },
                  { label: 'Gender', value: a.gender },
                  { label: 'Mobile', value: revealed ? a.applicantMobile : maskMobile(a.applicantMobile) },
                  { label: 'Email', value: revealed ? a.applicantEmail : maskEmail(a.applicantEmail) },
                  { label: 'Address', value: `${a.address}, ${a.village}, ${a.taluk}, ${a.district}` },
                ]}
              />
              <SecurityNote className="mt-4">Contact details are masked by default. Revealing them is recorded in the audit log.</SecurityNote>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title={`${type.label} details`} description="As entered by the applicant." />
            <CardBody>
              <KeyValue items={type.fields.map((f) => ({ label: f.label, value: a.details[f.key] || '—' }))} columns={2} />
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Status and priority" />
            <CardBody className="space-y-5">
              <div className="flex flex-wrap items-center gap-2">
                <PriorityBadge priority={derivePriority(a, documents, now)} />
                {overdue && <Badge tone="danger">Overdue</Badge>}
                {a.priorityOverride && <Badge tone="violet">Set by officer</Badge>}
              </div>
              <PrioritySelect app={a} officer={officer} onDone={app.reload} />
              <KeyValue
                columns={2}
                items={[
                  { label: 'Reviewer', value: reviewer ? reviewer.name : 'Not assigned yet' },
                  { label: 'Review started', value: a.reviewStartedAt ? formatRelative(a.reviewStartedAt, now) : 'Not started' },
                ]}
              />
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Timeline" />
            <CardBody>
              <ApplicationTimeline app={a} delivery={delivery} compact />
            </CardBody>
          </Card>
        </div>

        {/* Right: document verification */}
        <section aria-labelledby="verify-title" className="min-w-0 space-y-6">
          <Card>
            <CardHeader id="verify-title" title="Document verification" description="Preview each file, check the AI findings, then accept or flag it." actions={<Badge tone={issues ? 'warning' : 'success'}>{issues ? `${issues} to review` : 'No AI issues'}</Badge>} />
            <CardBody className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-3 grid-cols-1">
                <Mini label="Average AI confidence" value={formatPercent(confidence)} />
                <Mini label="Documents accepted" value={`${documents.filter((d) => d.officerDecision === 'accepted').length} of ${documents.length}`} />
                <Mini label="Needs changes" value={String(documents.filter((d) => effectiveDocStatus(d) === 'needs_changes').length)} />
              </div>
              <AIDisclaimer />
              {documents.length === 0 && <EmptyState icon={FileCheck2} title="No documents on this file" />}
              {documents.map((d) => (
                <DocumentReviewItem key={d.id} doc={d} disabled={!open} onPreview={() => setPreviewDoc(d.id)} onDecide={(dec) => void decide(d, dec)} />
              ))}
            </CardBody>
          </Card>
        </section>
      </div>

      {/* Decision bar */}
      {open && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 px-4 py-3 shadow-[0_-8px_24px_rgba(11,31,58,0.08)] backdrop-blur lg:static lg:z-auto lg:mt-6 lg:rounded-xl lg:border lg:shadow-sm">
          <div className="mx-auto flex max-w-[1400px] flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
            <Button variant="danger" icon={XCircle} onClick={() => setDialog('reject')} disabled={busy}>
              Reject
            </Button>
            <Button variant="amber" icon={Flag} onClick={() => setDialog('changes')} disabled={busy}>
              Request changes
            </Button>
            <Button variant="success" icon={ThumbsUp} onClick={() => setDialog('approve')} disabled={busy || !allVerified || anyFlagged} title={!allVerified ? 'Accept every document first' : undefined}>
              Approve
            </Button>
          </div>
          {!allVerified && <p className="mx-auto mt-2 max-w-[1400px] text-xs text-slate-600 sm:text-right">Approval is available once every document is accepted or verified by AI.</p>}
        </div>
      )}

      <DocumentPreviewModal viewer={officer} documentId={previewDoc} open={!!previewDoc} onClose={() => setPreviewDoc(null)} title="Document preview" />

      <ApproveDialog
        open={dialog === 'approve'}
        onClose={() => setDialog(null)}
        busy={busy}
        applicationId={a.id}
        warningsAccepted={allVerified}
        onConfirm={async (remark) => {
          setBusy(true);
          try {
            await approveApplication(officer, a.id, { remark });
            afterDecision('Approved · sent for e-sign');
          } finally {
            setBusy(false);
          }
        }}
      />
      <ChangesDialog
        open={dialog === 'changes'}
        onClose={() => setDialog(null)}
        busy={busy}
        documents={documents}
        onConfirm={async (flagged, remark) => {
          setBusy(true);
          try {
            await requestChanges(officer, a.id, { flaggedDocumentIds: flagged, remark });
            afterDecision('Changes requested · citizen notified');
          } finally {
            setBusy(false);
          }
        }}
      />
      <RejectDialog
        open={dialog === 'reject'}
        onClose={() => setDialog(null)}
        busy={busy}
        onConfirm={async (reason, remark) => {
          setBusy(true);
          try {
            await rejectApplication(officer, a.id, { reason, remark });
            afterDecision('Application rejected · citizen notified');
          } finally {
            setBusy(false);
          }
        }}
      />
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 p-3">
      <p className="text-xs text-slate-600">{label}</p>
      <p className="mt-1 text-lg font-bold text-navy-900">{value}</p>
    </div>
  );
}

function PrioritySelect({ app, officer, onDone }: { app: Application; officer: ReturnType<typeof useCurrentUser>; onDone: () => void }) {
  const { toast } = useToast();
  return (
    <SelectField
      label="Priority"
      value={app.priorityOverride ?? ''}
      onChange={async (e) => {
        const v = e.target.value;
        try {
          await setPriority(officer, app.id, v === '' ? null : (v as 'high' | 'normal' | 'low'));
          onDone();
          toast({ title: 'Priority updated' });
        } catch (err) {
          toast({ tone: 'danger', title: 'Priority not saved', description: errorMessage(err) });
        }
      }}
      options={[
        { value: 'high', label: 'High' },
        { value: 'normal', label: 'Normal' },
        { value: 'low', label: 'Low' },
      ]}
      placeholder="Automatic (based on AI and due date)"
      hint="Overdue and flagged files are high priority automatically."
      disabled={app.status === 'rejected' || app.status === 'issued' || app.status === 'delivered'}
    />
  );
}

function DocumentReviewItem({ doc, disabled, onPreview, onDecide }: { doc: Document; disabled: boolean; onPreview: () => void; onDecide: (d: 'accepted' | null) => void }) {
  const [showAi, setShowAi] = useState(() => docHasPotentialIssue(doc.ai) || doc.ai?.verdict !== 'verified');
  const status = effectiveDocStatus(doc);
  const req = REQUIREMENTS[doc.requirementId];
  return (
    <div className={cn('rounded-xl border p-4', status === 'needs_changes' ? 'border-red-200 bg-red-50/30' : 'border-slate-200')}>
      <DocumentCard doc={doc} showAi={false}>
        <Button variant="secondary" size="sm" icon={Eye} onClick={onPreview}>
          Preview
        </Button>
        {status !== 'verified' && (
          <Button variant="success" size="sm" icon={FileCheck2} disabled={disabled} onClick={() => onDecide('accepted')}>
            Accept document
          </Button>
        )}
        {doc.officerDecision && (
          <Button variant="ghost" size="sm" icon={Undo2} disabled={disabled} onClick={() => onDecide(null)}>
            Clear decision
          </Button>
        )}
      </DocumentCard>
      <p className="mt-2 text-xs text-slate-600">Expected: {req.expectedType}. Detected: {doc.ai?.detectedType ?? '—'}.</p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <DocumentStatusBadge status={status} />
        <button type="button" onClick={() => setShowAi((v) => !v)} aria-expanded={showAi} className="text-xs font-semibold text-navy-800 underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-navy-500">
          {showAi ? 'Hide AI findings' : 'Show AI findings'}
        </button>
      </div>
      {showAi && (
        <div className="mt-4">
          <AIPanel ai={doc.ai} compact />
        </div>
      )}
      <ChecksSummary doc={doc} />
    </div>
  );
}

function ChecksSummary({ doc }: { doc: Document }) {
  const failing = doc.ai?.checks.filter((c) => c.status === 'fail' || c.status === 'warn') ?? [];
  if (failing.length === 0) return null;
  return (
    <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Checks needing attention">
      {failing.map((c) => {
        const Icon = CHECK_ICON[c.status].icon;
        return (
          <li key={c.key} className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-slate-800 ring-1 ring-slate-200">
            <Icon className={cn('size-3', CHECK_ICON[c.status].cls)} aria-hidden="true" />
            {c.label}
          </li>
        );
      })}
    </ul>
  );
}

