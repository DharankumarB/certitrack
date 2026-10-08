import { useEffect } from 'react';
import { Navigate, Outlet, useLocation, useParams } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { useAuth, useCurrentUser } from '../../context/AuthContext';
import type { DepartmentId, User, UserRole } from '../../types';
import { ROLE_HOME, ROLE_LABEL } from '../../config/navigation';
import { appStore } from '../../store/appStore';
import { addAudit } from '../../store/mutations';
import { actorOf } from '../../services/actors';
import { nowIso } from '../../services/api';
import { ButtonLink } from '../ui/Button';
import { EmptyState } from '../ui/Feedback';
import { homeFor } from '../../services/authService';
import { canEnterDepartmentWorkspace } from '../../services/departmentAccessService';
import { useToast } from '../../context/ToastContext';
import { isDepartmentStaff, normalizeRole } from '../../services/access';

/** Redirects anonymous visitors to sign-in, remembering where they were going. */
export function RequireSession() {
  const { user } = useAuth();
  const location = useLocation();
  if (!user) {
    const signInPath = location.pathname.startsWith('/staff/')
      ? `${location.pathname.split('/').slice(0, 3).join('/')}/login`
      : location.pathname.startsWith('/admin/')
        ? '/admin/login'
        : location.pathname.startsWith('/citizen/')
          ? '/citizen/login'
          : '/login';
    return <Navigate to={`${signInPath}?next=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  }
  return <Outlet />;
}

/** Enforces role-based access on a route group. Attempts by the wrong role are audit-logged. */
export function RequireRole({ roles }: { roles: UserRole[] }) {
  const user = useCurrentUser();
  const location = useLocation();
  const allowed = roles.some((role) => normalizeRole(role) === normalizeRole(user.role));
  useEffect(() => {
    if (allowed) return;
    const at = nowIso();
    appStore.commit((s) => addAudit(s, actorOf(user), at, { action: 'access_denied', result: 'denied', detail: `Attempted to open ${location.pathname} (${ROLE_LABEL[user.role]} access only for ${roles.map((r) => ROLE_LABEL[r]).join(', ')})` }));
  }, [allowed, location.pathname, roles, user]);
  if (!allowed) return <AccessDenied user={user} />;
  return <Outlet />;
}

export function AccessDenied({ user }: { user: User }) {
  return (
    <div className="py-6">
      <EmptyState
        icon={ShieldAlert}
        title="This area is not available to your role"
        description={`You are signed in as ${ROLE_LABEL[normalizeRole(user.role)]}. Your access is limited to your own workspace, and this attempt has been recorded in the audit log.`}
        action={<ButtonLink to={ROLE_HOME[normalizeRole(user.role)]}>Go to my dashboard</ButtonLink>}
      />
    </div>
  );
}

const DEPARTMENT_IDS: DepartmentId[] = ['caste', 'income', 'domicile'];

/** Checks both the staff role and the department requested in the URL. */
export function DepartmentRouteGuard() {
  const user = useCurrentUser();
  const location = useLocation();
  const { department } = useParams();
  const { toast } = useToast();
  const expected = department && DEPARTMENT_IDS.includes(department as DepartmentId) ? department as DepartmentId : null;
  const allowed = !!expected && canEnterDepartmentWorkspace(user, expected);
  useEffect(() => {
    if (allowed) return;
    appStore.commit((state) => addAudit(state, actorOf(user), nowIso(), {
      action: 'access_denied',
      result: 'denied',
      detail: `Attempted to open ${location.pathname} outside the assigned department.`,
    }));
    toast({ tone: 'warning', title: 'Access denied', description: 'You were redirected to your assigned department workspace.' });
  }, [allowed, location.pathname, toast, user]);
  if (!allowed) return <Navigate to={homeFor(user)} replace state={{ accessDenied: true }} />;
  return <Outlet />;
}

/** Sends legacy officer URLs through the department-scoped staff route guard. */
export function LegacyOfficerRouteRedirect() {
  const user = useCurrentUser();
  const location = useLocation();
  if (!isDepartmentStaff(user) || !DEPARTMENT_IDS.includes(user.departmentId) || !canEnterDepartmentWorkspace(user, user.departmentId)) {
    return <Navigate to={homeFor(user)} replace />;
  }
  const destination = location.pathname.replace(/^\/officer(?=\/|$)/, `/staff/${user.departmentId}`);
  return <Navigate to={`${destination}${location.search}${location.hash}`} replace />;
}
