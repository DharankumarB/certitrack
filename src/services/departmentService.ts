import type { AuditLog, Department, OfficerUser, Application, User } from '../types';
import { appStore } from '../store/appStore';
import { addAudit, updateUser } from '../store/mutations';
import { ServiceError, nowIso, simulateLatency } from './api';
import { actorOf } from './actors';
import { isAdmin, isOfficer } from './access';
import { departmentMetrics, stageBottlenecks, countBy, STATUS_GROUP_ORDER, statusGroup, type BottleneckRow, type DepartmentMetrics } from '../utils/analytics';
import { updateDepartmentSlaMutator } from './departmentMutators';
import { recordAccessDenied } from './applicationService';

export interface DepartmentSummary {
  department: Department;
  metrics: DepartmentMetrics;
  officers: OfficerUser[];
}

export interface DepartmentDetail extends DepartmentSummary {
  applications: Application[];
  bottlenecks: BottleneckRow[];
  statusBreakdown: Array<{ name: string; value: number }>;
  recentActivity: AuditLog[];
}

function visibleDepartments(viewer: User): Department[] {
  const all = appStore.getState().departments;
  if (isAdmin(viewer)) return all;
  if (isOfficer(viewer)) return all.filter((d) => d.id === viewer.departmentId);
  return [];
}

export async function listDepartmentSummaries(viewer: User, now: number = Date.now()): Promise<DepartmentSummary[]> {
  await simulateLatency();
  const s = appStore.getState();
  return visibleDepartments(viewer).map((department) => ({
    department,
    metrics: departmentMetrics(department, s.applications, s.documents, now),
    officers: s.users.filter((u): u is OfficerUser => 'employeeId' in u && u.active && u.departmentId === department.id),
  }));
}

export async function getDepartmentDetail(viewer: User, departmentId: string, now: number = Date.now()): Promise<DepartmentDetail> {
  await simulateLatency();
  const s = appStore.getState();
  const department = s.departments.find((d) => d.id === departmentId);
  if (!department) throw new ServiceError('NOT_FOUND', 'Department not found.');
  if (!isAdmin(viewer) && !(isOfficer(viewer) && viewer.departmentId === departmentId)) {
    recordAccessDenied(viewer, '—', departmentId, 'Attempted to open another department’s dashboard.');
    throw new ServiceError('FORBIDDEN', 'You can only view your own department.');
  }
  const apps = s.applications.filter((a) => a.departmentId === departmentId).sort((a, b) => Date.parse(b.submittedAt) - Date.parse(a.submittedAt));
  return {
    department,
    metrics: departmentMetrics(department, s.applications, s.documents, now),
    officers: s.users.filter((u): u is OfficerUser => 'employeeId' in u && u.active && u.departmentId === departmentId),
    applications: apps,
    bottlenecks: stageBottlenecks(apps),
    statusBreakdown: countBy(apps, statusGroup, STATUS_GROUP_ORDER),
    recentActivity: s.auditLogs.filter((l) => l.departmentId === departmentId).slice(0, 12),
  };
}

export async function updateDepartmentSla(admin: User, departmentId: string, slaDays: number): Promise<void> {
  await simulateLatency(120);
  if (!isAdmin(admin)) throw new ServiceError('FORBIDDEN', 'Only Super Admins can change service standards.');
  if (!Number.isInteger(slaDays) || slaDays < 1 || slaDays > 60) throw new ServiceError('VALIDATION', 'Enter a whole number of days from 1 to 60.', { slaDays: 'Enter 1 to 60 days.' });
  const at = nowIso();
  appStore.commit((s) => {
    const current = s.departments.find((d) => d.id === departmentId);
    if (!current || current.slaDays === slaDays) return s;
    const next = updateDepartmentSlaMutator(s, departmentId, slaDays);
    return addAudit(next, actorOf(admin), at, { action: 'sla_updated', departmentId: departmentId as Department['id'], detail: `Service standard ${current.slaDays} → ${slaDays} days` });
  });
}

export async function setOfficerActive(admin: User, userId: string, active: boolean): Promise<void> {
  await simulateLatency(120);
  if (!isAdmin(admin)) throw new ServiceError('FORBIDDEN', 'Only Super Admins can change officer access.');
  const target = appStore.getState().users.find((u) => u.id === userId);
  if (!target || !('employeeId' in target)) throw new ServiceError('NOT_FOUND', 'Department staff account not found.');
  const at = nowIso();
  appStore.commit((s) => {
    const next = updateUser(s, userId, (u) => ({ ...u, active, accountStatus: active ? 'approved' : 'suspended' }));
    return addAudit(next, actorOf(admin), at, {
      action: 'officer_status_changed',
      departmentId: 'departmentId' in target ? target.departmentId : null,
      result: 'success',
      detail: `${target.name} ${active ? 're-enabled' : 'disabled'}`,
    });
  });
}
