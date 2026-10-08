import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import type { Application, Priority } from '../../types';
import { CERTIFICATE_TYPES } from '../../config/certificateTypes';
import { APPLICATION_STATUS_META } from '../../config/workflow';
import { formatDate, formatRelative } from '../../utils/format';
import { computeSteps, currentStage } from '../../utils/stages';
import { useNow } from '../../hooks/useNow';
import { ApplicationStatusBadge, PriorityBadge } from './Status';
import { cn } from '../../utils/cn';
import type { Delivery } from '../../types';

export function certLabel(app: Application): string {
  return CERTIFICATE_TYPES[app.certificateType].label;
}

export function StageText({ app, delivery }: { app: Application; delivery?: Delivery | null }) {
  const steps = computeSteps(app, delivery ?? null);
  const stage = currentStage(steps);
  return <span className="whitespace-nowrap">{stage.label}</span>;
}

/** Mobile card for an application. The whole card is a link, and status is shown as text plus icon. */
export function ApplicationCard({ app, to, priority, extra }: { app: Application; to: string; priority?: Priority; extra?: React.ReactNode }) {
  const now = useNow(60_000);
  return (
    <article className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <Link to={to} className="block rounded-xl p-4 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-navy-500">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-mono text-xs font-semibold text-navy-700">{app.id}</p>
            <h3 className="truncate text-sm font-semibold text-navy-900">{certLabel(app)}</h3>
            <p className="truncate text-xs text-slate-600">{app.applicantName}</p>
          </div>
          <ChevronRight className="mt-1 size-5 shrink-0 text-slate-400" aria-hidden="true" />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <ApplicationStatusBadge status={app.status} />
          {priority && <PriorityBadge priority={priority} />}
        </div>
        <dl className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-600">
          <div>
            <dt className="text-slate-500">Submitted</dt>
            <dd className="font-medium text-slate-800">{formatDate(app.submittedAt)}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Updated</dt>
            <dd className="font-medium text-slate-800">{formatRelative(app.updatedAt, now)}</dd>
          </div>
        </dl>
        {extra && <div className="mt-2 text-xs text-slate-600">{extra}</div>}
      </Link>
    </article>
  );
}

export function StatusText({ status, className }: { status: Application['status']; className?: string }) {
  return <span className={cn('text-sm font-medium', className)}>{APPLICATION_STATUS_META[status].label}</span>;
}
