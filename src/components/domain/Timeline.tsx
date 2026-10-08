import { useMemo, useState } from 'react';
import { Check, CircleDot, Clock, Lock, Minus, TriangleAlert, CircleX } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Badge } from '../ui/Badge';
import { computeSteps, type StageStep, type StepState } from '../../utils/stages';
import type { Application, Delivery, TimelineEvent } from '../../types';
import { formatDateTime, formatTime } from '../../utils/format';
import { cn } from '../../utils/cn';

const STATE_STYLE: Record<StepState, { ring: string; bg: string; text: string; label: string }> = {
  complete: { ring: 'ring-gov-600', bg: 'bg-gov-600 text-white', text: 'text-gov-700', label: 'Completed' },
  current: { ring: 'ring-navy-700', bg: 'bg-navy-800 text-white', text: 'text-navy-900', label: 'In progress' },
  blocked: { ring: 'ring-amber-500', bg: 'bg-amber-400 text-navy-950', text: 'text-amber-900', label: 'Waiting on citizen' },
  upcoming: { ring: 'ring-slate-300', bg: 'bg-white text-slate-500', text: 'text-slate-600', label: 'Not started' },
  skipped: { ring: 'ring-slate-200', bg: 'bg-slate-100 text-slate-400', text: 'text-slate-500', label: 'Not applicable' },
};

function StepIcon({ state }: { state: StepState }) {
  if (state === 'complete') return <Check className="size-4" aria-hidden="true" />;
  if (state === 'current') return <CircleDot className="size-4" aria-hidden="true" />;
  if (state === 'blocked') return <TriangleAlert className="size-4" aria-hidden="true" />;
  if (state === 'skipped') return <Minus className="size-4" aria-hidden="true" />;
  return <Clock className="size-4" aria-hidden="true" />;
}

