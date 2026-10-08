import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CheckCircle2, Send } from 'lucide-react';
import { useCurrentUser } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { usePageTitle } from '../../hooks/usePageTitle';
import { PageHeader } from '../../components/layout/PageHeader';
import { Button } from '../../components/ui/Button';
import { Alert } from '../../components/ui/Feedback';
import { Card, CardBody } from '../../components/ui/Card';
import { createApplication, type NewApplicationInput } from '../../services/applicationService';
import { runAIValidation, discardUpload } from '../../services/documentService';
import { getBlob } from '../../services/blobStore';
import { errorMessage, isServiceError } from '../../services/api';
import { CERTIFICATE_TYPES, REQUIREMENTS } from '../../config/certificateTypes';
import { validateDetails, validatePersonal, type PersonalForm } from '../../utils/applicationValidation';
import type { Application, CertificateTypeId, RequirementId, AIValidationResult } from '../../types';
import type { FieldErrors } from '../../utils/validation';
import { STEP_LABELS, clearDraft, loadDraft, saveDraft, type Draft } from './apply/draft';
import { StepAI, StepCertificate, StepDetails, StepDocuments, StepPersonal, StepReview, StepSuccess, applySlot, blobCache } from './apply/steps';
import { cn } from '../../utils/cn';

type StepErrors = Record<string, string>;

