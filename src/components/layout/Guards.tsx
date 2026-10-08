import { useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { useAuth, useCurrentUser } from '../../context/AuthContext';
import type { User, UserRole } from '../../types';
import { ROLE_HOME, ROLE_LABEL } from '../../config/navigation';
import { appStore } from '../../store/appStore';
import { addAudit } from '../../store/mutations';
import { actorOf } from '../../services/actors';
import { nowIso } from '../../services/api';
import { ButtonLink } from '../ui/Button';
import { EmptyState } from '../ui/Feedback';

/** Redirects anonymous visitors to sign-in, remembering where they were going. */
export function RequireSession() {
  const { user } = useAuth();
  const location = useLocation();
  if (!user) {
    return <Navigate to={`/login?next=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  }
  return <Outlet />;
}

/** Enforces role-based access on a route group. Attempts by the wrong role are audit-logged. */
export function RequireRole({ roles }: { roles: UserRole[] }) {
  const user = useCurrentUser();
  const location = useLocation();
  const allowed = roles.includes(user.role);
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
        description={`You are signed in as ${ROLE_LABEL[user.role]}. Your access is limited to your own workspace, and this attempt has been recorded in the audit log.`}
        action={<ButtonLink to={ROLE_HOME[user.role]}>Go to my dashboard</ButtonLink>}
      />
    </div>
  );
}
