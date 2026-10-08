import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Eye, Route, Wrench, Upload, Truck, Lock, FileText, Info } from 'lucide-react';
import { useCurrentUser } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useQuery } from '../../hooks/useQuery';
import { useAppState } from '../../hooks/useAppState';
import { usePageTitle } from '../../hooks/usePageTitle';
import { useNow } from '../../hooks/useNow';
import { getApplication } from '../../services/applicationService';
import { listDocuments, replaceDocument, discardUpload } from '../../services/documentService';
import { getDeliveryForApplication } from '../../services/deliveryService';
import { errorMessage, isServiceError } from '../../services/api';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card, CardBody, CardHeader, KeyValue } from '../../components/ui/Card';
import { Button, ButtonLink } from '../../components/ui/Button';
import { Alert, ErrorState, LoadingBlock, EmptyState } from '../../components/ui/Feedback';
import { Badge } from '../../components/ui/Badge';
import { ApplicationStatusBadge, DocumentStatusBadge } from '../../components/domain/Status';
import { ApplicationTimeline } from '../../components/domain/Timeline';
import { DocumentCard, DocumentPreviewModal } from '../../components/domain/DocumentReview';
import { DocumentUploader, type UploadSlot } from '../../components/domain/Uploader';
import { DeliveryTimeline } from '../../components/domain/Delivery';
import { ChannelChips } from '../../components/domain/Notifications';
import { SecurityNote } from '../../components/domain/Notices';
import { REQUIREMENTS, CERTIFICATE_TYPES } from '../../config/certificateTypes';
import { effectiveDocStatus } from '../../utils/applicationRules';
import { formatDate, formatDateTime, formatRelative } from '../../utils/format';
import { AI_STAGES } from '../../services/documentService';
import type { Application, Delivery, Document, RequirementId } from '../../types';
import { blobCache } from './apply/steps';
import { ChangeStageNote } from './ChangeStageNote';

