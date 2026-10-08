import { Check, CheckCircle2, RefreshCw, Upload, Wrench, ShieldCheck, Sparkles, Loader } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { CERTIFICATE_TYPE_LIST, CERTIFICATE_TYPES, REQUIREMENTS } from '../../../config/certificateTypes';
import type { CertificateTypeId, RequirementId, User } from '../../../types';
import { GENDER_OPTIONS, DISTRICTS, DISTRICT_TALUKS } from '../../../config/geography';
import { SelectField, TextField, Checkbox, TextAreaField } from '../../../components/ui/Forms';
import { Card, CardBody, KeyValue } from '../../../components/ui/Card';
import { Badge, ProgressBar } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Alert } from '../../../components/ui/Feedback';
import { DocumentUploader, type UploadSlot } from '../../../components/domain/Uploader';
import { AIPanel } from '../../../components/domain/DocumentReview';
import { DocumentStatusBadge } from '../../../components/domain/Status';
import { AIDisclaimer } from '../../../components/domain/Notices';
import { IntegrationBadge } from '../../../components/ui/IntegrationBadge';
import type { PersonalForm } from '../../../utils/applicationValidation';
import type { FieldErrors } from '../../../utils/validation';
import { formatBytes, formatDateTime } from '../../../utils/format';
import { cn } from '../../../utils/cn';
import { AI_CHECK_ORDER } from '../../../services/aiEngine';
import type { Draft } from './draft';

export function StepCertificate({ value, onChange, error }: { value: CertificateTypeId | ''; onChange: (v: CertificateTypeId) => void; error?: string }) {
  return (
    <section aria-labelledby="step-cert-title" className="space-y-5">
      <div>
        <h2 id="step-cert-title" className="text-lg font-semibold text-navy-900">
          Which certificate do you need?
        </h2>
        <p className="text-sm text-slate-600">Each certificate has its own department, documents and service standard.</p>
      </div>
      <fieldset>
        <legend className="sr-only">Certificate type</legend>
        <div className="grid gap-4 md:grid-cols-3 grid-cols-1">
          {CERTIFICATE_TYPE_LIST.map((c) => {
            const selected = value === c.id;
            return (
              <label key={c.id} className={cn('relative flex cursor-pointer flex-col gap-3 rounded-xl border-2 bg-white p-5 transition-colors hover:border-navy-400', selected ? 'border-navy-800 ring-4 ring-navy-100' : 'border-slate-200')}>
                <input type="radio" name="certificate-type" value={c.id} checked={selected} onChange={() => onChange(c.id)} className="absolute left-4 top-4 size-5 accent-navy-800" />
                <span className="pl-8 font-semibold text-navy-900">{c.label}</span>
                <span className="text-sm text-slate-600">{c.description}</span>
                <span className="mt-auto flex flex-wrap gap-2 text-xs">
                  <Badge tone="neutral">{c.slaDays}-day standard</Badge>
                  <Badge tone="neutral">{c.validityMonths ? `Valid ${c.validityMonths} months` : 'Valid until revoked'}</Badge>
                </span>
              </label>
            );
          })}
        </div>
        {error && <p role="alert" className="mt-3 text-sm font-medium text-red-700">{error}</p>}
      </fieldset>
      {value && (
        <Alert tone="info" title="Documents you will need">
          <ul className="mt-1 list-disc space-y-0.5 pl-5">
            {CERTIFICATE_TYPES[value].requirements.map((r) => (
              <li key={r}>
                {REQUIREMENTS[r].label}: {REQUIREMENTS[r].hint}
              </li>
            ))}
          </ul>
        </Alert>
      )}
    </section>
  );
}

