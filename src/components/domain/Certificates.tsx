import { useId, useState } from 'react';
import { Check, Copy, Download, Link2, ShieldCheck, ShieldX, Eye, Share2, Stamp } from 'lucide-react';
import type { Certificate, User } from '../../types';
import { CERTIFICATE_TYPES } from '../../config/certificateTypes';
import { formatDate } from '../../utils/format';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Card, CardBody, KeyValue } from '../ui/Card';
import { Modal } from '../ui/Modal';
import { Checkbox, TextField } from '../ui/Forms';
import { Alert } from '../ui/Feedback';
import { IntegrationBadge } from '../ui/IntegrationBadge';
import { cn } from '../../utils/cn';
import { createShareLink, verifyCertificate, type VerificationResult } from '../../services/certificateService';
import { errorMessage } from '../../services/api';
import { useToast } from '../../context/ToastContext';

/** Prototype QR placeholder. Not a scannable code; the verification code is printed beside it. */
function QrPlaceholder({ code }: { code: string }) {
  const cells = Array.from({ length: 49 }, (_, i) => ((i * 7 + code.charCodeAt(i % code.length)) % 3 === 0 ? 1 : 0));
  return (
    <div className="flex flex-col items-center gap-1" aria-label="QR code placeholder (not scannable in this prototype)">
      <svg viewBox="0 0 7 7" className="size-24 rounded bg-white p-1 ring-1 ring-slate-300" aria-hidden="true">
        {cells.map((v, i) => (v ? <rect key={i} x={i % 7} y={Math.floor(i / 7)} width="1" height="1" className="fill-navy-900" /> : null))}
      </svg>
      <span className="text-[10px] text-slate-500">QR placeholder</span>
    </div>
  );
}

/** An official-looking certificate layout. Clearly marked as a prototype with no legal validity. */
export function CertificateDocument({ cert }: { cert: Certificate }) {
  const def = CERTIFICATE_TYPES[cert.certificateType];
  return (
    <div className="relative overflow-hidden rounded-xl border-2 border-navy-800 bg-[#fffdf6] p-5 shadow-inner sm:p-8" data-testid="certificate-document">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <span className="-rotate-12 select-none text-center text-3xl font-black uppercase tracking-[0.3em] text-navy-900/[0.06] sm:text-5xl">Prototype · Demo only</span>
      </div>
      <div className="relative">
        <div className="flex flex-col items-center gap-2 border-b border-navy-800/30 pb-4 text-center">
          <svg viewBox="0 0 80 80" className="size-16 text-navy-800" aria-hidden="true">
            <circle cx="40" cy="40" r="37" fill="none" stroke="currentColor" strokeWidth="2.5" />
            <circle cx="40" cy="40" r="30" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="2 3" />
            <path d="M26 42l9 9 19-19" fill="none" stroke="#b45309" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-navy-800">Government certificate · CertiTrack prototype</p>
          <h3 className="font-serif text-xl font-bold text-navy-900 sm:text-2xl">{def.label.toUpperCase()}</h3>
          <p className="text-xs text-slate-600">{cert.authority}</p>
        </div>
        <div className="mt-5 grid gap-x-8 gap-y-4 text-sm sm:grid-cols-2 grid-cols-1">
          <Field label="Certificate number" value={cert.certificateNumber} mono />
          <Field label="Applicant name" value={cert.applicantName} />
          <Field label="Date of birth" value={formatDate(`${cert.applicantDob}T00:00:00`)} />
          <Field label="Father / spouse name" value={cert.parentOrSpouseName} />
          <Field label="Address" value={`${cert.address}, ${cert.district}`} />
          <Field label="Date of issue" value={formatDate(cert.issuedAt)} />
          <Field label="Valid until" value={cert.validUntil ? formatDate(cert.validUntil) : 'Valid until revoked'} />
          <Field label="Application ID" value={cert.applicationId} mono />
        </div>
        <div className="mt-6 flex flex-col items-start justify-between gap-4 border-t border-navy-800/30 pt-4 sm:flex-row sm:items-end">
          <div className="space-y-2 text-xs text-slate-700">
            <p className="flex items-center gap-1.5 font-semibold text-navy-900">
              <Stamp className="size-4" aria-hidden="true" /> Digital signature indicator
            </p>
            <p>
              Signatory: {cert.signatory}
              <br />
              Algorithm: {cert.signatureAlgorithm}
              <br />
              Signed: {formatDate(cert.signedAt)}
            </p>
            <p className="font-mono text-[11px] text-slate-600">Verification code: {cert.verificationCode}</p>
            <div className="pt-1">
              <IntegrationBadge kind="simulated" />
            </div>
          </div>
          <QrPlaceholder code={cert.verificationCode} />
        </div>
        <p className="mt-5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-center text-xs font-semibold text-amber-950">
          Prototype certificate — for demonstration only. It has no legal validity.
        </p>
      </div>
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className={cn('break-words font-medium text-slate-900', mono && 'font-mono text-xs sm:text-sm')}>{value}</p>
    </div>
  );
}

