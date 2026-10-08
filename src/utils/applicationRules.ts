import type {
  AIValidationResult,
  ApplicationFilters,
  Application,
  CheckKey,
  Document,
  DocumentStatus,
  Priority,
  ApplicationStatus,
} from '../types';
import { OPEN_STATUSES } from '../config/workflow';
import { startOfToday } from './format';

export const ISSUE_CHECKS: CheckKey[] = ['duplicate', 'tampering', 'name_match', 'dob_match'];

/** The status a document has right now, combining the AI verdict with the officer's decision. */
export function effectiveDocStatus(doc: Document): DocumentStatus {
  if (doc.officerDecision === 'flagged') return 'needs_changes';
  if (doc.officerDecision === 'accepted') return 'verified';
  return doc.ai?.verdict ?? 'pending';
}

export function docHasPotentialIssue(ai: AIValidationResult | null): boolean {
  return Boolean(ai?.checks.some((c) => ISSUE_CHECKS.includes(c.key) && (c.status === 'warn' || c.status === 'fail')));
}

export function docIsUnreadable(ai: AIValidationResult | null): boolean {
  return Boolean(ai?.checks.some((c) => c.key === 'readability' && c.status === 'fail'));
}

export function docIsHighConfidence(ai: AIValidationResult | null): boolean {
  return Boolean(ai && ai.verdict === 'verified' && ai.confidence >= 0.9);
}

export function isOpenStatus(status: ApplicationStatus): boolean {
  return OPEN_STATUSES.includes(status);
}

export function isClosedStatus(status: ApplicationStatus): boolean {
  return status === 'rejected' || status === 'issued' || status === 'delivered';
}

export function averageConfidence(docs: Document[]): number {
  const scored = docs.filter((d) => d.ai);
  if (scored.length === 0) return 0;
  return scored.reduce((sum, d) => sum + (d.ai?.confidence ?? 0), 0) / scored.length;
}

/** Priority is derived unless an officer has set an override. Overdue or flagged files rise. */
export function derivePriority(app: Application, docs: Document[], now: number = Date.now()): Priority {
  if (app.priorityOverride) return app.priorityOverride;
  if (isClosedStatus(app.status)) return 'low';
  const potential = docs.some((d) => docHasPotentialIssue(d.ai)) || docs.some((d) => effectiveDocStatus(d) === 'needs_changes');
  const overdue = Date.parse(app.expectedBy) < now;
  if (potential || overdue) return 'high';
  if (app.aiScore >= 95 && docs.every((d) => d.ai?.verdict === 'verified')) return 'low';
  return 'normal';
}

export function isOverdue(app: Application, now: number = Date.now()): boolean {
  return isOpenStatus(app.status) && Date.parse(app.expectedBy) < now;
}

/** Days until the service-standard deadline (negative when overdue). */
export function daysUntilDue(app: Application, now: number = Date.now()): number {
  return Math.ceil((Date.parse(app.expectedBy) - now) / 86_400_000);
}

export function matchesAi(docs: Document[], filter: NonNullable<ApplicationFilters['ai']>): boolean {
  if (filter === 'all') return true;
  if (filter === 'high') return docs.length > 0 && docs.every((d) => docIsHighConfidence(d.ai));
  if (filter === 'review') return docs.some((d) => d.ai?.verdict === 'warning' || d.ai?.verdict === 'needs_changes');
  if (filter === 'issue') return docs.some((d) => docHasPotentialIssue(d.ai));
  return docs.some((d) => docIsUnreadable(d.ai));
}

const DAY_MS = 86_400_000;

export function filterApplications(
  apps: Application[],
  filters: ApplicationFilters,
  docsByApp: Map<string, Document[]>,
  now: number = Date.now(),
): Application[] {
  const q = (filters.q ?? '').trim().toLowerCase();
  const todayStart = startOfToday(now);
  return apps.filter((app) => {
    if (q) {
      const hay = `${app.id} ${app.applicantName} ${app.certificateType} ${app.district}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (filters.certificateType && filters.certificateType !== 'all' && app.certificateType !== filters.certificateType) return false;
    if (filters.status === 'open') {
      if (!isOpenStatus(app.status)) return false;
    } else if (filters.status && filters.status !== 'all' && app.status !== filters.status) {
      return false;
    }
    if (filters.date && filters.date !== 'all') {
      const t = Date.parse(app.submittedAt);
      if (filters.date === 'today' && t < todayStart) return false;
      if (filters.date === '7d' && t < now - 7 * DAY_MS) return false;
      if (filters.date === '30d' && t < now - 30 * DAY_MS) return false;
    }
    const docs = docsByApp.get(app.id) ?? [];
    if (filters.ai && !matchesAi(docs, filters.ai)) return false;
    if (filters.priority && filters.priority !== 'all') {
      if (derivePriority(app, docs, now) !== filters.priority) return false;
    }
    return true;
  });
}

export function groupDocumentsByApp(docs: Document[]): Map<string, Document[]> {
  const map = new Map<string, Document[]>();
  for (const d of docs) {
    const list = map.get(d.applicationId);
    if (list) list.push(d);
    else map.set(d.applicationId, [d]);
  }
  return map;
}

export const AI_FILTER_LABELS: Record<NonNullable<ApplicationFilters['ai']>, string> = {
  all: 'Any AI result',
  high: 'High confidence',
  review: 'Needs review',
  issue: 'Potential issue',
  unreadable: 'Unreadable',
};