export function StepPersonal({ value, onChange, errors, user }: { value: PersonalForm; onChange: (v: PersonalForm) => void; errors: FieldErrors<keyof PersonalForm>; user: User }) {
  const set = <K extends keyof PersonalForm>(k: K, v: PersonalForm[K]) => onChange({ ...value, [k]: v });
  return (
    <section aria-labelledby="step-personal-title" className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="step-personal-title" className="text-lg font-semibold text-navy-900">
            Personal details
          </h2>
          <p className="text-sm text-slate-600">Pre-filled from your profile. Check each field and correct it if needed.</p>
        </div>
        <IntegrationBadge kind="simulated" />
      </div>
      <div className="grid gap-5 sm:grid-cols-2 grid-cols-1">
        <TextField label="Full name (as on your ID)" value={value.name} onChange={(e) => set('name', e.target.value)} error={errors.name} required autoComplete="name" />
        <TextField label="Date of birth" type="date" value={value.dob} onChange={(e) => set('dob', e.target.value)} error={errors.dob} required />
        <SelectField label="Gender" value={value.gender} onChange={(e) => set('gender', e.target.value)} error={errors.gender} required placeholder="Select" options={GENDER_OPTIONS.map((g) => ({ value: g, label: g }))} />
        <TextField label="Mobile number" inputMode="tel" value={value.mobile} onChange={(e) => set('mobile', e.target.value)} error={errors.mobile} required hint="10 digits. Used for SMS and WhatsApp previews." />
        <TextField label="Email" type="email" value={value.email} onChange={(e) => set('email', e.target.value)} error={errors.email} required />
        <TextField label="Village or town" value={value.village} onChange={(e) => set('village', e.target.value)} error={errors.village} required />
        <TextAreaField label="Address" value={value.address} onChange={(e) => set('address', e.target.value)} error={errors.address} required rows={2} wrapperClassName="sm:col-span-2" hint="As it appears on your address proof." />
        <SelectField label="District" value={value.district} onChange={(e) => onChange({ ...value, district: e.target.value, taluk: '' })} error={errors.district} required placeholder="Select district" options={DISTRICTS.map((d) => ({ value: d, label: d }))} />
        <SelectField label="Taluk" value={value.taluk} onChange={(e) => set('taluk', e.target.value)} error={errors.taluk} required placeholder={value.district ? 'Select taluk' : 'Choose a district first'} disabled={!value.district} options={(DISTRICT_TALUKS[value.district] ?? []).map((t) => ({ value: t, label: t }))} />
      </div>
      <p className="text-xs text-slate-500">Signed in as {user.name}. Changes here apply only to this application. Update your profile to change saved details.</p>
    </section>
  );
}

export function StepDetails({ type, value, onChange, errors }: { type: CertificateTypeId; value: Record<string, string>; onChange: (v: Record<string, string>) => void; errors: FieldErrors<string> }) {
  const def = CERTIFICATE_TYPES[type];
  const set = (k: string, v: string) => onChange({ ...value, [k]: v });
  return (
    <section aria-labelledby="step-details-title" className="space-y-5">
      <div>
        <h2 id="step-details-title" className="text-lg font-semibold text-navy-900">
          {def.label} details
        </h2>
        <p className="text-sm text-slate-600">These fields are specific to the {def.label.toLowerCase()}.</p>
      </div>
      <div className="grid gap-5 sm:grid-cols-2 grid-cols-1">
        {def.fields.map((f) => {
          const common = { label: f.label, value: value[f.key] ?? '', error: errors[f.key], required: f.required, hint: f.hint, id: `field-${f.key}`, onChange: (e: { target: { value: string } }) => set(f.key, e.target.value) };
          if (f.type === 'select') return <SelectField key={f.key} {...common} placeholder="Select" options={(f.options ?? []).map((o) => ({ value: o, label: o }))} />;
          if (f.type === 'number') return <TextField key={f.key} {...common} type="number" inputMode="numeric" min={f.min} max={f.max} />;
          if (f.type === 'date') return <TextField key={f.key} {...common} type="date" />;
          return <TextField key={f.key} {...common} type="text" maxLength={f.maxLength} />;
        })}
      </div>
    </section>
  );
}