export default function CitizenApplicationDetailPage() {
  const { id = '' } = useParams();
  const user = useCurrentUser();
  const { toast } = useToast();
  const now = useNow(30_000);
  const app = useQuery(() => getApplication(user, id), [id, user.id]);
  const docs = useQuery(() => listDocuments(user, id), [id, user.id]);
  const delivery = useQuery<Delivery | null>(() => getDeliveryForApplication(user, id), [id, user.id]);
  const dept = useAppState((s) => s.departments);
  const allNotifications = useAppState((s) => s.notifications);
  const notifications = useMemo(() => allNotifications.filter((n) => n.applicationId === id && n.recipientId === user.id).slice(0, 6), [allNotifications, id, user.id]);
  const [previewDoc, setPreviewDoc] = useState<string | null>(null);
  const [replacing, setReplacing] = useState<{ docId: string; slot: UploadSlot | null } | null>(null);
  const [replaceState, setReplaceState] = useState<{ busy: boolean; label: string; index: number }>({ busy: false, label: '', index: 0 });

  usePageTitle(id ? `Application ${id}` : 'Application');

  if (app.error !== undefined) {
    const notFound = isServiceError(app.error) && app.error.code === 'NOT_FOUND';
    return (
      <div className="space-y-6">
        <PageHeader title="Application not found" breadcrumbs={[{ label: 'My applications', to: '/citizen/applications' }, { label: id }]} id="not-found-title" />
        {notFound ? <EmptyState icon={FileText} title="We could not find that application" description="Check the Application ID, or return to your list." action={<ButtonLink to="/citizen/applications">Back to my applications</ButtonLink>} /> : <ErrorState error={app.error} onRetry={app.reload} />}
      </div>
    );
  }
  if (app.loading || !app.data) return <LoadingBlock variant="detail" label="Loading application" />;

  const a: Application = app.data;
  const type = CERTIFICATE_TYPES[a.certificateType];
  const deptName = dept.find((d) => d.id === a.departmentId)?.name ?? 'Department';
  const flagged = (docs.data ?? []).filter((d) => effectiveDocStatus(d) === 'needs_changes');
  const canReplace = a.status === 'changes_requested';

  const startReplace = (doc: Document) => setReplacing({ docId: doc.id, slot: null });

  const cancelReplace = async () => {
    if (replacing?.slot) await discardUpload(replacing.slot.blobKey);
    setReplacing(null);
  };

  const confirmReplace = async () => {
    if (!replacing?.slot) return;
    const slot = replacing.slot;
    setReplaceState({ busy: true, label: AI_STAGES[0]!, index: 0 });
    try {
      blobCache.set(slot.blobKey, slot.file);
      await replaceDocument(
        user,
        a.id,
        replacing.docId,
        { blobKey: slot.blobKey, fileName: slot.fileName, fileSize: slot.fileSize, mimeType: slot.mimeType },
        (index, label) => setReplaceState({ busy: true, label, index }),
      );
      toast({ title: 'Document received', description: 'AI re-check finished. Your application is updated.' });
      setReplacing(null);
      app.reload();
      docs.reload();
    } catch (err) {
      toast({ tone: 'danger', title: 'Upload not accepted', description: errorMessage(err) });
    } finally {
      setReplaceState({ busy: false, label: '', index: 0 });
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: 'My applications', to: '/citizen/applications' }, { label: a.id }]}
        title={`${type.label}`}
        description={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="font-mono font-semibold text-navy-900">{a.id}</span>
            <span>·</span>
            <span>Submitted {formatDate(a.submittedAt)}</span>
            <span>·</span>
            <span>{deptName}</span>
          </span>
        }
        actions={
          <>
            <ApplicationStatusBadge status={a.status} />
            <ButtonLink to={`/citizen/track?app=${a.id}`} variant="secondary" icon={Route}>
              Where is my file?
            </ButtonLink>
          </>
        }
        id="app-title"
      />

      {a.status === 'changes_requested' && (
        <Alert tone="warning" title="Action needed: a document needs changes">
          <p>{a.officerRemark}</p>
          <p className="mt-1 text-xs">Replace the flagged {flagged.length === 1 ? 'document' : 'documents'} below. The AI re-checks the new file, and the application returns to the officer queue.</p>
        </Alert>
      )}
      {a.status === 'rejected' && (
        <Alert tone="danger" title="This application was rejected">
          <p>{a.rejectionReason}</p>
          <p className="mt-1 text-xs">You can apply again with corrected information. This record stays in your history.</p>
        </Alert>
      )}
      {a.status === 'esign_pending' && (
        <Alert tone="info" title="Approved · awaiting digital signature (simulated)">
          The certificate will appear in your Certificate Locker after signing{a.esignAt ? ` (expected ${formatRelative(a.esignAt, now)})` : ''}.
        </Alert>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] grid-cols-1">
        <div className="min-w-0 space-y-6">
          <Card>
            <CardHeader title="Timeline" description="Each stage with its timestamp, department, action and description. Select Details on a stage for the full record." />
            <CardBody>
              <ApplicationTimeline app={a} delivery={delivery.data ?? null} />
            </CardBody>
          </Card>

          {delivery.data && (
            <Card>
              <CardHeader title="Physical copy delivery" description="Courier progress for your certificate." />
              <CardBody>
                <DeliveryTimeline delivery={delivery.data} />
              </CardBody>
            </Card>
          )}

          <Card>
            <CardHeader title="Your documents" description="Replace a flagged document, or preview what you uploaded." />
            <CardBody className="space-y-4">
              {docs.error !== undefined && <ErrorState error={docs.error} onRetry={docs.reload} />}
              {docs.loading && <LoadingBlock variant="list" label="Loading documents" />}
              {(docs.data ?? []).map((d) => {
                const status = effectiveDocStatus(d);
                const isFlagged = status === 'needs_changes';
                return (
                  <DocumentCard key={d.id} doc={d} showAi={false}>
                    <Button variant="secondary" size="sm" icon={Eye} onClick={() => setPreviewDoc(d.id)}>
                      Preview
                    </Button>
                    {canReplace && isFlagged && replacing?.docId !== d.id && (
                      <Button variant="amber" size="sm" icon={Wrench} onClick={() => startReplace(d)}>
                        Replace document
                      </Button>
                    )}
                    {d.ai && <Badge tone="neutral">AI: {d.ai.verdict.replace('_', ' ')}</Badge>}
                    {d.officerDecision === 'accepted' && <DocumentStatusBadge status="verified" />}
                  </DocumentCard>
                );
              })}
              {replacing && (
                <div className="space-y-3 rounded-xl border-2 border-amber-300 bg-amber-50/50 p-4">
                  <p className="text-sm font-semibold text-navy-900">Upload the corrected {REQUIREMENTS[(docs.data ?? []).find((d) => d.id === replacing.docId)?.requirementId as RequirementId]?.label.toLowerCase()}</p>
                  <DocumentUploader
                    requirementId={(docs.data ?? []).find((d) => d.id === replacing.docId)?.requirementId as RequirementId}
                    applicantName={user.name}
                    value={replacing.slot}
                    onChange={(slot) => setReplacing((r) => (r ? { ...r, slot } : r))}
                  />
                  {replaceState.busy && (
                    <Alert tone="info" title="Checking the new file">
                      {replaceState.label}
                    </Alert>
                  )}
                  <div className="flex flex-wrap justify-end gap-2">
                    <Button variant="secondary" onClick={() => void cancelReplace()} disabled={replaceState.busy}>
                      Cancel
                    </Button>
                    <Button icon={Upload} disabled={!replacing.slot || replaceState.busy} loading={replaceState.busy} loadingLabel="Re-checking…" onClick={() => void confirmReplace()}>
                      Submit corrected document
                    </Button>
                  </div>
                </div>
              )}
            </CardBody>
          </Card>
        </div>

        <aside className="min-w-0 space-y-6" aria-label="Application summary">
          <Card>
            <CardHeader title="Summary" />
            <CardBody>
              <KeyValue
                columns={1}
                items={[
                  { label: 'Current stage', value: <ChangeStageNote app={a} delivery={delivery.data ?? null} /> },
                  { label: 'Decision expected by', value: formatDate(a.expectedBy) },
                  { label: 'Last updated', value: formatDateTime(a.updatedAt) },
                  { label: 'Courier', value: a.deliveryRequested ? 'Physical copy requested' : 'Digital only' },
                  { label: 'Certificate number', value: a.certificateId ? <Link to={`/citizen/locker?cert=${a.certificateId}`} className="font-semibold text-navy-800 underline-offset-2 hover:underline">Open in locker</Link> : 'Not issued yet' },
                ]}
              />
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Recent notifications" description="Updates about this application." actions={<Link to="/citizen/notifications" className="text-xs font-semibold text-navy-800 hover:underline">All notifications</Link>} />
            <CardBody className="space-y-3">
              {notifications.length === 0 && <p className="text-sm text-slate-600">No notifications for this application yet.</p>}
              {notifications.map((n) => (
                <div key={n.id} className="space-y-1.5 rounded-lg border border-slate-200 p-3">
                  <p className="text-sm font-semibold text-navy-900">{n.title}</p>
                  <p className="text-xs text-slate-600">{n.body}</p>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[11px] text-slate-500">{formatRelative(n.createdAt, now)}</span>
                    <ChannelChips channels={n.channels} />
                  </div>
                </div>
              ))}
            </CardBody>
          </Card>
          <Card>
            <CardBody className="space-y-3">
              <SecurityNote>Only you and the {deptName.replace(' Department', '')} officers can see this file. Every view is recorded.</SecurityNote>
              <p className="flex items-start gap-2 text-xs text-slate-600">
                <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" /> AI results are advisory. The authorized officer makes the final decision.
              </p>
              <div className="flex flex-wrap gap-2 text-xs text-slate-600">
                <Truck className="size-3.5" aria-hidden="true" /> <span>{delivery.data ? `Tracking ${delivery.data.trackingId}` : 'No courier shipment yet.'}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <Lock className="size-3.5" aria-hidden="true" /> Prototype record · fictional data
              </div>
            </CardBody>
          </Card>
        </aside>
      </div>

      <DocumentPreviewModal viewer={user} documentId={previewDoc} open={!!previewDoc} onClose={() => setPreviewDoc(null)} title="Document preview" />
    </div>
  );
}
