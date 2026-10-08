import type { AuditLog, User } from '../types';
import { appStore } from '../store/appStore';
import { ServiceError, simulateLatency } from './api';
import { isAdmin } from './access';

export interface AuditFilters {
  q?: string;
  role?: string;
  action?: string;
  department?: string;
  result?: string;
  range?: '24h' | '7d' | '30d' | 'all';
}

/** Super Admin only. Officers and citizens cannot read the audit trail. */
export async function listAuditLogs(viewer: User, filters: AuditFilters = {}, now: number = Date.now()): Promise<AuditLog[]> {
  await simulateLatency();
  if (!isAdmin(viewer)) throw new ServiceError('FORBIDDEN', 'The audit trail is available to Super Admins only.');
  const q = (filters.q ?? '').trim().toLowerCase();
  const windowMs = filters.range === '24h' ? 86_400_000 : filters.range === '7d' ? 7 * 86_400_000 : filters.range === '30d' ? 30 * 86_400_000 : null;
  return appStore.getState().auditLogs.filter((log) => {
    if (windowMs && Date.parse(log.at) < now - windowMs) return false;
    if (filters.role && filters.role !== 'all' && log.actorRole !== filters.role) return false;
    if (filters.action && filters.action !== 'all' && log.action !== filters.action) return false;
    if (filters.department && filters.department !== 'all' && log.departmentId !== filters.department) return false;
    if (filters.result && filters.result !== 'all' && log.result !== filters.result) return false;
    if (q && !`${log.actorName} ${log.action} ${log.applicationId ?? ''} ${log.detail}`.toLowerCase().includes(q)) return false;
    return true;
  });
}
