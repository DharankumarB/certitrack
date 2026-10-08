import type { Application, Document, User } from '../types';
import { appStore } from '../store/appStore';
import { CERTIFICATE_TYPES } from '../config/certificateTypes';
import { isAdmin, isCitizen, isOfficer } from './access';
import { ServiceError, simulateLatency } from './api';
import {
  countBy,
  dailySubmissions,
  departmentMetrics,
  inRange,
  processingHours,
  priorityCounts,
  stageBottlenecks,
  statusGroup,
  STATUS_GROUP_ORDER,
  average,
  type Bucket,
  type BottleneckRow,
  type DepartmentMetrics,
  type RangeDays,
} from '../utils/analytics';
import { docHasPotentialIssue, docIsUnreadable, groupDocumentsByApp } from '../utils/applicationRules';
import { OPEN_STATUSES } from '../config/workflow';

export interface AdminDashboard {
  kpis: { total: number; pending: number; approved: number; rejected: number; avgDays: number | null; today: number };
  byType: Bucket[];
  byDepartment: Bucket[];
  processingByDepartment: Bucket[];
  byStatus: Bucket[];
  bottlenecks: BottleneckRow[];
  departments: DepartmentMetrics[];
}

function startOfToday(now: number): number {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function typeShortLabel(app: Application): string {
  return CERTIFICATE_TYPES[app.certificateType].shortLabel;
}

function deptShortName(app: Application): string {
  return appStore.getState().departments.find((d) => d.id === app.departmentId)?.shortName ?? app.departmentId;
}

function processingBuckets(apps: Application[], keyFn: (a: Application) => string, names: string[]): Bucket[] {
  return names.map((name) => {
    const hours = apps.filter((a) => keyFn(a) === name).map(processingHours).filter((h): h is number => h !== null);
    const avg = average(hours);
    return { name, value: avg === null ? 0 : Math.round((avg / 24) * 10) / 10 };
  });
}

function aggregate(apps: Application[], now: number) {
  const byType = countBy(apps, typeShortLabel, ['Caste', 'Income', 'Domicile']);
  const byDepartment = countBy(apps, deptShortName, ['Caste', 'Income', 'Domicile']);
  const byStatus = countBy(apps, statusGroup, STATUS_GROUP_ORDER);
  const processingByDepartment = processingBuckets(apps, deptShortName, ['Caste', 'Income', 'Domicile']);
  const bottlenecks = stageBottlenecks(apps);
  const hours = apps.map(processingHours).filter((h): h is number => h !== null);
  return {
    byType,
    byDepartment,
    byStatus,
    processingByDepartment,
    bottlenecks,
    avgDays: average(hours) === null ? null : Math.round((average(hours)! / 24) * 10) / 10,
    today: apps.filter((a) => Date.parse(a.submittedAt) >= startOfToday(now)).length,
    now,
  };
}

export async function getAdminDashboard(admin: User, now: number = Date.now()): Promise<AdminDashboard> {
  await simulateLatency();
  if (!isAdmin(admin)) throw new ServiceError('FORBIDDEN', 'Portfolio analytics are available to Super Admins.');
  const s = appStore.getState();
  const apps = s.applications;
  const agg = aggregate(apps, now);
  return {
    kpis: {
      total: apps.length,
      pending: apps.filter((a) => OPEN_STATUSES.includes(a.status) && a.status !== 'esign_pending').length,
      approved: apps.filter((a) => a.status === 'esign_pending' || a.status === 'issued' || a.status === 'delivered').length,
      rejected: apps.filter((a) => a.status === 'rejected').length,
      avgDays: agg.avgDays,
      today: agg.today,
    },
    byType: agg.byType,
    byDepartment: agg.byDepartment,
    processingByDepartment: agg.processingByDepartment,
    byStatus: agg.byStatus,
    bottlenecks: agg.bottlenecks,
    departments: s.departments.map((d) => departmentMetrics(d, apps, s.documents, now)),
  };
}

export interface AnalyticsView {
  range: RangeDays;
  submitted: number;
  approvalRate: number | null;
  rejectionRate: number | null;
  avgDays: number | null;
  aiFlagRate: number | null;
  submissionsByDay: Bucket[];
  byType: Bucket[];
  byStatus: Bucket[];
  processingByDepartment: Bucket[];
  bottlenecks: BottleneckRow[];
  priority: Record<'high' | 'normal' | 'low', number>;
  departments: DepartmentMetrics[];
}

function analyticsFor(apps: Application[], documents: Document[], range: RangeDays, now: number, departments: AnalyticsView['departments']): AnalyticsView {
  const inWindow = apps.filter((a) => inRange(a, range, now));
  const agg = aggregate(inWindow, now);
  const decided = inWindow.filter((a) => ['esign_pending', 'issued', 'delivered', 'rejected'].includes(a.status)).length;
  const approved = inWindow.filter((a) => ['esign_pending', 'issued', 'delivered'].includes(a.status)).length;
  const rejected = inWindow.filter((a) => a.status === 'rejected').length;
  const byApp = groupDocumentsByApp(documents);
  const flagged = inWindow.filter((a) => (byApp.get(a.id) ?? []).some((d) => docHasPotentialIssue(d.ai) || docIsUnreadable(d.ai) || d.ai?.verdict === 'warning')).length;
  return {
    range,
    submitted: inWindow.length,
    approvalRate: decided ? approved / decided : null,
    rejectionRate: decided ? rejected / decided : null,
    avgDays: agg.avgDays,
    aiFlagRate: inWindow.length ? flagged / inWindow.length : null,
    submissionsByDay: dailySubmissions(inWindow, range, now),
    byType: agg.byType,
    byStatus: agg.byStatus,
    processingByDepartment: agg.processingByDepartment,
    bottlenecks: agg.bottlenecks,
    priority: priorityCounts(inWindow, byApp, now),
    departments,
  };
}

export async function getAdminAnalytics(admin: User, range: RangeDays, now: number = Date.now()): Promise<AnalyticsView> {
  await simulateLatency();
  if (!isAdmin(admin)) throw new ServiceError('FORBIDDEN', 'Analytics are available to Super Admins.');
  const s = appStore.getState();
  const departments = s.departments.map((d) => departmentMetrics(d, s.applications, s.documents, now));
  return analyticsFor(s.applications, s.documents, range, now, departments);
}

export async function getOfficerAnalytics(officer: User, range: RangeDays, now: number = Date.now()): Promise<AnalyticsView> {
  await simulateLatency();
  if (!isOfficer(officer)) throw new ServiceError('FORBIDDEN', 'Department analytics are available to officers.');
  const s = appStore.getState();
  const apps = s.applications.filter((a) => a.departmentId === officer.departmentId);
  const dept = s.departments.find((d) => d.id === officer.departmentId)!;
  return analyticsFor(apps, s.documents, range, now, [departmentMetrics(dept, s.applications, s.documents, now)]);
}

export interface OfficerDashboard {
  pending: number;
  underReview: number;
  changes: number;
  approved: number;
  avgDays: number | null;
  priority: Record<'high' | 'normal' | 'low', number>;
  aiFlagged: number;
  queue: Application[];
}

export async function getOfficerDashboard(officer: User, now: number = Date.now()): Promise<OfficerDashboard> {
  await simulateLatency();
  if (!isOfficer(officer)) throw new ServiceError('FORBIDDEN', 'Officer dashboards are for department officers.');
  const s = appStore.getState();
  const apps = s.applications.filter((a) => a.departmentId === officer.departmentId);
  const byApp = groupDocumentsByApp(s.documents.filter((d) => apps.some((a) => a.id === d.applicationId)));
  const open = apps.filter((a) => a.status === 'in_review' || a.status === 'changes_requested' || a.status === 'ai_checking');
  const hours = apps.map(processingHours).filter((h): h is number => h !== null);
  return {
    pending: apps.filter((a) => a.status === 'in_review' && !a.reviewStartedAt).length,
    underReview: apps.filter((a) => a.status === 'in_review' && !!a.reviewStartedAt).length,
    changes: apps.filter((a) => a.status === 'changes_requested').length,
    approved: apps.filter((a) => a.status === 'esign_pending' || a.status === 'issued' || a.status === 'delivered').length,
    avgDays: average(hours) === null ? null : Math.round((average(hours)! / 24) * 10) / 10,
    priority: priorityCounts(open, byApp, now),
    aiFlagged: apps.filter((a) => (byApp.get(a.id) ?? []).some((d) => docHasPotentialIssue(d.ai) || docIsUnreadable(d.ai))).length,
    queue: open.sort((a, b) => Date.parse(a.expectedBy) - Date.parse(b.expectedBy)),
  };
}

export interface CitizenDashboard {
  activeCount: number;
  changesCount: number;
  certificateCount: number;
  latest: Application | null;
  recent: Application[];
  nextDeliveryId: string | null;
}

export async function getCitizenDashboard(citizen: User): Promise<CitizenDashboard> {
  await simulateLatency();
  if (!isCitizen(citizen)) throw new ServiceError('FORBIDDEN', 'Citizen dashboards are for applicants.');
  const s = appStore.getState();
  const mine = s.applications.filter((a) => a.citizenId === citizen.id).sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
  const active = mine.filter((a) => a.status !== 'rejected' && a.status !== 'delivered' && !(a.status === 'issued' && !a.deliveryRequested));
  const inTransit = s.deliveries.find((d) => d.status !== 'delivered' && mine.some((a) => a.id === d.applicationId));
  return {
    activeCount: active.length,
    changesCount: mine.filter((a) => a.status === 'changes_requested').length,
    certificateCount: s.certificates.filter((c) => c.citizenId === citizen.id).length,
    latest: active[0] ?? mine[0] ?? null,
    recent: mine.slice(0, 5),
    nextDeliveryId: inTransit?.id ?? null,
  };
}