export default function ApplyPage() {
  usePageTitle('Apply for a certificate');
  const user = useCurrentUser();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [draft, setDraft] = useState<Draft>(() => loadDraft(user));
  const [errors, setErrors] = useState<StepErrors>({});
  const [personalErrors, setPersonalErrors] = useState<FieldErrors<keyof PersonalForm>>({});
  const [detailErrors, setDetailErrors] = useState<FieldErrors<string>>({});
  const [uploading, setUploading] = useState(false);
  const [aiState, setAiState] = useState<{ running: boolean; index: number; label: string; doc: RequirementId | null }>({ running: false, index: -1, label: '', doc: null });
  const [submitted, setSubmitted] = useState<Application | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [focusReq, setFocusReq] = useState<RequirementId | null>(null);
  const runningRef = useRef(false);
  const headingRef = useRef<HTMLDivElement>(null);

  const type = draft.certificateType as CertificateTypeId | '';
  const requirements = useMemo(() => (type ? CERTIFICATE_TYPES[type].requirements : []), [type]);

  // Persist the draft (without file contents) for this tab.
  useEffect(() => {
    if (!submitted) saveDraft(user, draft);
  }, [draft, submitted, user]);

  // Restore uploaded file contents after a reload; drop any upload whose file is gone.
  useEffect(() => {
    let active = true;
    const initial = loadDraft(user);
    (async () => {
      const missing: RequirementId[] = [];
      for (const [req, u] of Object.entries(initial.uploads) as Array<[RequirementId, NonNullable<Draft['uploads'][RequirementId]>]>) {
        if (blobCache.has(u.blobKey)) continue;
        const blob = await getBlob(u.blobKey);
        if (blob) blobCache.set(u.blobKey, blob);
        else missing.push(req);
      }
      if (!active) return;
      if (missing.length > 0) {
        setDraft((d) => missing.reduce((acc, r) => applySlot(acc, r, null), d));
        toast({ tone: 'warning', title: 'Some files were not restored', description: 'Please upload them again.' });
      }
    })();
    return () => {
      active = false;
    };
  }, [user, toast]);

  const setStep = (step: number) => {
    setErrors({});
    setPersonalErrors({});
    setDetailErrors({});
    setDraft((d) => ({ ...d, step }));
    window.setTimeout(() => headingRef.current?.querySelector('h2')?.focus({ preventScroll: false }), 30);
  };

  const runAi = async (list: RequirementId[], current: Draft) => {
    if (runningRef.current || list.length === 0) return;
    runningRef.current = true;
    await Promise.resolve();
    setAiState({ running: true, index: 0, label: 'Starting checks', doc: list[0] ?? null });
    const results: Partial<Record<RequirementId, AIValidationResult>> = {};
    try {
      await Promise.all(
        list.map(async (r) => {
          const u = current.uploads[r];
          if (!u) return;
          const ai = await runAIValidation(
            {
              documentId: u.documentId,
              applicationId: null,
              requirementId: r,
              certificateType: current.certificateType as CertificateTypeId,
              fileName: u.fileName,
              fileSize: u.fileSize,
              mimeType: u.mimeType,
              applicantName: current.personal.name,
              applicantDob: current.personal.dob,
              applicantAddress: current.personal.address,
              details: current.details,
            },
            (index, label) => setAiState((s) => (index >= s.index ? { running: true, index, label, doc: r } : s)),
          );
          results[r] = ai;
        }),
      );
      setDraft((d) => ({ ...d, ai: { ...d.ai, ...results } }));
    } catch (err) {
      toast({ tone: 'danger', title: 'AI check could not finish', description: errorMessage(err) });
    } finally {
      runningRef.current = false;
      setAiState({ running: false, index: -1, label: '', doc: null });
    }
  };

  const validateStep = (step: number): boolean => {
    if (step === 0) {
      if (!draft.certificateType) {
        setErrors({ certificateType: 'Choose the certificate you need to continue.' });
        return false;
      }
      return true;
    }
    if (step === 1) {
      const e = validatePersonal(draft.personal);
      setPersonalErrors(e);
      return Object.keys(e).length === 0;
    }
    if (step === 2) {
      const e = validateDetails(type as CertificateTypeId, draft.details);
      setDetailErrors(e);
      return Object.keys(e).length === 0;
    }
    if (step === 3) {
      const e: StepErrors = {};
      for (const r of requirements) if (!draft.uploads[r]) e[r] = `Upload the ${REQUIREMENTS[r].label.toLowerCase()} to continue.`;
      setErrors(e);
      return Object.keys(e).length === 0;
    }
    if (step === 4) {
      const flagged = requirements.filter((r) => draft.ai[r]?.verdict === 'needs_changes');
      if (flagged.length > 0) {
        setErrors({ ai: 'Fix or upload again the documents that need changes before continuing.' });
        return false;
      }
      if (requirements.some((r) => !draft.ai[r])) {
        setErrors({ ai: 'Run the AI pre-check first, then continue.' });
        return false;
      }
      return true;
    }
    if (step === 5) {
      if (!draft.declared) {
        setErrors({ declared: 'Confirm the declaration to submit.' });
        return false;
      }
      return true;
    }
    return true;
  };

  const next = () => {
    if (!validateStep(draft.step)) return;
    const target = Math.min(draft.step + 1, STEP_LABELS.length - 1);
    setStep(target);
    // Starting the AI pre-check from the navigation event (not an effect) keeps the flow explicit.
    if (target === 4) void runAi(requirements.filter((r) => draft.uploads[r] && !draft.ai[r]), draft);
  };

  const back = () => setStep(Math.max(0, draft.step - 1));

  const fixDocument = (r: RequirementId) => {
    setFocusReq(r);
    setStep(3);
    window.setTimeout(() => document.getElementById(`slot-${r}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' }), 80);
  };

  const uploadAgain = async (r: RequirementId) => {
    const u = draft.uploads[r];
    if (u) await discardUpload(u.blobKey);
    setDraft((d) => applySlot(d, r, null));
    setFocusReq(r);
    setStep(3);
  };

  const submit = async () => {
    if (!validateStep(5)) return;
    if (!type) return;
    setSubmitting(true);
    try {
      const documents: NewApplicationInput['documents'] = requirements.map((r) => {
        const u = draft.uploads[r]!;
        return { documentId: u.documentId, requirementId: r, fileName: u.fileName, fileSize: u.fileSize, mimeType: u.mimeType, blobKey: u.blobKey, ai: draft.ai[r]! };
      });
      const created = await createApplication(user, { certificateType: type, personal: draft.personal, details: draft.details, documents, deliveryRequested: draft.deliveryRequested, declared: draft.declared });
      clearDraft();
      setSubmitted(created);
      toast({ title: 'Application submitted', description: `Your Application ID is ${created.id}.` });
    } catch (err) {
      if (isServiceError(err) && err.fieldErrors) {
        const fe = err.fieldErrors as Record<string, string>;
        if (fe.declared) setErrors({ declared: fe.declared });
        if (Object.keys(fe).some((k) => k in draft.personal)) setPersonalErrors(fe as FieldErrors<keyof PersonalForm>);
        if (Object.keys(fe).some((k) => !(k in draft.personal) && k !== 'declared')) setDetailErrors(fe);
        setStep(Object.keys(fe).some((k) => k in draft.personal) ? 1 : Object.keys(fe).some((k) => k !== 'declared') ? 2 : 5);
      }
      if (isServiceError(err) && err.message.toLowerCase().includes('needs')) setStep(4);
      toast({ tone: 'danger', title: 'Submission failed', description: errorMessage(err) });
    } finally {
      setSubmitting(false);
    }
  };

  const flaggedCount = requirements.filter((r) => draft.ai[r]?.verdict === 'needs_changes').length;

  if (submitted) {
    return (
      <div className="mx-auto max-w-2xl py-4">
        <StepSuccess applicationId={submitted.id} onTrack={() => navigate(`/citizen/applications/${submitted.id}`)} onList={() => navigate('/citizen/applications')} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Apply for a certificate" description="Six short steps. Your progress is saved in this tab until you submit." id="apply-title" />
      <div className="grid gap-6 lg:grid-cols-[15rem_minmax(0,1fr)] grid-cols-1">
        <nav aria-label="Application steps" className="relative min-w-0">
          <ol className="relative -mx-1 flex gap-2 overflow-x-auto px-1 pb-1 lg:mx-0 lg:flex-col lg:overflow-visible">
            {STEP_LABELS.map((label, i) => {
              const done = i < draft.step;
              const current = i === draft.step;
              return (
                <li key={label} className="shrink-0 lg:shrink">
                  <button
                    type="button"
                    disabled={!done}
                    aria-current={current ? 'step' : undefined}
                    onClick={() => done && setStep(i)}
                    className={cn('flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left text-sm transition-colors', current ? 'border-navy-700 bg-navy-900 text-white' : done ? 'border-slate-200 bg-white text-navy-900 hover:border-navy-400' : 'border-transparent text-slate-500', !done && !current && 'cursor-default')}
                  >
                    <span className={cn('flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold', current ? 'bg-amber-300 text-navy-950' : done ? 'bg-gov-600 text-white' : 'bg-slate-200 text-slate-700')}>
                      {done ? <CheckCircle2 className="size-4" aria-hidden="true" /> : i + 1}
                    </span>
                    <span className="whitespace-nowrap font-medium">{label}</span>
                    <span className="sr-only">{done ? ' (completed)' : current ? ' (current step)' : ''}</span>
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>

        <Card className="min-w-0">
          <CardBody className="space-y-6 p-5 sm:p-8">
            <div ref={headingRef} className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Step {draft.step + 1} of {STEP_LABELS.length} · {STEP_LABELS[draft.step]}
            </div>
            {draft.step === 0 && <StepCertificate value={draft.certificateType} onChange={(v) => setDraft((d) => ({ ...d, certificateType: v }))} error={errors.certificateType} />}
            {draft.step === 1 && <StepPersonal value={draft.personal} onChange={(v) => setDraft((d) => ({ ...d, personal: v }))} errors={personalErrors} user={user} />}
            {draft.step === 2 && type && <StepDetails type={type} value={draft.details} onChange={(v) => setDraft((d) => ({ ...d, details: v }))} errors={detailErrors} />}
            {draft.step === 3 && type && <StepDocuments draft={draft} user={user} setDraft={setDraft} focusRequirement={focusReq} errors={errors} onUploadingChange={setUploading} />}
            {draft.step === 4 && type && <StepAI draft={draft} running={aiState.running} progress={aiState.running ? { index: aiState.index, label: aiState.label, doc: aiState.doc } : null} onRun={() => { const reset = { ...draft, ai: {} }; setDraft(reset); void runAi(requirements.filter((r) => draft.uploads[r]), reset); }} onFix={fixDocument} onUploadAgain={(r) => void uploadAgain(r)} user={user} />}
            {draft.step === 5 && type && <StepReview draft={draft} onDelivery={(v) => setDraft((d) => ({ ...d, deliveryRequested: v }))} onDeclare={(v) => setDraft((d) => ({ ...d, declared: v }))} declareError={errors.declared} onEdit={(s) => setStep(s)} user={user} />}

            {draft.step === 4 && flaggedCount > 0 && <Alert tone="danger" title="Application needs changes">Fix or re-upload {flaggedCount === 1 ? 'the flagged document' : `the ${flaggedCount} flagged documents`} to continue.</Alert>}
            {errors.ai && draft.step === 4 && flaggedCount === 0 && <Alert tone="info">{errors.ai}</Alert>}
            {draft.step === 3 && uploading && <Alert tone="info">Hold on while your file finishes uploading.</Alert>}

            <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
              <Button variant="secondary" icon={ArrowLeft} onClick={back} disabled={draft.step === 0 || submitting}>
                Back
              </Button>
              {draft.step < 5 ? (
                <Button
                  iconRight={ArrowRight}
                  onClick={next}
                  disabled={(draft.step === 3 && uploading) || (draft.step === 4 && (aiState.running || flaggedCount > 0)) || submitting}
                  title={draft.step === 4 && flaggedCount > 0 ? 'Fix the documents that need changes to continue' : undefined}
                >
                  Continue
                </Button>
              ) : (
                <Button icon={Send} loading={submitting} loadingLabel="Submitting…" onClick={() => void submit()}>
                  Submit application
                </Button>
              )}
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

export type { PersonalForm };
