import { useEffect, useId, useMemo, useRef, useState, type DragEvent } from 'react';
import { CloudUpload, Eye, FileSearch, RefreshCw, Trash2, Sparkles } from 'lucide-react';
import { Button } from '../ui/Button';
import { ProgressBar, Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import { Alert } from '../ui/Feedback';
import { MimeIcon, mimeLabel } from './DocumentReview';
import { FILE_LIMITS } from '../../utils/validation';
import { formatBytes } from '../../utils/format';
import { discardUpload, prepareUpload } from '../../services/documentService';
import { errorMessage } from '../../services/api';
import { createSampleFile, sampleFileName } from '../../utils/samples';
import type { MimeType, RequirementId } from '../../types';
import { REQUIREMENTS } from '../../config/certificateTypes';
import { cn } from '../../utils/cn';
import { randomCode } from '../../utils/random';

export interface UploadSlot {
  documentId: string;
  blobKey: string;
  fileName: string;
  fileSize: number;
  mimeType: MimeType;
  file: Blob;
}

interface UploaderProps {
  requirementId: RequirementId;
  applicantName: string;
  value: UploadSlot | null;
  onChange: (next: UploadSlot | null) => void;
  onUploadingChange?: (uploading: boolean) => void;
  error?: string;
}

/** Drag-and-drop or browse upload with progress, preview, replace and remove. Validates content, not just extension. */
export function DocumentUploader({ requirementId, applicantName, value, onChange, onUploadingChange, error }: UploaderProps) {
  const [progress, setProgress] = useState<number | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropId = useId();
  const req = REQUIREMENTS[requirementId];
  const busy = progress !== null;

  const previewUrl = useMemo(() => (value ? URL.createObjectURL(value.file) : null), [value]);
  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const accept = async (file: File) => {
    setLocalError(null);
    setProgress(8);
    onUploadingChange?.(true);
    const timer = window.setInterval(() => setProgress((p) => (p === null ? p : Math.min(92, p + 12))), 90);
    try {
      const prepared = await prepareUpload(file);
      window.clearInterval(timer);
      setProgress(100);
      if (value) await discardUpload(value.blobKey);
      const documentId = value?.documentId ?? `doc-u-${randomCode(10).toLowerCase()}`;
      onChange({ documentId, blobKey: prepared.blobKey, fileName: prepared.fileName, fileSize: prepared.fileSize, mimeType: prepared.mimeType, file });
    } catch (err) {
      window.clearInterval(timer);
      setLocalError(errorMessage(err));
    } finally {
      onUploadingChange?.(false);
      window.setTimeout(() => setProgress(null), 250);
    }
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void accept(file);
  };

  const remove = async () => {
    if (value) await discardUpload(value.blobKey);
    onChange(null);
    setLocalError(null);
  };

  const loadSample = async () => {
    setLocalError(null);
    try {
      const file = await createSampleFile(requirementId, applicantName);
      await accept(file);
    } catch (err) {
      setLocalError(errorMessage(err, 'Sample file could not be created in this browser.'));
    }
  };

  const message = localError ?? error;

  return (
    <div className="space-y-2">
      {!value ? (
        <div
          id={dropId}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={cn('flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-6 text-center transition-colors', dragging ? 'border-navy-600 bg-navy-50' : message ? 'border-red-400 bg-red-50/40' : 'border-slate-300 bg-slate-50 hover:border-navy-400')}
        >
          <span className="flex size-11 items-center justify-center rounded-full bg-white text-navy-700 shadow-sm">
            <CloudUpload className="size-6" aria-hidden="true" />
          </span>
          <p className="text-sm font-semibold text-navy-900">Drag and drop {req.label.toLowerCase()} here</p>
          <p className="text-xs text-slate-600">{FILE_LIMITS.label}</p>
          <div className="mt-1 flex flex-wrap justify-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => inputRef.current?.click()} disabled={busy}>
              Browse files
            </Button>
            <Button variant="ghost" size="sm" icon={Sparkles} onClick={() => void loadSample()} disabled={busy}>
              Use a sample file
            </Button>
          </div>
          <input
            ref={inputRef}
            id={`${dropId}-input`}
            type="file"
            accept={FILE_LIMITS.acceptAttr}
            aria-label={`Choose file for ${req.label}`}
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void accept(file);
              e.target.value = '';
            }}
          />
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-navy-50">
              <MimeIcon mimeType={value.mimeType} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-navy-900" title={value.fileName}>
                {value.fileName}
              </p>
              <p className="mt-0.5 text-xs text-slate-600">
                {mimeLabel(value.mimeType)} · {formatBytes(value.fileSize)}
              </p>
              <div className="mt-2">
                <Badge tone="success">Uploaded · content checked</Badge>
              </div>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" icon={Eye} onClick={() => setPreviewOpen(true)}>
              Preview
            </Button>
            <Button variant="secondary" size="sm" icon={RefreshCw} onClick={() => inputRef.current?.click()} disabled={busy}>
              Replace
            </Button>
            <Button variant="ghost" size="sm" icon={Trash2} onClick={() => void remove()} className="text-red-800 hover:bg-red-50">
              Remove
            </Button>
            <input ref={inputRef} type="file" accept={FILE_LIMITS.acceptAttr} aria-label={`Replace file for ${req.label}`} className="sr-only" onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void accept(file);
              e.target.value = '';
            }} />
          </div>
        </div>
      )}
      {busy && progress !== null && (
        <div className="space-y-1" aria-live="polite">
          <div className="flex items-center justify-between text-xs text-slate-600">
            <span>Uploading and checking content…</span>
            <span className="tabular-nums">{progress}%</span>
          </div>
          <ProgressBar value={progress} label={`Uploading ${req.label}`} />
        </div>
      )}
      {message && (
        <p role="alert" className="text-xs font-medium text-red-700">
          {message}
        </p>
      )}
      <p className="flex items-center gap-1.5 text-xs text-slate-500">
        <FileSearch className="size-3.5" aria-hidden="true" /> Expected: {req.hint} Sample file name: {sampleFileName(requirementId)}
      </p>
      <Modal open={previewOpen} onClose={() => setPreviewOpen(false)} title={`Preview · ${req.label}`} description={value?.fileName} size="xl">
        {value && previewUrl && value.mimeType === 'application/pdf' && <iframe title={`Preview of ${value.fileName}`} src={previewUrl} className="h-[65vh] w-full rounded-lg border border-slate-200" />}
        {value && previewUrl && value.mimeType !== 'application/pdf' && (
          <div className="flex justify-center rounded-lg bg-slate-100 p-3">
            <img src={previewUrl} alt={`Preview of ${value.fileName}`} className="max-h-[65vh] max-w-full rounded object-contain" />
          </div>
        )}
        <Alert tone="info" className="mt-4">
          Preview is shown only in this browser. Files are kept locally in the prototype until you submit.
        </Alert>
      </Modal>
    </div>
  );
}
