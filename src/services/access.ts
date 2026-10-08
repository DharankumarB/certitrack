import type { AdminUser, Application, CitizenUser, DepartmentId, OfficerUser, User } from '../types';

/**
 * Role-based access rules. These are the single source of truth for data scoping:
 *  - Citizen: only their own applications.
 *  - Department officer: only applications in their own department (no exceptions).
 *  - Super Admin: all applications and analytics, but NOT the content of citizen documents.
 */
export const isCitizen = (u: User | null | undefined): u is CitizenUser => u?.role === 'citizen';
export const isOfficer = (u: User | null | undefined): u is OfficerUser => u?.role === 'officer';
export const isAdmin = (u: User | null | undefined): u is AdminUser => u?.role === 'admin';

export function departmentOf(u: User | null | undefined): DepartmentId | null {
  return isOfficer(u) ? u.departmentId : null;
}

export function canViewApplication(user: User | null | undefined, app: Application): boolean {
  if (!user) return false;
  if (isAdmin(user)) return true;
  if (isOfficer(user)) return user.departmentId === app.departmentId;
  return user.id === app.citizenId;
}

/** Document contents (files, OCR, AI detail) are visible to the owner and to their department only. */
export function canViewDocumentContent(user: User | null | undefined, app: Application): boolean {
  if (!user || isAdmin(user)) return false;
  return canViewApplication(user, app);
}

export function canDecide(user: User | null | undefined, app: Application): boolean {
  return isOfficer(user) && user.departmentId === app.departmentId;
}

export function visibleApplications(user: User | null | undefined, apps: Application[]): Application[] {
  if (!user) return [];
  return apps.filter((a) => canViewApplication(user, a));
}
