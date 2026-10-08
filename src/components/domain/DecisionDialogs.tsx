import { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Checkbox, SelectField, TextAreaField } from '../ui/Forms';
import { Alert } from '../ui/Feedback';
import { REJECTION_REASONS } from '../../services/applicationService';
import type { Document } from '../../types';
import { DocumentStatusBadge } from './Status';
import { effectiveDocStatus } from '../../utils/applicationRules';
import { errorMessage } from '../../services/api';

interface BaseProps {
  open: boolean;
  onClose: () => void;
  busy: boolean;
}

/** Final approval. Requires the officer to confirm the documents were checked against originals. */
export function ApproveDialog({ open, onClose, onConfirm, busy, applicationId, warningsAccepted }: BaseProps & { applicationId: string; warningsAccepted: boolean; onConfirm: (remark: string) => Promise<void> }) {
  const [confirmed, setConfirmed] = useState(false);
  const [remark, setRemark] = useState('');
  const [error, setError] = useState<string | null>(null);
  return (
    <Modal
      open={open}
      onClose={onClose}
      dismissible={!busy}
      size="md"
      title={`Approve ${applicationId}?`}
      description="Approval moves the file to the simulated e-sign step. The certificate is added to the citizen’s locker after signing."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant="success" disabled={!confirmed || !warningsAccepted} loading={busy} loadingLabel="Approving…" onClick={() => {
            setError(null);
            onConfirm(remark.trim()).catch((e: unknown) => setError(errorMessage(e)));
          }}>
            Confirm approval
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {!warningsAccepted && <Alert tone="warning" title="Accept or flag every warning first">Open each document with a warning and accept it, or request changes, before approving.</Alert>}
        <Checkbox id="approve-confirm" checked={confirmed} onChange={setConfirmed} label="I have verified these documents against the originals and the application details." />
        <TextAreaField label="Internal note (optional)" value={remark} onChange={(e) => setRemark(e.target.value)} hint="Stored in the audit trail. The citizen sees it only as a short note." rows={3} maxLength={400} />
        {error && <Alert tone="danger">{error}</Alert>}
        <p className="text-xs text-slate-500">The decision is recorded with your name, department and time. AI results are advisory; this decision is yours.</p>
      </div>
    </Modal>
  );
}

/** Request changes: the officer chooses which documents the citizen must correct and explains why. */
export function ChangesDialog({ open, onClose, onConfirm, busy, documents }: BaseProps & { documents: Document[]; onConfirm: (flagged: string[], remark: string) => Promise<void> }) {
  const [selected, setSelected] = useState<string[]>([]);
  const [remark, setRemark] = useState('');
  const [errors, setErrors] = useState<{ docs?: string; remark?: string; form?: string }>({});
  const toggle = (id: string) => setSelected((list) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]));
  const submit = async () => {
    const next: typeof errors = {};
    if (selected.length === 0) next.docs = 'Select at least one document that needs changes.';
    if (remark.trim().length < 15) next.remark = 'Explain what the citizen should correct (at least 15 characters).';
    setErrors(next);
    if (Object.keys(next).length) return;
    try {
      await onConfirm(selected, remark.trim());
    } catch (e) {
      setErrors({ form: errorMessage(e) });
    }
  };
  return (
    <Modal
      open={open}
      onClose={onClose}
      dismissible={!busy}
      title="Request changes"
      description="The citizen is notified with your reason. The application stays in the queue until the corrected document is uploaded."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant="amber" loading={busy} loadingLabel="Sending…" onClick={() => void submit()}>
            Request changes
          </Button>
        </>
      }
    >
      <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); void submit(); }} noValidate>
        <fieldset className="space-y-2">
          <legend className="mb-2 text-sm font-medium text-slate-800">Documents that need changes</legend>
          {documents.map((d) => (
            <div key={d.id} className="flex items-start justify-between gap-3 rounded-lg border border-slate-200 p-3">
              <Checkbox id={`flag-${d.id}`} checked={selected.includes(d.id)} onChange={() => toggle(d.id)} label={d.label} description={d.fileName} />
              <DocumentStatusBadge status={effectiveDocStatus(d)} />
            </div>
          ))}
          {errors.docs && <p role="alert" className="text-xs font-medium text-red-700">{errors.docs}</p>}
        </fieldset>
        <TextAreaField label="Reason for the citizen" value={remark} onChange={(e) => setRemark(e.target.value)} error={errors.remark} rows={4} maxLength={500} hint="Be specific. For example: “The address on the bill is cut off. Upload the full page.”" required />
        {errors.form && <Alert tone="danger">{errors.form}</Alert>}
      </form>
    </Modal>
  );
}

/** Rejection: choose a reason and explain. Rejection closes the file and notifies the citizen. */
export function RejectDialog({ open, onClose, onConfirm, busy }: BaseProps & { onConfirm: (reason: string, remark: string) => Promise<void> }) {
  const [reason, setReason] = useState('');
  const [remark, setRemark] = useState('');
  const [errors, setErrors] = useState<{ reason?: string; remark?: string; form?: string }>({});
  const submit = async () => {
    const next: typeof errors = {};
    if (!reason) next.reason = 'Choose a rejection reason.';
    if (remark.trim().length < 15) next.remark = 'Explain the decision (at least 15 characters).';
    setErrors(next);
    if (Object.keys(next).length) return;
    try {
      await onConfirm(reason, remark.trim());
    } catch (e) {
      setErrors({ form: errorMessage(e) });
    }
  };
  return (
    <Modal
      open={open}
      onClose={onClose}
      dismissible={!busy}
      title="Reject application"
      description="Rejection closes the file. The citizen is notified with this reason. This cannot be undone from the prototype."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant="danger" loading={busy} loadingLabel="Rejecting…" onClick={() => void submit()}>
            Confirm rejection
          </Button>
        </>
      }
    >
      <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); void submit(); }} noValidate>
        <SelectField label="Rejection reason" required value={reason} onChange={(e) => setReason(e.target.value)} error={errors.reason} placeholder="Select a reason" options={REJECTION_REASONS.map((r) => ({ value: r, label: r }))} />
        <TextAreaField label="Explanation for the citizen" value={remark} onChange={(e) => setRemark(e.target.value)} error={errors.remark} rows={4} maxLength={500} required />
        {errors.form && <Alert tone="danger">{errors.form}</Alert>}
      </form>
    </Modal>
  );
}