export function CertificateCard({ cert, onView, onDownload, onShare, onVerify }: { cert: Certificate; onView: () => void; onDownload: () => void; onShare: () => void; onVerify: () => void }) {
  const def = CERTIFICATE_TYPES[cert.certificateType];
  return (
    <Card className="flex flex-col overflow-hidden">
      <div className="flex items-center justify-between gap-3 bg-navy-900 px-5 py-4 text-white">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wider text-amber-300">{def.shortLabel}</p>
          <h3 className="truncate text-base font-semibold">{def.label}</h3>
        </div>
        <Badge tone={cert.status === 'active' ? 'success' : 'danger'} icon={cert.status === 'active' ? ShieldCheck : ShieldX}>
          {cert.status === 'active' ? 'Active' : 'Revoked'}
        </Badge>
      </div>
      <CardBody className="flex flex-1 flex-col gap-4">
        <KeyValue
          columns={1}
          items={[
            { label: 'Certificate number', value: <span className="font-mono text-xs sm:text-sm">{cert.certificateNumber}</span> },
            { label: 'Issued', value: formatDate(cert.issuedAt) },
            { label: 'Valid until', value: cert.validUntil ? formatDate(cert.validUntil) : 'Until revoked' },
            { label: 'Delivery', value: cert.deliveryRequested ? 'Physical copy requested' : 'Digital only' },
          ]}
        />
        <div className="mt-auto grid grid-cols-2 gap-2 pt-2">
          <Button variant="secondary" size="sm" icon={Eye} onClick={onView}>
            View
          </Button>
          <Button variant="secondary" size="sm" icon={Download} onClick={onDownload}>
            Download
          </Button>
          <Button variant="secondary" size="sm" icon={Share2} onClick={onShare}>
            Share
          </Button>
          <Button variant="secondary" size="sm" icon={ShieldCheck} onClick={onVerify}>
            Verify
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}

export function ShareModal({ viewer, cert, open, onClose }: { viewer: User; cert: Certificate | null; open: boolean; onClose: () => void }) {
  const [showName, setShowName] = useState(false);
  const [link, setLink] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  const inputId = useId();

  const close = () => {
    setLink(null);
    setShowName(false);
    setError(null);
    setCopied(false);
    onClose();
  };

  if (!cert) return null;
  const generate = async () => {
    setBusy(true);
    setError(null);
    try {
      setLink(await createShareLink(viewer, cert.id, showName));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };
  const copy = async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      toast({ title: 'Link copied', description: 'Share it only with the person who needs to verify this certificate.' });
    } catch {
      toast({ tone: 'warning', title: 'Copy blocked by the browser', description: 'Select the link text and copy it manually.' });
    }
  };
  return (
    <Modal open={open} onClose={close} title="Share verification link" description={`${cert.certificateNumber} · anyone with the link can confirm the certificate status.`} size="md">
      <div className="space-y-5">
        <Alert tone="info" title="You choose what is shown">The link shows the certificate type, number, issue date and status. Your name appears only if you tick the box below.</Alert>
        <Checkbox id={`${inputId}-name`} checked={showName} onChange={setShowName} label="Show my name on the verification page" description="Consent is recorded in the audit log when you create the link." />
        {!link && (
          <Button onClick={() => void generate()} loading={busy} loadingLabel="Creating link…" icon={Link2}>
            Create verification link
          </Button>
        )}
        {error && <Alert tone="danger">{error}</Alert>}
        {link && (
          <div className="space-y-3">
            <TextField id={`${inputId}-link`} label="Verification link" value={link} readOnly onFocus={(e) => e.currentTarget.select()} />
            <div className="flex flex-wrap gap-2">
              <Button icon={copied ? Check : Copy} onClick={() => void copy()}>
                {copied ? 'Copied' : 'Copy link'}
              </Button>
              <Button variant="secondary" onClick={() => setLink(null)}>
                Create another
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

export function VerifyModal({ open, onClose, initialCode }: { open: boolean; onClose: () => void; initialCode: string }) {
  const [code, setCode] = useState(initialCode);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    setCode(initialCode);
    setResult(null);
    setError(null);
    onClose();
  };

  const run = async () => {
    setBusy(true);
    setError(null);
    try {
      setResult(await verifyCertificate(code, false));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={close} title="Verify a certificate" description="Checks the verification code against the CertiTrack prototype registry." size="md">
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (code.trim()) void run();
        }}
      >
        <TextField label="Verification code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="VRF-XXXX-XXXX" hint="Printed on the certificate beside the QR placeholder." autoComplete="off" spellCheck={false} />
        <Button type="submit" loading={busy} loadingLabel="Checking…" disabled={!code.trim()} icon={ShieldCheck}>
          Check code
        </Button>
      </form>
      {error && <Alert tone="danger" className="mt-4">{error}</Alert>}
      {result && <VerificationOutcome result={result} />}
      <p className="mt-5 text-xs text-slate-500">Prototype check only. A result here is not a legal verification.</p>
    </Modal>
  );
}

export function VerificationOutcome({ result }: { result: VerificationResult }) {
  if (result.state === 'not_found') {
    return <Alert tone="danger" title="No matching certificate" className="mt-4">The code was not found in the prototype registry. Check the characters and try again.</Alert>;
  }
  const valid = result.state === 'valid';
  return (
    <div className={cn('mt-4 rounded-xl border p-4', valid ? 'border-gov-100 bg-gov-50' : 'border-red-200 bg-red-50')} role="status">
      <p className={cn('flex items-center gap-2 text-sm font-semibold', valid ? 'text-gov-700' : 'text-red-800')}>
        {valid ? <ShieldCheck className="size-5" aria-hidden="true" /> : <ShieldX className="size-5" aria-hidden="true" />}
        {valid ? 'Found in the prototype registry: status active' : 'Found: this certificate is revoked'}
      </p>
      <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2 grid-cols-1">
        <div>
          <dt className="text-xs text-slate-600">Certificate</dt>
          <dd className="font-mono text-xs font-semibold text-slate-900">{result.certificateNumber}</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-600">Type</dt>
          <dd className="font-medium text-slate-900">{result.typeLabel}</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-600">Issued</dt>
          <dd className="font-medium text-slate-900">{formatDate(result.issuedAt)}</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-600">Applicant name</dt>
          <dd className="font-medium text-slate-900">{result.applicantName ?? 'Not shown (no consent given)'}</dd>
        </div>
      </dl>
      <p className="mt-3 text-xs text-slate-700">Prototype certificate for demonstration only. It has no legal validity.</p>
    </div>
  );
}

