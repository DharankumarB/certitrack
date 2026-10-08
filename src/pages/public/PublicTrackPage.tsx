import { useState, type FormEvent } from 'react';
import { CheckCircle2, Circle, CircleDot, Clock, Minus, TriangleAlert, Route } from 'lucide-react';
import { usePageTitle } from '../../hooks/usePageTitle';
import { Button } from '../../components/ui/Button';
import { TextField } from '../../components/ui/Forms';
import { Alert } from '../../components/ui/Feedback';
import { Card, CardBody } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { publicTrack } from '../../services/applicationService';
import { errorMessage, isServiceError } from '../../services/api';
import type { PublicTrackResult } from '../../types';
import { formatDate, formatDateTime } from '../../utils/format';
import { WORKFLOW_STAGES } from '../../config/workflow';
import { cn } from '../../utils/cn';
import { PageHeader } from '../../components/layout/PageHeader';

const STATE_ICON = { complete: CheckCircle2, current: CircleDot, blocked: TriangleAlert, upcoming: Circle, skipped: Minus } as const;

export default function PublicTrackPage() {
  usePageTitle('Track an application');
  const [applicationId, setApplicationId] = useState('');
  const [mobile, setMobile] = useState('');
  const [errors, setErrors] = useState<{ applicationId?: string; mobile?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [result, setResult] = useState<PublicTrackResult | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setFormError(null);
    setErrors({});
    try {
      setResult(await publicTrack({ applicationId, mobile }));
    } catch (err) {
      setResult(null);
      if (isServiceError(err) && err.fieldErrors) setErrors(err.fieldErrors as typeof errors);
      setFormError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 md:py-12 lg:px-8">
      <PageHeader title="Track an application" description="Enter your Application ID and the last four digits of your registered mobile number. This shows the current stage and next step, without signing in." id="track-title" />
      <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] grid-cols-1">
        <Card className="self-start">
          <CardBody className="space-y-5">
            {formError && <Alert tone="danger">{formError}</Alert>}
            <form onSubmit={submit} noValidate className="space-y-5">
              <TextField label="Application ID" placeholder="APP-10294" value={applicationId} onChange={(e) => setApplicationId(e.target.value)} error={errors.applicationId} required autoComplete="off" autoCapitalize="characters" />
              <TextField label="Last 4 digits of registered mobile" inputMode="numeric" maxLength={10} placeholder="0001" value={mobile} onChange={(e) => setMobile(e.target.value)} error={errors.mobile} required autoComplete="off" />
              <Button type="submit" fullWidth size="lg" icon={Route} loading={busy} loadingLabel="Checking…">
                Track application
              </Button>
            </form>
            <p className="text-xs text-slate-500">Enter your application reference and the mobile number used when submitting it.</p>
          </CardBody>
        </Card>

        <section aria-live="polite" aria-label="Tracking result" className="min-w-0">
          {!result && <Card><CardBody className="py-10 text-center text-sm text-slate-600">Your status will appear here. Nothing is shown until both details match.</CardBody></Card>}
          {result && (
            <Card>
              <CardBody className="space-y-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{result.applicationId}</p>
                    <h2 className="text-lg font-semibold text-navy-900">{result.certificateLabel}</h2>
                    <p className="text-sm text-slate-600">{result.departmentName}</p>
                  </div>
                  <Badge tone="info">{result.statusLabel}</Badge>
                </div>
                <dl className="grid gap-3 text-sm sm:grid-cols-3 grid-cols-1">
                  <div>
                    <dt className="text-xs text-slate-500">Submitted</dt>
                    <dd className="font-medium">{formatDate(result.submittedAt)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">Decision expected by</dt>
                    <dd className="font-medium">{formatDate(result.expectedBy)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">Last updated</dt>
                    <dd className="font-medium">{formatDateTime(result.lastUpdated)}</dd>
                  </div>
                </dl>
                <div>
                  <h3 className="text-sm font-semibold text-navy-900">Where is my file?</h3>
                  <p className="mt-1 text-sm text-slate-700">Current stage: <span className="font-semibold">{result.stageLabel}</span></p>
                  <ol className="mt-4 space-y-3">
                    {result.stages.map((s, i) => {
                      const Icon = STATE_ICON[s.state];
                      return (
                        <li key={s.label} className={cn('flex items-center gap-3 text-sm', s.state === 'upcoming' || s.state === 'skipped' ? 'text-slate-500' : 'text-slate-900')}>
                          <Icon className={cn('size-5 shrink-0', s.state === 'complete' ? 'text-gov-700' : s.state === 'current' ? 'text-navy-800' : s.state === 'blocked' ? 'text-amber-700' : 'text-slate-400')} aria-hidden="true" />
                          <span className="font-medium">{WORKFLOW_STAGES[i]?.label ?? s.label}</span>
                          <span className="ml-auto text-xs">{stateText(s.state)}</span>
                        </li>
                      );
                    })}
                  </ol>
                </div>
                <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-700">
                  <p className="flex items-center gap-2 font-semibold text-navy-900"><Clock className="size-4" aria-hidden="true" /> What happens next</p>
                  <p className="mt-1">{nextText(result.stageLabel)}</p>
                </div>
                <p className="text-xs text-slate-500">For the full timeline, document checks and notifications, sign in to your citizen account.</p>
              </CardBody>
            </Card>
          )}
        </section>
      </div>
    </div>
  );
}

function stateText(state: PublicTrackResult['stages'][number]['state']): string {
  return { complete: 'Completed', current: 'In progress', blocked: 'Waiting on you', upcoming: 'Not started', skipped: 'Not applicable' }[state];
}

function nextText(stage: string): string {
  if (stage.toLowerCase().includes('ai')) return 'AI pre-check is complete for this stage. An officer will review the file next.';
  if (stage === 'Review') return 'An officer in the department is reviewing the documents. You will be notified of the decision.';
  if (stage === 'Apply') return 'The application is in the system. Check back for the AI pre-check result.';
  if (stage === 'e-Sign') return 'The certificate is being digitally signed. It will appear in your Certificate Locker.';
  if (stage === 'Issued') return 'The certificate is in your locker. Physical delivery, if requested, is on its way.';
  return 'This application has reached its final stage.';
}
