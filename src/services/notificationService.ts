import type { AppNotification, User } from '../types';
import { appStore } from '../store/appStore';
import { markNotifications } from '../store/mutations';
import { simulateLatency } from './api';

export function notificationsFor(userId: string, notifications: AppNotification[]): AppNotification[] {
  return notifications.filter((n) => n.recipientId === userId);
}

export function unreadCountFor(userId: string, notifications: AppNotification[]): number {
  return notifications.reduce((count, n) => (n.recipientId === userId && !n.read ? count + 1 : count), 0);
}

export async function listNotifications(viewer: User): Promise<AppNotification[]> {
  await simulateLatency(120);
  return notificationsFor(viewer.id, appStore.getState().notifications).sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

/** Only the recipient can change read state. Foreign IDs are ignored. */
export async function setNotificationsRead(viewer: User, ids: string[], read: boolean): Promise<void> {
  const owned = new Set(notificationsFor(viewer.id, appStore.getState().notifications).map((n) => n.id));
  const targets = ids.filter((id) => owned.has(id));
  if (targets.length === 0) return;
  appStore.commit((s) => markNotifications(s, targets, read));
}

export async function markAllRead(viewer: User): Promise<void> {
  const ids = notificationsFor(viewer.id, appStore.getState().notifications)
    .filter((n) => !n.read)
    .map((n) => n.id);
  if (ids.length === 0) return;
  appStore.commit((s) => markNotifications(s, ids, true));
}
