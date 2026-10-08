import type { DepartmentId, User, UserRole } from '../types';

export type NavBadge = 'unread' | 'requiresAction' | 'pendingReview' | 'aiFlags';

export interface NavItem {
  to: string;
  label: string;
  /** Lucide icon name, resolved in components/layout/NavIcon. */
  icon: string;
  /** Optional query string that must match for the item to be active (e.g. ?status=in_review). */
  query?: Record<string, string>;
  badge?: NavBadge;
}

const roleNavCitizen = [
  { to: '/citizen/dashboard', label: 'Dashboard', icon: 'LayoutDashboard' },
  { to: '/citizen/applications', label: 'My Applications', icon: 'FolderOpen', badge: 'requiresAction' },
  { to: '/citizen/apply', label: 'Apply for Certificate', icon: 'FilePlus2' },
  { to: '/citizen/track', label: 'Track Application', icon: 'Route' },
  { to: '/citizen/locker', label: 'Certificate Locker', icon: 'Lock' },
  { to: '/citizen/notifications', label: 'Notifications', icon: 'Bell', badge: 'unread' },
  { to: '/citizen/profile', label: 'Profile', icon: 'UserRound' },
  { to: '/help', label: 'Help', icon: 'CircleHelp' },
] as const;

const roleNavDepartmentStaff = [
  { to: '/officer/dashboard', label: 'Dashboard', icon: 'LayoutDashboard' },
  { to: '/officer/applications', label: 'Application Queue', icon: 'ListChecks' },
  { to: '/officer/applications', label: 'Pending Review', icon: 'ClipboardCheck', query: { status: 'in_review' }, badge: 'pendingReview' },
  { to: '/officer/ai-verification', label: 'AI Verification', icon: 'ScanSearch', badge: 'aiFlags' },
  { to: '/officer/processed', label: 'Processed Applications', icon: 'Archive' },
  { to: '/officer/analytics', label: 'Department Analytics', icon: 'BarChart3' },
  { to: '/officer/notifications', label: 'Notifications', icon: 'Bell', badge: 'unread' },
  { to: '/officer/profile', label: 'Profile', icon: 'UserRound' },
] as const;

const roleNavSuperAdmin = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: 'LayoutDashboard' },
  { to: '/admin/applications', label: 'Applications', icon: 'FolderOpen' },
  { to: '/admin/departments', label: 'Departments', icon: 'Building2' },
  { to: '/admin/staff', label: 'Staff management', icon: 'Building2' },
  { to: '/admin/analytics', label: 'Analytics', icon: 'ChartColumn' },
  { to: '/admin/audit-logs', label: 'Audit Logs', icon: 'ShieldCheck' },
  { to: '/admin/system-activity', label: 'System Activity', icon: 'Activity' },
  { to: '/admin/settings', label: 'Settings', icon: 'Settings' },
  { to: '/admin/profile', label: 'Profile', icon: 'UserRound' },
] as const;

export const NAV: Record<UserRole, NavItem[]> = {
  citizen: [...roleNavCitizen],
  department_staff: [...roleNavDepartmentStaff],
  super_admin: [...roleNavSuperAdmin],
  officer: [...roleNavDepartmentStaff],
  admin: [...roleNavSuperAdmin],
};

export const ROLE_HOME: Record<UserRole, string> = {
  citizen: '/citizen/dashboard',
  department_staff: '/officer/dashboard',
  super_admin: '/admin/dashboard',
  officer: '/officer/dashboard',
  admin: '/admin/dashboard',
};

export const ROLE_LABEL: Record<UserRole, string> = {
  citizen: 'Citizen',
  department_staff: 'Department staff',
  super_admin: 'Super Admin',
  officer: 'Department officer',
  admin: 'Super Admin',
};

/** Mobile bottom bar shows four primary destinations; the rest live in the "More" drawer. */
export const MOBILE_PRIMARY: Record<UserRole, string[]> = {
  citizen: ['/citizen/dashboard', '/citizen/applications', '/citizen/track', '/citizen/locker'],
  department_staff: ['/officer/dashboard', '/officer/applications', '/officer/ai-verification', '/officer/processed'],
  super_admin: ['/admin/dashboard', '/admin/applications', '/admin/analytics', '/admin/audit-logs'],
  officer: ['/officer/dashboard', '/officer/applications', '/officer/ai-verification', '/officer/processed'],
  admin: ['/admin/dashboard', '/admin/applications', '/admin/analytics', '/admin/audit-logs'],
};

export function navigationFor(user: User): NavItem[] {
  if (user.role !== 'department_staff' && user.role !== 'officer') return NAV[user.role];
  const departmentId = user.departmentId as DepartmentId;
  return NAV[user.role].map((item) => ({ ...item, to: item.to.replace('/officer/', `/staff/${departmentId}/`) }));
}

export function workspaceBaseFor(user: User): string {
  if ('departmentId' in user) return `/staff/${user.departmentId}`;
  return user.role === 'citizen' ? '/citizen' : '/admin';
}

export function mobileNavigationFor(user: User): NavItem[] {
  const items = navigationFor(user);
  if (user.role !== 'department_staff' && user.role !== 'officer') {
    return items.filter((item) => MOBILE_PRIMARY[user.role].includes(item.to));
  }
  return items.filter((item) => !item.query && (item.to.endsWith('/dashboard') || item.to.endsWith('/applications') || item.to.endsWith('/ai-verification') || item.to.endsWith('/processed')));
}
