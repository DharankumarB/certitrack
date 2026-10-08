import type { AdminUser, Application, CitizenUser, DepartmentId, OfficerUser, User } from '../types';

export const normalizeRole = (role: User['role'] | string): User['role'] => {
  if (role === 'officer' || role === 'department_staff') return 'department_staff';
  if (role === 'admin' || role === 'super_admin') return 'super_admin';
  return role as User['role'];
};

/**
 * Role-based access rules. These are the single source of truth for data scoping:
 *  - Citizen: only their own applications.
 *  - Department staff: only applications in their own department (no exceptions).
 *  - Super Admin: all applications and analytics, but NOT the content of citizen documents.
 */
export const isCitizen = (u: User | null | undefined): u is CitizenUser => u?.role === 'citizen';
export const isDepartmentStaff = (u: User | null | undefined): u is OfficerUser => u?.role === 'department_staff' || u?.role === 'officer';
export const isOfficer = (u: User | null | undefined): u is OfficerUser => isDepartmentStaff(u);
export const isSuperAdmin = (u: User | null | undefined): u is AdminUser => u?.role === 'super_admin' || u?.role === 'admin';
export const isAdmin = (u: User | null | undefined): u is AdminUser => isSuperAdmin(u);

export function departmentOf(u: User | null | undefined): DepartmentId | null {
  return isDepartmentStaff(u) ? u.departmentId : null;
}

export function canViewApplication(user: User | null | undefined, app: Application): boolean {
  if (!user) return false;
  if (isSuperAdmin(user)) return true;
  if (isDepartmentStaff(user)) return user.departmentId === app.departmentId;
  return user.id === app.citizenId;
}

/** Document contents (files, OCR, AI detail) are visible to the owner and to their department only. */
export function canViewDocumentContent(user: User | null | undefined, app: Application): boolean {
  if (!user || isSuperAdmin(user)) return false;
  return canViewApplication(user, app);
}

export function canDecide(user: User | null | undefined, app: Application): boolean {
  return isDepartmentStaff(user) && user.departmentId === app.departmentId;
}

export function visibleApplications(user: User | null | undefined, apps: Application[]): Application[] {
  if (!user) return [];
  return apps.filter((a) => canViewApplication(user, a));
}
