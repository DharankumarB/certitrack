/** Human-readable labels for every audited action key. */
export const AUDIT_ACTIONS: Record<string, string> = {
  login: 'Signed in',
  login_failed: 'Sign-in failed',
  logout: 'Signed out',
  signup: 'Account created',
  password_reset_requested: 'Password reset requested',
  application_submitted: 'Application submitted',
  document_uploaded: 'Document uploaded',
  document_replaced: 'Document replaced',
  ai_check_run: 'AI check run',
  review_started: 'Review started',
  document_reviewed: 'Document reviewed',
  changes_requested: 'Changes requested',
  application_approved: 'Application approved',
  application_rejected: 'Application rejected',
  esign_completed: 'e-Sign completed',
  certificate_issued: 'Certificate issued',
  certificate_viewed: 'Certificate viewed',
  certificate_downloaded: 'Certificate downloaded',
  certificate_shared: 'Share link created',
  certificate_verified: 'Certificate verified',
  delivery_dispatched: 'Delivery dispatched',
  delivery_updated: 'Delivery updated',
  delivery_delivered: 'Delivery completed',
  access_denied: 'Access denied',
  contact_revealed: 'Contact details revealed',
  priority_changed: 'Priority changed',
  sla_updated: 'SLA updated',
  settings_updated: 'Settings updated',
  officer_status_changed: 'Officer access changed',
  profile_updated: 'Profile updated',
  preferences_updated: 'Notification preferences updated',
  demo_reset: 'Demo data reset',
  session_expired: 'Session ended',
  system_health_check: 'System health check',
};

export function auditActionLabel(action: string): string {
  return AUDIT_ACTIONS[action] ?? action.replace(/_/g, ' ');
}

/** Actions that count as security-relevant for the audit filter and highlighting. */
export const SECURITY_ACTIONS = new Set(['login_failed', 'access_denied', 'contact_revealed', 'officer_status_changed', 'session_expired']);
