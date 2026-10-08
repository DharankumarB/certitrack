import { BadgeCheck, CircleCheck, CircleX, Clock, Eye, Loader, PackageCheck, PenLine, TriangleAlert, CircleAlert, type LucideIcon } from 'lucide-react';
import { Badge, type BadgeTone } from '../ui/Badge';
import type { ApplicationStatus, DocumentStatus, DeliveryStatus, Priority, CheckStatus } from '../../types';
import { APPLICATION_STATUS_META, DELIVERY_STATUS_META } from '../../config/workflow';

const STATUS_ICON: Record<string, LucideIcon> = {
  Loader,
  Eye,
  TriangleAlert,
  CircleX,
  PenLine,
  BadgeCheck,
  PackageCheck,
  Clock,
};

export function ApplicationStatusBadge({ status, className }: { status: ApplicationStatus; className?: string }) {
  const meta = APPLICATION_STATUS_META[status];
  return (
    <Badge tone={meta.tone as BadgeTone} icon={STATUS_ICON[meta.icon]} className={className}>
      {meta.label}
    </Badge>
  );
}

const DOC: Record<DocumentStatus, { label: string; tone: BadgeTone; icon: LucideIcon }> = {
  verified: { label: 'Verified', tone: 'success', icon: CircleCheck },
  warning: { label: 'Warning', tone: 'warning', icon: TriangleAlert },
  needs_changes: { label: 'Needs changes', tone: 'danger', icon: CircleX },
  pending: { label: 'Pending check', tone: 'neutral', icon: Clock },
};

export function DocumentStatusBadge({ status }: { status: DocumentStatus }) {
  const d = DOC[status];
  return (
    <Badge tone={d.tone} icon={d.icon}>
      {d.label}
    </Badge>
  );
}

const PRIORITY: Record<Priority, { label: string; tone: BadgeTone }> = {
  high: { label: 'High', tone: 'danger' },
  normal: { label: 'Normal', tone: 'info' },
  low: { label: 'Low', tone: 'neutral' },
};

export function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    <Badge tone={PRIORITY[priority].tone} icon={priority === 'high' ? CircleAlert : undefined}>
      {PRIORITY[priority].label}
    </Badge>
  );
}

export function DeliveryStatusBadge({ status }: { status: DeliveryStatus }) {
  const meta = DELIVERY_STATUS_META[status];
  return (
    <Badge tone={meta.tone} icon={status === 'delivered' ? PackageCheck : undefined}>
      {meta.label}
    </Badge>
  );
}

export const CHECK_ICON: Record<CheckStatus, { icon: LucideIcon; cls: string; label: string }> = {
  pass: { icon: CircleCheck, cls: 'text-gov-700', label: 'Pass' },
  warn: { icon: TriangleAlert, cls: 'text-amber-700', label: 'Warning' },
  fail: { icon: CircleX, cls: 'text-red-700', label: 'Fail' },
  na: { icon: Clock, cls: 'text-slate-500', label: 'Not applicable' },
};

export function AiPercent({ value }: { value: number | null }) {
  if (value === null) return <span className="text-slate-500">—</span>;
  const pct = Math.round(value * 100);
  const tone = pct >= 90 ? 'text-gov-700' : pct >= 75 ? 'text-amber-800' : 'text-red-800';
  return <span className={`font-semibold tabular-nums ${tone}`}>{pct}%</span>;
}
