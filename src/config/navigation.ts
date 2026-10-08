import type { UserRole } from '../types';

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

export const NAV: Record<UserRole, NavItem[]> = {
  citizen: [
    { to: '/citizen/dashboard', label: 'Dashboard', icon: 'LayoutDashboard' },
    { to: '/citizen/applications', label: 'My Applications', icon: 'FolderOpen', badge: 'requiresAction' },
    { to: '/citizen/apply', label: 'Apply for Certificate', icon: 'FilePlus2' },
    { to: '/citizen/track', label: 'Track Application', icon: 'Route' },
    { to: '/citizen/locker', label: 'Certificate Locker', icon: 'Lock' },
    { to: '/citizen/notifications', label: 'Notifications', icon: 'Bell', badge: 'unread' },
    { to: '/citizen/profile', label: 'Profile', icon: 'UserRound' },
    { to: '/help', label: 'Help', icon: 'CircleHelp' },
  ],
  officer: [
    { to: '/officer/dashboard', label: 'Dashboard', icon: 'LayoutDashboard' },
    { to: '/officer/applications', label: 'Application Queue', icon: 'ListChecks' },
    { to: '/officer/applications', label: 'Pending Review', icon: 'ClipboardCheck', query: { status: 'in_review' }, badge: 'pendingReview' },
    { to: '/officer/ai-verification', label: 'AI Verification', icon: 'ScanSearch', badge: 'aiFlags' },
    { to: '/officer/processed', label: 'Processed Applications', icon: 'Archive' },
    { to: '/officer/analytics', label: 'Department Analytics', icon: 'BarChart3' },
    { to: '/officer/notifications', label: 'Notifications', icon: 'Bell', badge: 'unread' },
    { to: '/officer/profile', label: 'Profile', icon: 'UserRound' },
  ],
  admin: [
    { to: '/admin/dashboard', label: 'Dashboard', icon: 'LayoutDashboard' },
    { to: '/admin/applications', label: 'Applications', icon: 'FolderOpen' },
    { to: '/admin/departments', label: 'Departments', icon: 'Building2' },
    { to: '/admin/analytics', label: 'Analytics', icon: 'ChartColumn' },
    { to: '/admin/audit-logs', label: 'Audit Logs', icon: 'ShieldCheck' },
    { to: '/admin/system-activity', label: 'System Activity', icon: 'Activity' },
    { to: '/admin/settings', label: 'Settings', icon: 'Settings' },
    { to: '/admin/profile', label: 'Profile', icon: 'UserRound' },
  ],
};

export const ROLE_HOME: Record<UserRole, string> = {
  citizen: '/citizen/dashboard',
  officer: '/officer/dashboard',
  admin: '/admin/dashboard',
};

export const ROLE_LABEL: Record<UserRole, string> = {
  citizen: 'Citizen',
  officer: 'Department officer',
  admin: 'Super Admin',
};

/** Mobile bottom bar shows four primary destinations; the rest live in the "More" drawer. */
export const MOBILE_PRIMARY: Record<UserRole, string[]> = {
  citizen: ['/citizen/dashboard', '/citizen/applications', '/citizen/track', '/citizen/locker'],
  officer: ['/officer/dashboard', '/officer/applications', '/officer/ai-verification', '/officer/processed'],
  admin: ['/admin/dashboard', '/admin/applications', '/admin/analytics', '/admin/audit-logs'],
};