export function StepDocuments({ draft, user, setDraft, focusRequirement, errors, onUploadingChange }: { draft: Draft; user: User; setDraft: (updater: (d: Draft) => Draft) => void; focusRequirement?: RequirementId | null; errors: FieldErrors<string>; onUploadingChange: (uploading: boolean) => void }) {
  const type = draft.certificateType as CertificateTypeId;
  const reqs = CERTIFICATE_TYPES[type].requirements;
  const uploaded = reqs.filter((r) => draft.uploads[r]).length;
  return (
    <section aria-labelledby="step-docs-title" className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="step-docs-title" className="text-lg font-semibold text-navy-900">
            Upload your documents
          </h2>
          <p className="text-sm text-slate-600">PDF, JPG or PNG. Up to 5 MB each. Files are checked by content, not only by name.</p>
        </div>
        <Badge tone={uploaded === reqs.length ? 'success' : 'neutral'}>
          {uploaded} of {reqs.length} uploaded
        </Badge>
      </div>
      <div className="grid gap-5 md:grid-cols-2 grid-cols-1">
        {reqs.map((r) => {
          return (
            <Card key={r} className={cn(focusRequirement === r && 'ring-4 ring-amber-200')} id={`slot-${r}`}>
              <CardBody className="space-y-3">
                <div>
                  <h3 className="text-sm font-semibold text-navy-900">{REQUIREMENTS[r].label}</h3>
                  <p className="text-xs text-slate-600">{REQUIREMENTS[r].hint}</p>
                </div>
                <DocumentUploader
                  requirementId={r}
                  applicantName={user.name}
                  value={draft.uploads[r] ? slotFromDraft(draft, r) : null}
                  onChange={(slot) => setDraft((d) => applySlot(d, r, slot))}
                  onUploadingChange={onUploadingChange}
                  error={errors[r]}
                />
              </CardBody>
            </Card>
          );
        })}
      </div>
    </section>
  );
}

export function slotFromDraft(draft: Draft, r: RequirementId): UploadSlot | null {
  const u = draft.uploads[r];
  if (!u) return null;
  return { documentId: u.documentId, blobKey: u.blobKey, fileName: u.fileName, fileSize: u.fileSize, mimeType: u.mimeType, file: blobCache.get(u.blobKey) ?? new Blob() };
}

/** In-memory copy of uploaded blobs for previews during the session (persisted copies live in IndexedDB). */
export const blobCache = new Map<string, Blob>();

export function applySlot(d: Draft, r: RequirementId, slot: UploadSlot | null): Draft {
  const uploads = { ...d.uploads };
  const ai = { ...d.ai };
  if (slot) {
    blobCache.set(slot.blobKey, slot.file);
    uploads[r] = { documentId: slot.documentId, blobKey: slot.blobKey, fileName: slot.fileName, fileSize: slot.fileSize, mimeType: slot.mimeType };
  } else {
    delete uploads[r];
  }
  delete ai[r];
  return { ...d, uploads, ai };
}

