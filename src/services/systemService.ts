import type { AppNotification, AuditLog, Delivery, SystemSettings, User } from '../types';
import { appStore } from '../store/appStore';
import { addAudit } from '../store/mutations';
import { clearBlobs } from './blobStore';
import { ServiceError, nowIso, simulateLatency } from './api';
import { actorOf } from './actors';
import { isAdmin } from './access';
import { buildSeedData } from '../data/seed';

export async function getSettings(): Promise<SystemSettings> {
  await simulateLatency(60);
  return appStore.getState().settings;
}

export async function updateSettings(admin: User, patch: Partial<SystemSettings>): Promise<SystemSettings> {
  await simulateLatency(120);
  if (!isAdmin(admin)) throw new ServiceError('FORBIDDEN', 'Only Super Admins can change system settings.');
  const at = nowIso();
  appStore.commit((s) => {
    const next = {
      ...s,
      settings: {
        ...s.settings,
        ...patch,
        channels: { ...s.settings.channels, ...(patch.channels ?? {}) },
      },
    };
    const parts: string[] = [];
    if (patch.simulationSpeed) parts.push(`simulation ${patch.simulationSpeed}`);
    if (patch.channels) parts.push(`WhatsApp preview ${patch.channels.whatsapp ? 'on' : 'off'}, e-mail preview ${patch.channels.email ? 'on' : 'off'}`);
    return addAudit(next, actorOf(admin), at, { action: 'settings_updated', detail: parts.join('; ') || 'Settings saved' });
  });
  return appStore.getState().settings;
}

/** Restores fictional sample records while preserving locally registered accounts. */
export async function resetDemoData(actor: User): Promise<void> {
  await simulateLatency(300);
  await clearBlobs();
  const sample = buildSeedData(Date.now());
  const accounts = appStore.getState().users.filter((user) => user.passwordDigest.startsWith('pbkdf2$'));
  appStore.replace({
    ...sample,
    users: [...sample.users, ...accounts],
    counters: { ...sample.counters, user: sample.users.length + accounts.length + 1 },
  });
  const at = nowIso();
  appStore.commit((s) => addAudit(s, actorOf(actor), at, { action: 'demo_reset', detail: 'Demo data restored to the starting state' }));
}

export interface SystemActivity {
  auditLogs: AuditLog[];
  systemNotifications: AppNotification[];
  deliveriesInProgress: Delivery[];
  counts: { applications: number; documents: number; certificates: number; users: number; notifications: number; auditEntries: number };
  esignPending: number;
  storage: { persistent: boolean; notice: string | null };
  seededAt: string;
}

export async function getSystemActivity(admin: User): Promise<SystemActivity> {
  await simulateLatency();
  if (!isAdmin(admin)) throw new ServiceError('FORBIDDEN', 'System activity is available to Super Admins.');
  const s = appStore.getState();
  return {
    auditLogs: s.auditLogs.slice(0, 60),
    systemNotifications: s.notifications.filter((n) => n.recipientRole === 'super_admin' || n.recipientRole === 'admin').slice(0, 20),
    deliveriesInProgress: s.deliveries.filter((d) => d.status !== 'delivered'),
    counts: {
      applications: s.applications.length,
      documents: s.documents.length,
      certificates: s.certificates.length,
      users: s.users.length,
      notifications: s.notifications.length,
      auditEntries: s.auditLogs.length,
    },
    esignPending: s.applications.filter((a) => a.status === 'esign_pending').length,
    storage: { persistent: appStore.isPersistent, notice: appStore.notice },
    seededAt: s.seededAt,
  };
}
