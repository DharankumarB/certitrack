import type { Application, ApplicationStatus, Delivery, Department, Document, Priority } from '../types';
import { derivePriority, effectiveDocStatus } from './applicationRules';

export type RangeDays = 7 | 30 | 90;
export const RANGE_OPTIONS: RangeDays[] = [7, 30, 90];

export interface Bucket {
  name: string;
  value: number;
}

const DAY_MS = 86_400_000;

export function inRange(app: Application, days: number, now: number): boolean {
  return Date.parse(app.submittedAt) >= now - days * DAY_MS;
}

export function countBy<T>(items: T[], key: (item: T) => string, order?: string[]): Bucket[] {
  const counts = new Map<string, number>();
  for (const item of items) {
    const k = key(item);
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  const names = order ?? [...counts.keys()].sort();
  return names.map((name) => ({ name, value: counts.get(name) ?? 0 }));
}

export function average(values: number[]): number | null {
  const v = values.filter((n) => Number.isFinite(n));
  if (v.length === 0) return null;
  return v.reduce((s, n) => s + n, 0) / v.length;
}

const CLOSED_HOURS_STATUSES: ApplicationStatus[] = ['issued', 'delivered', 'rejected'];

/** Hours from submission to final outcome for closed files (issued, delivered or rejected). */
export function processingHours(app: Application): number | null {
  if (!CLOSED_HOURS_STATUSES.includes(app.status) || !app.completedAt) return null;
  return (Date.parse(app.completedAt) - Date.parse(app.submittedAt)) / 3_600_000;
}

export function statusGroup(app: Application): string {
  switch (app.status) {
    case 'ai_checking':
      return 'AI check';
    case 'in_review':
      return 'Under review';
    case 'changes_requested':
      return 'Needs changes';
    case 'esign_pending':
      return 'Awaiting e-sign';
    case 'issued':
      return 'Issued';
    case 'delivered':
      return 'Delivered';
    case 'rejected':
      return 'Rejected';
  }
}

export const STATUS_GROUP_ORDER = ['AI check', 'Under review', 'Needs changes', 'Awaiting e-sign', 'Issued', 'Delivered', 'Rejected'];

function eventHours(app: Application, from: string[], to: string[]): number | null {
  const start = app.timeline.find((e) => from.includes(e.key));
  const end = app.timeline.find((e) => to.includes(e.key) && (!start || Date.parse(e.at) >= Date.parse(start.at)));
  if (!start || !end) return null;
  return (Date.parse(end.at) - Date.parse(start.at)) / 3_600_000;
}

export interface BottleneckRow {
  stage: string;
  avgHours: number | null;
  samples: number;
  waiting: number;
}

/** Average time spent in each stage plus the number of files waiting there right now. */
export function stageBottlenecks(apps: Application[]): BottleneckRow[] {
  const rows: Array<{ stage: string; from: string[]; to: string[]; waiting: (a: Application) => boolean }> = [
    { stage: 'AI check', from: ['submitted'], to: ['ai_check'], waiting: (a) => a.status === 'ai_checking' },
    { stage: 'Queue wait', from: ['queued'], to: ['review_started'], waiting: (a) => a.status === 'in_review' && !a.reviewStartedAt },
    { stage: 'Officer review', from: ['review_started'], to: ['approved', 'rejected', 'changes_requested'], waiting: (a) => a.status === 'in_review' && !!a.reviewStartedAt },
    { stage: 'e-Sign', from: ['approved'], to: ['signed'], waiting: (a) => a.status === 'esign_pending' },
    { stage: 'Courier delivery', from: ['issued'], to: ['delivered'], waiting: (a) => a.status === 'issued' && a.deliveryRequested },
  ];
  return rows.map((row) => {
    const hours = apps.map((a) => eventHours(a, row.from, row.to)).filter((h): h is number => h !== null && h >= 0);
    return {
      stage: row.stage,
      avgHours: average(hours),
      samples: hours.length,
      waiting: apps.filter(row.waiting).length,
    };
  });
}

/** Submissions per day for the last `days` days, oldest first. */
export function dailySubmissions(apps: Application[], days: number, now: number): Bucket[] {
  const buckets: Bucket[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const day = new Date(now - i * DAY_MS);
    const start = new Date(day.getFullYear(), day.getMonth(), day.getDate()).getTime();
    const end = start + DAY_MS;
    const label = day.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
    const count = apps.filter((a) => {
      const t = Date.parse(a.submittedAt);
      return t >= start && t < end;
    }).length;
    buckets.push({ name: label, value: count });
  }
  return buckets;
}

export function priorityCounts(apps: Application[], docsByApp: Map<string, Document[]>, now: number): Record<Priority, number> {
  const out: Record<Priority, number> = { high: 0, normal: 0, low: 0 };
  for (const app of apps) out[derivePriority(app, docsByApp.get(app.id) ?? [], now)] += 1;
  return out;
}

export interface DepartmentMetrics {
  department: Department;
  total: number;
  pending: number;
  changes: number;
  approved: number;
  rejected: number;
  issued: number;
  avgHours: number | null;
  overdue: number;
  aiFlags: number;
  unreadable: number;
}

export function departmentMetrics(dept: Department, apps: Application[], docs: Document[], now: number): DepartmentMetrics {
  const mine = apps.filter((a) => a.departmentId === dept.id);
  const docsByApp = new Map<string, Document[]>();
  for (const d of docs) {
    if (!mine.some((a) => a.id === d.applicationId)) continue;
    const list = docsByApp.get(d.applicationId) ?? [];
    list.push(d);
    docsByApp.set(d.applicationId, list);
  }
  const aiFlags = mine.filter((a) => (docsByApp.get(a.id) ?? []).some((d) => effectiveDocStatus(d) !== 'verified' && effectiveDocStatus(d) !== 'pending')).length;
  const unreadable = mine.filter((a) => (docsByApp.get(a.id) ?? []).some((d) => d.ai?.checks.some((c) => c.key === 'readability' && c.status === 'fail'))).length;
  return {
    department: dept,
    total: mine.length,
    pending: mine.filter((a) => a.status === 'in_review' || a.status === 'ai_checking').length,
    changes: mine.filter((a) => a.status === 'changes_requested').length,
    approved: mine.filter((a) => a.status === 'esign_pending' || a.status === 'issued' || a.status === 'delivered').length,
    rejected: mine.filter((a) => a.status === 'rejected').length,
    issued: mine.filter((a) => a.status === 'issued' || a.status === 'delivered').length,
    avgHours: average(mine.map(processingHours).filter((h): h is number => h !== null)),
    overdue: mine.filter((a) => (a.status === 'in_review' || a.status === 'changes_requested') && Date.parse(a.expectedBy) < now).length,
    aiFlags,
    unreadable,
  };
}

export function deliveryInProgress(deliveries: Delivery[]): number {
  return deliveries.filter((d) => d.status !== 'delivered').length;
}