export function StepAI({ draft, running, progress, onRun, onFix, onUploadAgain, user }: { draft: Draft; running: boolean; progress: { index: number; label: string; doc: RequirementId | null } | null; onRun: () => void; onFix: (r: RequirementId) => void; onUploadAgain: (r: RequirementId) => void; user: User }) {
  const type = draft.certificateType as CertificateTypeId;
  const reqs = CERTIFICATE_TYPES[type].requirements;
  const results = reqs.map((r) => ({ r, ai: draft.ai[r] ?? null, uploaded: !!draft.uploads[r] }));
  const flagged = results.filter((x) => x.ai?.verdict === 'needs_changes');
  const warnings = results.filter((x) => x.ai?.verdict === 'warning');
  const done = results.every((x) => x.ai !== null);
  const total = AI_CHECK_ORDER.length;
  return (
    <section aria-labelledby="step-ai-title" className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="step-ai-title" className="flex items-center gap-2 text-lg font-semibold text-navy-900">
            <Sparkles className="size-5 text-navy-700" aria-hidden="true" /> AI pre-check
          </h2>
          <p className="text-sm text-slate-600">AI-assisted pre-verification runs nine checks on each document before you submit.</p>
        </div>
        <Button variant="secondary" size="sm" icon={RefreshCw} onClick={onRun} disabled={running}>
          Run check again
        </Button>
      </div>
      <AIDisclaimer />
      {running && progress && (
        <div className="space-y-2 rounded-xl border border-navy-100 bg-white p-4" role="status" aria-live="polite">
          <p className="flex items-center gap-2 text-sm font-semibold text-navy-900">
            <Loader className="size-4 animate-spin" aria-hidden="true" /> {progress.label}
            {progress.doc ? ` · ${REQUIREMENTS[progress.doc].label}` : ''}
          </p>
          <ProgressBar value={((progress.index + 1) / total) * 100} label="AI check progress" />
        </div>
      )}
      {!running && flagged.length > 0 && (
        <Alert tone="danger" title="Application needs changes">
          <p>One or more documents must be corrected before you can submit. Choose an option for each document below.</p>
        </Alert>
      )}
      {!running && flagged.length === 0 && warnings.length > 0 && (
        <Alert tone="warning" title="Submission allowed with warnings">
          An officer will double-check the flagged details. You can still correct a document if you prefer.
        </Alert>
      )}
      {!running && done && flagged.length === 0 && warnings.length === 0 && <Alert tone="success" title="All documents passed the pre-check">You can review and submit.</Alert>}
      <div className="space-y-4">
        {results.map(({ r, ai }) => (
          <Card key={r}>
            <CardBody className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-navy-900">{REQUIREMENTS[r].label}</h3>
                  <p className="truncate text-xs text-slate-600">{draft.uploads[r]?.fileName}</p>
                </div>
                {ai ? <DocumentStatusBadge status={ai.verdict} /> : <Badge tone="neutral" icon={Loader}>Waiting</Badge>}
              </div>
              {ai && <AIPanel ai={ai} compact />}
              {ai?.verdict === 'needs_changes' && (
                <div className="flex flex-wrap gap-2 rounded-lg bg-red-50 p-3">
                  <Button variant="danger" size="sm" icon={Wrench} onClick={() => onFix(r)}>
                    Fix document
                  </Button>
                  <Button variant="secondary" size="sm" icon={Upload} onClick={() => onUploadAgain(r)}>
                    Upload again
                  </Button>
                </div>
              )}
            </CardBody>
          </Card>
        ))}
      </div>
      <p className="text-xs text-slate-500">Checked for {user.name}. Final decision is made by the authorized department officer.</p>
    </section>
  );
}

