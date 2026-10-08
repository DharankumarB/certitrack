import { useEffect, useState } from 'react';
import { Eye, FileImage, FileText, Info, ScanText, ShieldAlert } from 'lucide-react';
import type { AIValidationResult, Document, MimeType, User } from '../../types';
import { Modal } from '../ui/Modal';
import { Badge } from '../ui/Badge';
import { LoadingBlock, Alert, Skeleton } from '../ui/Feedback';
import { ProgressBar } from '../ui/Badge';
import { DocumentStatusBadge, CHECK_ICON } from './Status';
import { effectiveDocStatus } from '../../utils/applicationRules';
import { formatBytes, formatDateTime, formatPercent } from '../../utils/format';
import { AI_CHECK_ORDER, AI_ENGINE_ID } from '../../services/aiEngine';
import { getDocumentPreview, type DocumentPreview } from '../../services/documentService';
import { errorMessage } from '../../services/api';
import { cn } from '../../utils/cn';

export function MimeIcon({ mimeType, className }: { mimeType: MimeType; className?: string }) {
  const Icon = mimeType === 'application/pdf' ? FileText : FileImage;
  return <Icon className={cn('size-5 shrink-0 text-navy-700', className)} aria-hidden="true" />;
}

export function mimeLabel(mimeType: MimeType): string {
  return mimeType === 'application/pdf' ? 'PDF' : mimeType === 'image/png' ? 'PNG' : 'JPG';
}

export function DocumentCard({ doc, children, showAi = true }: { doc: Pick<Document, 'id' | 'label' | 'fileName' | 'fileSize' | 'mimeType' | 'version' | 'uploadedAt' | 'officerDecision' | 'officerRemark' | 'ai'>; children?: React.ReactNode; showAi?: boolean }) {
  const status = effectiveDocStatus(doc as Document);
  return (
    <article aria-labelledby={`${doc.id}-title`} className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="mt-0.5 flex size-10 items-center justify-center rounded-lg bg-navy-50">
            <MimeIcon mimeType={doc.mimeType} className="size-5" />
          </span>
          <div className="min-w-0">
            <h3 id={`${doc.id}-title`} className="text-sm font-semibold text-navy-900">
              {doc.label}
            </h3>
            <p className="mt-0.5 truncate text-xs text-slate-600" title={doc.fileName}>
              {doc.fileName}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              {mimeLabel(doc.mimeType)} · {formatBytes(doc.fileSize)} · v{doc.version} · uploaded {formatDateTime(doc.uploadedAt)}
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <DocumentStatusBadge status={status} />
          {showAi && doc.ai && <span className="text-xs text-slate-600">AI confidence {formatPercent(doc.ai.confidence)}</span>}
        </div>
      </div>
      {doc.officerRemark && (
        <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-950">
          <span className="font-semibold">Officer note: </span>
          {doc.officerRemark}
        </p>
      )}
      {children && <div className="mt-4 flex flex-wrap gap-2">{children}</div>}
    </article>
  );
}

export function DocumentPreviewModal({ viewer, documentId, open, onClose, title }: { viewer: User; documentId: string | null; open: boolean; onClose: () => void; title: string }) {
  return (
    <Modal open={open} onClose={onClose} title={title} description="Preview of the uploaded file. Only the applicant and the owning department can open it." size="xl">
      {open && documentId && <PreviewBody key={documentId} viewer={viewer} documentId={documentId} />}
    </Modal>
  );
}

