import { Check, Clock, MapPin, PackageCheck, Truck, Warehouse } from 'lucide-react';
import type { Delivery } from '../../types';
import { DELIVERY_STEPS, DELIVERY_STATUS_META } from '../../config/workflow';
import { formatDate, formatDateTime, formatRelative } from '../../utils/format';
import { cn } from '../../utils/cn';
import { DeliveryStatusBadge } from './Status';
import { useNow } from '../../hooks/useNow';
import { IntegrationBadge } from '../ui/IntegrationBadge';

const ICONS = [Warehouse, Truck, MapPin, PackageCheck];

/** Courier progress: Dispatched → In Transit → Out for Delivery → Delivered. */
export function DeliveryTimeline({ delivery }: { delivery: Delivery }) {
  const now = useNow(15_000);
  const currentIndex = DELIVERY_STEPS.indexOf(delivery.status);
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <dl className="grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-500">Tracking ID</dt>
            <dd className="font-mono font-semibold text-navy-900">{delivery.trackingId}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-500">Current location</dt>
            <dd className="font-medium text-slate-900">{delivery.currentLocation}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-500">Dispatched</dt>
            <dd className="font-medium text-slate-900">{formatDateTime(delivery.dispatchedAt)}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-500">Estimated delivery</dt>
            <dd className="font-medium text-slate-900">{delivery.status === 'delivered' ? `Delivered ${formatDate(delivery.deliveredAt)}` : formatDate(delivery.estimatedDelivery)}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs uppercase tracking-wide text-slate-500">Registered address</dt>
            <dd className="font-medium text-slate-900">{delivery.recipientAddress}</dd>
          </div>
        </dl>
        <div className="flex flex-col items-end gap-2">
          <DeliveryStatusBadge status={delivery.status} />
          {delivery.nextStepAt && delivery.status !== 'delivered' && (
            <p className="flex items-center gap-1 text-xs text-slate-600">
              <Clock className="size-3.5" aria-hidden="true" /> Next update {formatRelative(delivery.nextStepAt, now)}
            </p>
          )}
          <IntegrationBadge kind="simulated" />
        </div>
      </div>
      <ol className="grid gap-4 sm:grid-cols-4" aria-label="Delivery progress">
        {DELIVERY_STEPS.map((step, index) => {
          const done = index < currentIndex || delivery.status === 'delivered';
          const current = index === currentIndex && delivery.status !== 'delivered';
          const Icon = ICONS[index]!;
          return (
            <li key={step} className="flex items-center gap-3 sm:flex-col sm:text-center" aria-current={current ? 'step' : undefined}>
              <span className={cn('flex size-11 shrink-0 items-center justify-center rounded-full ring-4 ring-white', done ? 'bg-gov-600 text-white' : current ? 'bg-navy-800 text-white' : 'bg-slate-200 text-slate-500')}>
                {done ? <Check className="size-5" aria-hidden="true" /> : <Icon className="size-5" aria-hidden="true" />}
              </span>
              <span>
                <span className={cn('block text-sm font-semibold', done || current ? 'text-navy-900' : 'text-slate-500')}>{DELIVERY_STATUS_META[step].label}</span>
                <span className="block text-xs text-slate-500">{done || current ? stepDate(delivery, step) : 'Pending'}</span>
              </span>
            </li>
          );
        })}
      </ol>
      <div>
        <h3 className="mb-2 text-sm font-semibold text-navy-900">Courier updates</h3>
        <ul className="space-y-3 border-l-2 border-slate-200 pl-4">
          {[...delivery.events].reverse().map((e) => (
            <li key={e.id} className="text-sm">
              <p className="font-medium text-slate-900">{DELIVERY_STATUS_META[e.status].label}</p>
              <p className="text-xs text-slate-500">
                {formatDateTime(e.at)} · {e.location}
              </p>
              <p className="text-slate-700">{e.description}</p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function stepDate(delivery: Delivery, step: string): string {
  const ev = delivery.events.find((e) => e.status === step);
  if (ev) return formatDate(ev.at);
  return step === 'delivered' && delivery.deliveredAt ? formatDate(delivery.deliveredAt) : 'Expected';
}