/** Horizontal six-stage tracker. Scrolls on phones instead of squeezing labels. */
export function StageProgress({ steps, onSelect, selected }: { steps: StageStep[]; onSelect?: (step: StageStep) => void; selected?: string }) {
  return (
    <div className="-mx-1 overflow-x-auto px-1 pb-1">
      <ol className="flex min-w-[560px] items-start gap-0" aria-label="Application stages">
        {steps.map((step, index) => {
          const style = STATE_STYLE[step.state];
          const isLast = index === steps.length - 1;
          const content = (
            <>
              <span className={cn('flex size-10 items-center justify-center rounded-full ring-4 ring-white shadow-sm', style.bg, style.ring.replace('ring-', 'ring-'))}>
                <StepIcon state={step.state} />
              </span>
              <span className={cn('mt-2 text-center text-xs font-semibold leading-tight', style.text)}>{step.label}</span>
              <span className="mt-0.5 text-center text-[11px] text-slate-500">{step.state === 'skipped' ? 'N/A' : step.at ? formatTime(step.at) : style.label}</span>
            </>
          );
          return (
            <li key={step.id} className="flex min-w-0 flex-1 flex-col items-center" aria-current={step.state === 'current' ? 'step' : undefined}>
              <div className="flex w-full items-center">
                <span className={cn('h-0.5 flex-1', index === 0 ? 'bg-transparent' : steps[index - 1]!.state === 'complete' ? 'bg-gov-600' : 'bg-slate-300')} aria-hidden="true" />
                {onSelect ? (
                  <button
                    type="button"
                    onClick={() => onSelect(step)}
                    aria-label={`${step.label}: ${style.label}. Show details`}
                    aria-pressed={selected === step.id}
                    className={cn('flex flex-col items-center rounded-lg px-1 py-1 focus-visible:outline-2 focus-visible:outline-navy-500', selected === step.id && 'bg-navy-50')}
                  >
                    {content}
                  </button>
                ) : (
                  <div className="flex flex-col items-center px-1 py-1">{content}</div>
                )}
                <span className={cn('h-0.5 flex-1', isLast ? 'bg-transparent' : step.state === 'complete' ? 'bg-gov-600' : 'bg-slate-300')} aria-hidden="true" />
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/** Vertical timeline grouped by stage. Clicking a stage opens its full detail. */
export function ApplicationTimeline({ app, delivery, compact = false }: { app: Application; delivery: Delivery | null; compact?: boolean }) {
  const steps = useMemo(() => computeSteps(app, delivery), [app, delivery]);
  const [detail, setDetail] = useState<StageStep | null>(null);
  return (
    <div className="space-y-6">
      <StageProgress steps={steps} onSelect={setDetail} selected={detail?.id} />
      <ol className="relative space-y-0">
        {steps.map((step, index) => {
          const style = STATE_STYLE[step.state];
          const last = index === steps.length - 1;
          return (
            <li key={step.id} className="relative flex gap-4 pb-6 last:pb-0">
              {!last && <span className={cn('absolute left-[17px] top-9 bottom-0 w-0.5', step.state === 'complete' ? 'bg-gov-600' : 'bg-slate-200')} aria-hidden="true" />}
              <span className={cn('relative z-10 flex size-9 shrink-0 items-center justify-center rounded-full ring-4 ring-white', style.bg)} aria-hidden="true">
                <StepIcon state={step.state} />
              </span>
              <div className="min-w-0 flex-1 pt-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className={cn('text-sm font-semibold', style.text)}>{step.label}</h3>
                  <span className="text-xs text-slate-500">{style.label}</span>
                  {step.events.length > 0 && (
                    <button type="button" onClick={() => setDetail(step)} className="text-xs font-semibold text-navy-700 underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-navy-500">
                      Details
                    </button>
                  )}
                </div>
                {!compact && <p className="mt-0.5 text-xs text-slate-600">{step.description}</p>}
                <ul className="mt-2 space-y-2">
                  {(compact ? step.events.slice(-1) : step.events).map((e) => (
                    <EventRow key={e.id} event={e} />
                  ))}
                </ul>
                {step.state === 'upcoming' && step.events.length === 0 && <p className="mt-1 flex items-center gap-1 text-xs text-slate-500"><Lock className="size-3.5" aria-hidden="true" /> Waits for the previous stage.</p>}
              </div>
            </li>
          );
        })}
      </ol>
      <Modal open={!!detail} onClose={() => setDetail(null)} title={detail ? `${detail.label} stage` : ''} description={detail?.description} size="md">
        {detail && (
          <div className="space-y-4">
            {detail.events.length === 0 ? (
              <p className="text-sm text-slate-600">This stage has not started yet.</p>
            ) : (
              <ul className="space-y-4">
                {detail.events.map((e) => (
                  <li key={e.id} className="rounded-xl border border-slate-200 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-navy-900">{e.action}</p>
                      <Badge tone={e.tone === 'success' ? 'success' : e.tone === 'warning' ? 'warning' : e.tone === 'danger' ? 'danger' : 'info'}>{formatDateTime(e.at)}</Badge>
                    </div>
                    <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                      <div>
                        <dt className="text-xs uppercase tracking-wide text-slate-500">Department</dt>
                        <dd className="text-slate-800">{e.department ?? 'CertiTrack (self-service)'}</dd>
                      </div>
                      <div>
                        <dt className="text-xs uppercase tracking-wide text-slate-500">By</dt>
                        <dd className="text-slate-800">{e.actorName}</dd>
                      </div>
                    </dl>
                    <p className="mt-3 text-sm text-slate-700">{e.description}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

function EventRow({ event }: { event: TimelineEvent }) {
  const icon = event.tone === 'danger' ? CircleX : event.tone === 'warning' ? TriangleAlert : Check;
  const Icon = icon;
  const color = event.tone === 'danger' ? 'text-red-700' : event.tone === 'warning' ? 'text-amber-700' : event.tone === 'success' ? 'text-gov-700' : 'text-navy-700';
  return (
    <li className="flex items-start gap-2 text-sm">
      <Icon className={cn('mt-0.5 size-4 shrink-0', color)} aria-hidden="true" />
      <span className="min-w-0">
        <span className="font-medium text-slate-900">{event.action}</span>
        <span className="text-slate-500"> · {formatDateTime(event.at)}</span>
        {event.department && <span className="block text-xs text-slate-500">{event.department} · {event.actorName}</span>}
        {!event.department && <span className="block text-xs text-slate-500">{event.actorName}</span>}
      </span>
    </li>
  );
}