export function StepReview({ draft, onDelivery, onDeclare, declareError, onEdit, user }: { draft: Draft; onDelivery: (v: boolean) => void; onDeclare: (v: boolean) => void; declareError?: string; onEdit: (step: number) => void; user: User }) {
  const type = draft.certificateType as CertificateTypeId;
  const def = CERTIFICATE_TYPES[type];
  const p = draft.personal;
  return (
    <section aria-labelledby="step-review-title" className="space-y-6">
      <div>
        <h2 id="step-review-title" className="text-lg font-semibold text-navy-900">
          Review and submit
        </h2>
        <p className="text-sm text-slate-600">Check everything before you submit. You can go back to any step.</p>
      </div>
      <ReviewBlock title={`Certificate · ${def.label}`} onEdit={() => onEdit(0)}>
        <KeyValue columns={2} items={[{ label: 'Department', value: def.label.replace(' Certificate', '') + ' Certificate Department' }, { label: 'Service standard', value: `${def.slaDays} days` }]} />
      </ReviewBlock>
      <ReviewBlock title="Personal details" onEdit={() => onEdit(1)}>
        <KeyValue columns={2} items={[{ label: 'Name', value: p.name }, { label: 'Date of birth', value: p.dob }, { label: 'Gender', value: p.gender }, { label: 'Mobile', value: p.mobile }, { label: 'Email', value: p.email }, { label: 'Address', value: `${p.address}, ${p.village}, ${p.taluk}, ${p.district}` }]} />
      </ReviewBlock>
      <ReviewBlock title={`${def.label} details`} onEdit={() => onEdit(2)}>
        <KeyValue columns={2} items={def.fields.map((f) => ({ label: f.label, value: draft.details[f.key] || '—' }))} />
      </ReviewBlock>
      <ReviewBlock title="Documents and AI pre-check" onEdit={() => onEdit(3)}>
        <ul className="divide-y divide-slate-100">
          {def.requirements.map((r) => {
            const u = draft.uploads[r];
            const ai = draft.ai[r];
            return (
              <li key={r} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                <div className="min-w-0">
                  <p className="font-medium text-slate-900">{REQUIREMENTS[r].label}</p>
                  <p className="truncate text-xs text-slate-600">{u ? `${u.fileName} · ${formatBytes(u.fileSize)}` : 'Missing'}</p>
                </div>
                {ai ? <DocumentStatusBadge status={ai.verdict} /> : <Badge tone="neutral">Not checked</Badge>}
              </li>
            );
          })}
        </ul>
        <p className="mt-3 flex items-center gap-2 text-xs text-slate-600">
          <ShieldCheck className="size-4 text-navy-700" aria-hidden="true" /> {AI_CHECK_ORDER.length} AI checks per document · AI-assisted pre-verification · Final decision is made by the authorized department officer.
        </p>
      </ReviewBlock>
      <Card>
        <CardBody className="space-y-5">
          <Checkbox id="delivery-request" checked={draft.deliveryRequested} onChange={onDelivery} label="Also send a physical copy by courier" description="Tracked from dispatch to delivery once the certificate is issued. Digital copy is always available in the locker." />
          <Checkbox id="declaration" checked={draft.declared} onChange={onDeclare} label="I confirm that the information provided is accurate." error={declareError} />
          <p className="text-xs text-slate-500">Declaring false information can lead to rejection and may have legal consequences in production. This prototype does not process real applications.</p>
        </CardBody>
      </Card>
      {user.role === 'citizen' && <p className="text-xs text-slate-500">Submitted by {user.name} at {formatDateTime(new Date())}.</p>}
    </section>
  );
}

function ReviewBlock({ title, onEdit, children }: { title: string; onEdit: () => void; children: React.ReactNode }) {
  return (
    <Card>
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
        <h3 className="text-sm font-semibold text-navy-900">{title}</h3>
        <Button variant="link" size="sm" onClick={onEdit} aria-label={`Edit ${title}`}>
          Edit
        </Button>
      </div>
      <CardBody>{children}</CardBody>
    </Card>
  );
}

export function StepSuccess({ applicationId, onTrack, onList }: { applicationId: string; onTrack: () => void; onList: () => void }) {
  const ref = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    ref.current?.focus();
  }, []);
  return (
    <Card className="overflow-hidden">
      <div className="bg-gov-600 px-6 py-8 text-center text-white sm:px-10">
        <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-white/15">
          <CheckCircle2 className="size-8" aria-hidden="true" />
        </span>
        <h2 ref={ref} tabIndex={-1} className="mt-4 text-2xl font-bold outline-none">
          Application submitted
        </h2>
        <p className="mt-1 text-sm text-white/90">Keep this Application ID to track progress.</p>
        <p className="mt-4 inline-block rounded-xl bg-white px-6 py-3 font-mono text-2xl font-bold tracking-wider text-navy-900" aria-label={`Application ID ${applicationId}`}>
          {applicationId}
        </p>
      </div>
      <CardBody className="space-y-5 text-center">
        <ul className="mx-auto max-w-md space-y-2 text-left text-sm text-slate-700">
          {['Your documents are in the officer queue.', 'You will see each stage with timestamps in your timeline.', 'You will be notified in-app. WhatsApp and e-mail are previews in this prototype.'].map((t) => (
            <li key={t} className="flex items-start gap-2">
              <Check className="mt-0.5 size-4 shrink-0 text-gov-700" aria-hidden="true" />
              {t}
            </li>
          ))}
        </ul>
        <div className="flex flex-col justify-center gap-3 sm:flex-row">
          <Button onClick={onTrack}>Track this application</Button>
          <Button variant="secondary" onClick={onList}>
            Go to my applications
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}