function PreviewBody({ viewer, documentId }: { viewer: User; documentId: string }) {
  const [state, setState] = useState<{ loading: boolean; preview?: DocumentPreview; error?: unknown }>({ loading: true });
  useEffect(() => {
    let active = true;
    let objectUrl: string | null = null;
    getDocumentPreview(viewer, documentId)
      .then((preview) => {
        if (!active) {
          if (preview.kind === 'file') URL.revokeObjectURL(preview.url);
          return;
        }
        if (preview.kind === 'file') objectUrl = preview.url;
        setState({ loading: false, preview });
      })
      .catch((error: unknown) => {
        if (active) setState({ loading: false, error });
      });
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [documentId, viewer]);

  return (
    <>
      {state.loading && <LoadingBlock variant="chart" label="Opening document" />}
      {state.error !== undefined && <Alert tone="danger" title="Preview unavailable">{errorMessage(state.error)}</Alert>}
      {state.preview?.kind === 'file' && state.preview.mimeType === 'application/pdf' && (
        <iframe title={`Preview of ${state.preview.fileName}`} src={state.preview.url} className="h-[65vh] w-full rounded-lg border border-slate-200 bg-slate-100" />
      )}
      {state.preview?.kind === 'file' && state.preview.mimeType !== 'application/pdf' && (
        <div className="flex justify-center rounded-lg bg-slate-100 p-3">
          <img src={state.preview.url} alt={`Uploaded file: ${state.preview.fileName}`} className="max-h-[65vh] max-w-full rounded object-contain" />
        </div>
      )}
      {state.preview?.kind === 'missing' && <Alert tone="warning" title="File not stored in this browser">The file metadata is kept, but its contents are not available in this browser session. Ask the applicant to upload it again.</Alert>}
      {state.preview?.kind === 'simulated' && (
        <div className="space-y-3">
          <Alert tone="info" title="Simulated preview of a seeded demo document">This record was generated for the demo. The sheet below is rendered from its OCR fields, not from a real scan.</Alert>
          <SimulatedSheet doc={state.preview.document} />
        </div>
      )}
    </>
  );
}

/** Renders a seeded document as a paper-like sheet from its OCR fields. Blurs when unreadable. */
export function SimulatedSheet({ doc }: { doc: Document }) {
  const unreadable = doc.ai?.checks.some((c) => c.key === 'readability' && c.status === 'fail');
  return (
    <div className="mx-auto max-w-md rounded-lg border border-slate-300 bg-white p-6 shadow-inner" aria-label="Simulated document preview">
      <div className="flex items-center justify-between border-b-2 border-navy-800 pb-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-navy-800">{doc.label}</p>
          <p className="text-[10px] text-slate-500">{doc.fileName}</p>
        </div>
        <span className="rounded bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-900">DEMO</span>
      </div>
      <dl className={cn('mt-4 space-y-3 transition-[filter]', unreadable && 'blur-[3px] select-none')}>
        {doc.ai?.ocr.map((f) => (
          <div key={f.label} className="grid grid-cols-[9rem_1fr] gap-2 text-sm">
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{f.label}</dt>
            <dd className="font-medium text-slate-900">{f.value}</dd>
          </div>
        ))}
      </dl>
      {unreadable && <p className="mt-4 text-center text-xs font-semibold text-red-800">Text is blurred. OCR could not read this page.</p>}
      <div className="mt-6 flex items-end justify-between border-t border-dashed border-slate-300 pt-3 text-[10px] text-slate-500">
        <span>Simulated seal ▢</span>
        <span>Sample only · not an official record</span>
      </div>
    </div>
  );
}

export function AIPanel({ ai, compact = false }: { ai: AIValidationResult | null; compact?: boolean }) {
  if (!ai) return <Alert tone="info" title="AI pre-check pending">This document has not been checked yet.</Alert>;
  const checks = AI_CHECK_ORDER.map((key) => ai.checks.find((c) => c.key === key)).filter((c): c is NonNullable<typeof c> => Boolean(c));
  const passed = checks.filter((c) => c.status === 'pass').length;
  const applicable = checks.filter((c) => c.status !== 'na').length;
  const tone = ai.confidence >= 0.9 ? 'green' : ai.confidence >= 0.75 ? 'amber' : 'red';
  return (
    <section aria-labelledby="ai-panel-title" className="space-y-4">
      <div className="rounded-xl border border-navy-100 bg-navy-50/60 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 id="ai-panel-title" className="flex items-center gap-2 text-sm font-semibold text-navy-900">
            <ScanText className="size-4" aria-hidden="true" /> AI-assisted pre-verification
          </h3>
          <Badge tone="info">Decision support only</Badge>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center grid-cols-1">
          <div>
            <p className="text-xs text-slate-600">Confidence</p>
            <div className="mt-1 flex items-center gap-3">
              <div className="flex-1">
                <ProgressBar value={ai.confidence * 100} label={`AI confidence ${formatPercent(ai.confidence)}`} tone={tone === 'green' ? 'green' : tone === 'amber' ? 'amber' : 'red'} />
              </div>
              <span className="text-sm font-bold tabular-nums text-navy-900">{formatPercent(ai.confidence)}</span>
            </div>
          </div>
          <p className="text-sm text-slate-700">
            {passed} of {applicable} applicable checks passed
          </p>
        </div>
        <p className="mt-3 text-sm text-slate-800">
          <span className="font-semibold">Recommended next step: </span>
          {ai.recommendedAction}
        </p>
        {!compact && (
          <p className="mt-2 text-xs text-slate-500">
            Detected: {ai.detectedType} · Expected: {ai.expectedType} · Engine {AI_ENGINE_ID} · {formatDateTime(ai.runAt)}
          </p>
        )}
      </div>

      <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
        {checks.map((c) => {
          const style = CHECK_ICON[c.status];
          const Icon = style.icon;
          return (
            <li key={c.key} className="flex items-start gap-3 px-4 py-3">
              <Icon className={cn('mt-0.5 size-5 shrink-0', style.cls)} aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-900">
                  {c.label} <span className="ml-1 text-xs font-medium text-slate-600">· {style.label}</span>
                </p>
                <p className="text-sm text-slate-700">{c.detail}</p>
              </div>
            </li>
          );
        })}
      </ul>

      {ai.ocr.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white">
          <h4 className="flex items-center gap-2 border-b border-slate-100 px-4 py-3 text-sm font-semibold text-navy-900">
            <Eye className="size-4" aria-hidden="true" /> Extracted fields (OCR)
          </h4>
          <dl className="divide-y divide-slate-100">
            {ai.ocr.map((f) => (
              <div key={f.label} className="grid grid-cols-[minmax(0,8rem)_1fr_auto] items-center gap-3 px-4 py-2.5 text-sm">
                <dt className="text-slate-600">{f.label}</dt>
                <dd className="min-w-0 truncate font-medium text-slate-900">{f.value}</dd>
                <dd className="text-xs tabular-nums text-slate-500">{Math.round(f.confidence * 100)}%</dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      {ai.issues.length > 0 && (
        <div className="space-y-2">
          <h4 className="flex items-center gap-2 text-sm font-semibold text-navy-900">
            <ShieldAlert className="size-4" aria-hidden="true" /> Issues to review
          </h4>
          <ul className="space-y-2">
            {ai.issues.map((issue) => (
              <li key={`${issue.checkKey}-${issue.message}`} className={cn('rounded-lg border px-3 py-2 text-sm', issue.severity === 'critical' ? 'border-red-200 bg-red-50 text-red-950' : 'border-amber-200 bg-amber-50 text-amber-950')}>
                <p className="font-semibold">{issue.severity === 'critical' ? 'Needs changes' : 'Warning'}: {issue.message}</p>
                <p className="mt-0.5 text-xs">{issue.recommendation}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
      <p className="flex items-start gap-2 text-xs text-slate-600">
        <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
        AI provides decision support only. The authorized department officer makes the final decision.
      </p>
    </section>
  );
}

export function AiSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-24" />
      <Skeleton className="h-64" />
    </div>
  );
}
