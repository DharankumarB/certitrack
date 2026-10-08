import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CircleHelp, Route, MapPin, Clock, ListChecks } from 'lucide-react';
import { useCurrentUser } from '../../context/AuthContext';
import { useAppState } from '../../hooks/useAppState';
import { usePageTitle } from '../../hooks/usePageTitle';
import { useNow } from '../../hooks/useNow';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { SelectField } from '../../components/ui/Forms';
import { EmptyState } from '../../components/ui/Feedback';
import { ButtonLink } from '../../components/ui/Button';
import { ApplicationStatusBadge, DeliveryStatusBadge } from '../../components/domain/Status';
import { StageProgress, ApplicationTimeline } from '../../components/domain/Timeline';
import { DeliveryTimeline } from '../../components/domain/Delivery';
import { certLabel } from '../../components/domain/ApplicationCards';
import { computeSteps, currentStage, nextStepText } from '../../utils/stages';
import { formatDate, formatDateTime, formatRelative } from '../../utils/format';
import { OPEN_STATUSES } from '../../config/workflow';
import { Badge } from '../../components/ui/Badge';

export default function CitizenTrackPage() {
  usePageTitle('Track application');
  const user = useCurrentUser();
  const [params, setParams] = useSearchParams();
  const allApps = useAppState((s) => s.applications);
  const apps = useMemo(() => allApps.filter((a) => a.citizenId === user.id).sort((x, y) => Date.parse(y.updatedAt) - Date.parse(x.updatedAt)), [allApps, user.id]);
  const deliveries = useAppState((s) => s.deliveries);
  const depts = useAppState((s) => s.departments);
  const now = useNow(15_000);

  const defaultId = useMemo(() => apps.find((a) => OPEN_STATUSES.includes(a.status))?.id ?? apps[0]?.id ?? '', [apps]);
  const requested = params.get('app');
  const selectedId = apps.some((a) => a.id === requested) ? (requested as string) : defaultId;
  const app = apps.find((a) => a.id === selectedId);
  const delivery = app ? deliveries.find((d) => d.applicationId === app.id) ?? null : null;
  const dept = app ? depts.find((d) => d.id === app.departmentId) : undefined;

  if (apps.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader title="Where is my file?" description="Live tracking for each of your applications." id="track-title" />
        <EmptyState icon={Route} title="Nothing to track yet" description="Submit an application and its stages will appear here." action={<ButtonLink to="/citizen/apply">Apply for a certificate</ButtonLink>} />
      </div>
    );
  }
  if (!app) return null;

  const steps = computeSteps(app, delivery);
  const stage = currentStage(steps);
  const recent = app.timeline.slice(-3).reverse();

  return (
    <div className="space-y-6">
      <PageHeader title="Where is my file?" description="The current stage, what has happened so far, and what happens next." id="track-title" />
      <div className="max-w-xl">
        <SelectField
          label="Application"
          value={selectedId}
          onChange={(e) => setParams({ app: e.target.value }, { replace: true })}
          options={apps.map((a) => ({ value: a.id, label: `${a.id} · ${certLabel(a)} · ${stageName(a.status)}` }))}
        />
      </div>

      <Card>
        <CardBody className="space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-mono text-xs font-semibold text-navy-700">{app.id}</p>
              <h2 className="text-lg font-semibold text-navy-900">{certLabel(app)}</h2>
              <p className="flex items-center gap-1.5 text-sm text-slate-700">
                <MapPin className="size-4 text-slate-500" aria-hidden="true" /> {dept?.name}
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <ApplicationStatusBadge status={app.status} />
              <span className="flex items-center gap-1 text-xs text-slate-500">
                <Clock className="size-3.5" aria-hidden="true" /> Updated {formatRelative(app.updatedAt, now)}
              </span>
            </div>
          </div>
          <div className="rounded-xl bg-navy-50/60 p-4">
            <p className="text-sm text-slate-700">
              You are here: <span className="font-bold text-navy-900">{stage.label}</span>
            </p>
            <div className="mt-4">
              <StageProgress steps={steps} />
            </div>
          </div>
        </CardBody>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2 grid-cols-1">
        <Card>
          <CardHeader title="What happened" description="The three most recent events." />
          <CardBody>
            <ul className="space-y-4">
              {recent.map((e) => (
                <li key={e.id} className="border-l-2 border-navy-200 pl-4">
                  <p className="text-sm font-semibold text-navy-900">{e.action}</p>
                  <p className="text-xs text-slate-500">
                    {formatDateTime(e.at)} · {e.department ?? 'CertiTrack'} · {e.actorName}
                  </p>
                  <p className="mt-1 text-sm text-slate-700">{e.description}</p>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="What happens next" />
          <CardBody className="space-y-4">
            <p className="flex items-start gap-2 text-sm text-slate-800">
              <ListChecks className="mt-0.5 size-4 shrink-0 text-navy-700" aria-hidden="true" />
              {nextStepText(app, delivery, dept?.name ?? 'Department')}
            </p>
            <p className="text-sm text-slate-700">
              Expected decision by <span className="font-semibold">{formatDate(app.expectedBy)}</span>.
            </p>
            {app.status === 'changes_requested' && (
              <ButtonLink to={`/citizen/applications/${app.id}`} variant="amber">
                Fix the flagged document
              </ButtonLink>
            )}
            <p className="flex items-start gap-2 text-xs text-slate-500">
              <CircleHelp className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
              Questions about the process? <Link to="/help" className="font-semibold text-navy-800 underline-offset-2 hover:underline">Read the FAQs</Link>.
            </p>
          </CardBody>
        </Card>
      </div>

      {delivery && (
        <Card>
          <CardHeader title="Delivery to your doorstep" actions={<DeliveryStatusBadge status={delivery.status} />} />
          <CardBody>
            <DeliveryTimeline delivery={delivery} />
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader title="Full timeline" description="Every stage with timestamp, department, action and description." />
        <CardBody>
          <ApplicationTimeline app={app} delivery={delivery} />
        </CardBody>
      </Card>
      <Badge tone="neutral">Prototype · simulated courier and e-sign</Badge>
    </div>
  );
}

function stageName(status: string): string {
  return status.replace(/_/g, ' ');
}
