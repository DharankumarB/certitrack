import type {
  ActorRef,
  AppData,
  AppNotification,
  Application,
  AuditLog,
  AuditResult,
  Counters,
  DepartmentId,
  Document,
  NotificationKind,
  SystemSettings,
  TimelineEvent,
  User,
} from '../types';
import { DEVICE_LABELS } from '../data/factories';

/**
 * Pure helper functions used inside store commits. Every helper returns a new AppData object
 * and never mutates its input, so commits are safe to retry and easy to reason about.
 */

export const MAX_AUDIT_ENTRIES = 2000;
export const MAX_NOTIFICATIONS = 1500;

export type EventSpec = Omit<TimelineEvent, 'id'>;

export interface AuditSpec {
  action: string;
  applicationId?: string | null;
  departmentId?: DepartmentId | null;
  result?: AuditResult;
  detail?: string;
}

export interface NotificationSpec {
  recipientId: string;
  title: string;
  body: string;
  kind: NotificationKind;
  tone: AppNotification['tone'];
  applicationId?: string | null;
}

export function bumpCounter(s: AppData, key: keyof Counters): { value: number; state: AppData } {
  const value = s.counters[key];
  return { value, state: { ...s, counters: { ...s.counters, [key]: value + 1 } } };
}

export function findApplication(s: AppData, id: string): Application | undefined {
  return s.applications.find((a) => a.id === id);
}

export function updateApplication(s: AppData, id: string, fn: (app: Application) => Application): AppData {
  let changed = false;
  const applications = s.applications.map((app) => {
    if (app.id !== id) return app;
    changed = true;
    return fn(app);
  });
  return changed ? { ...s, applications } : s;
}

export function updateDocument(s: AppData, id: string, fn: (doc: Document) => Document): AppData {
  let changed = false;
  const documents = s.documents.map((doc) => {
    if (doc.id !== id) return doc;
    changed = true;
    return fn(doc);
  });
  return changed ? { ...s, documents } : s;
}

export function updateUser(s: AppData, id: string, fn: (user: User) => User): AppData {
  let changed = false;
  const users = s.users.map((u) => {
    if (u.id !== id) return u;
    changed = true;
    return fn(u);
  });
  return changed ? { ...s, users } : s;
}

/** Appends timeline events to an application, assigning sequential IDs and keeping updatedAt in sync. */
export function appendEvents(s: AppData, appId: string, specs: EventSpec[]): AppData {
  if (specs.length === 0) return s;
  return updateApplication(s, appId, (app) => {
    const base = app.timeline.length;
    const events: TimelineEvent[] = specs.map((spec, i) => ({
      ...spec,
      id: `evt-${app.id}-${String(base + i + 1).padStart(2, '0')}`,
    }));
    const latest = events.reduce((max, e) => (Date.parse(e.at) > Date.parse(max) ? e.at : max), app.updatedAt);
    return { ...app, timeline: [...app.timeline, ...events], updatedAt: latest };
  });
}

export function channelsFor(user: User, settings: SystemSettings): AppNotification['channels'] {
  if (user.role !== 'citizen') return ['in_app'];
  const channels: AppNotification['channels'] = ['in_app'];
  if (user.notificationPrefs.whatsapp && settings.channels.whatsapp) channels.push('whatsapp');
  if (user.notificationPrefs.email && settings.channels.email) channels.push('email');
  return channels;
}

export function addNotifications(s: AppData, specs: NotificationSpec[], at: string): AppData {
  let state = s;
  const created: AppNotification[] = [];
  for (const spec of specs) {
    const user = state.users.find((u) => u.id === spec.recipientId);
    if (!user) continue;
    const { value, state: next } = bumpCounter(state, 'notification');
    state = next;
    created.push({
      id: `ntf-${String(value).padStart(4, '0')}`,
      recipientId: user.id,
      recipientRole: user.role,
      title: spec.title,
      body: spec.body,
      kind: spec.kind,
      tone: spec.tone,
      channels: channelsFor(user, state.settings),
      applicationId: spec.applicationId ?? null,
      createdAt: at,
      read: false,
    });
  }
  if (created.length === 0) return state;
  return { ...state, notifications: [...created, ...state.notifications].slice(0, MAX_NOTIFICATIONS) };
}

export function addAudit(s: AppData, actor: ActorRef, at: string, spec: AuditSpec): AppData {
  const { value, state } = bumpCounter(s, 'audit');
  const entry: AuditLog = {
    id: `aud-${value}`,
    at,
    actorId: actor.id,
    actorName: actor.name,
    actorRole: actor.role,
    action: spec.action,
    applicationId: spec.applicationId ?? null,
    departmentId: spec.departmentId ?? actor.departmentId ?? null,
    result: spec.result ?? 'success',
    detail: spec.detail ?? '',
    ipMasked: `•••.•••.•••.${20 + (value % 200)}`,
    device: DEVICE_LABELS[value % DEVICE_LABELS.length]!,
  };
  return { ...state, auditLogs: [entry, ...state.auditLogs].slice(0, MAX_AUDIT_ENTRIES) };
}

export function addAuditMany(s: AppData, actor: ActorRef, at: string, specs: AuditSpec[]): AppData {
  return specs.reduce((state, spec) => addAudit(state, actor, at, spec), s);
}

export function markNotifications(s: AppData, ids: string[], read: boolean): AppData {
  const set = new Set(ids);
  let changed = false;
  const notifications = s.notifications.map((n) => {
    if (!set.has(n.id) || n.read === read) return n;
    changed = true;
    return { ...n, read };
  });
  return changed ? { ...s, notifications } : s;
}
