import type { AuditLog, User } from '../types';
import { DEMO_ADMIN_ID, DEMO_CITIZEN_ID, DEMO_OFFICER_ID } from './mockUsers';
import { ago, makeAudit } from './factories';

/** Curated audit trail that matches the curated application story. */
export function curatedAuditLogs(now: number, users: User[]): AuditLog[] {
  const officer = users.find((u) => u.id === DEMO_OFFICER_ID);
  const citizen = users.find((u) => u.id === DEMO_CITIZEN_ID);
  const admin = users.find((u) => u.id === DEMO_ADMIN_ID);
  const geetha = users.find((u) => u.id === 'usr-officer-domicile-1');
  const sathish = users.find((u) => u.id === 'usr-officer-income-1');
  const log: AuditLog[] = [];
  let n = 0;
  const id = () => `aud-c-${String(++n).padStart(3, '0')}`;
  const at = (days: number, hours = 0, minutes = 0) => ago(now, days, hours, minutes);
  const who = (u: User | undefined, fallback: string) => ({ id: u?.id ?? null, name: u?.name ?? fallback, role: (u?.role ?? 'citizen') as AuditLog['actorRole'] });

  const o = who(officer, 'Deepa Srinivasan');
  const c = who(citizen, 'Meera Krishnan');
  const a = who(admin, 'Arjun Mehta');

  log.push(makeAudit(id(), at(0, 0, 40), a, 'login', { detail: 'Signed in with the demo account' }));
  log.push(makeAudit(id(), at(0, 0, 25), c, 'login', { detail: 'Signed in with the demo account' }));
  log.push(makeAudit(id(), at(0, 1), o, 'login', { detail: 'Signed in with the demo account', departmentId: 'caste' }));
  log.push(makeAudit(id(), at(0, 0, 40), o, 'access_denied', { result: 'denied', departmentId: 'caste', applicationId: 'APP-10421', detail: 'Attempted to open an Income Certificate file from the Caste queue. Blocked by department isolation.' }));
  log.push(makeAudit(id(), at(0, 2, 10), { id: null, name: 'Unknown account', role: 'public' }, 'login_failed', { result: 'failed', detail: 'Unknown account. Sign-in rejected.' }));
  log.push(makeAudit(id(), at(0, 0, 25), c, 'certificate_viewed', { applicationId: 'APP-10294', detail: 'Opened CTK-CST-2026-000309 in the Certificate Locker' }));
  log.push(makeAudit(id(), at(3, 3), c, 'application_submitted', { applicationId: 'APP-10311', departmentId: 'income', detail: 'Income Certificate submitted with 4 documents' }));
  log.push(makeAudit(id(), at(3, 2, 57), { id: null, name: 'AI pre-verification (prototype)', role: 'system' }, 'ai_check_run', { applicationId: 'APP-10311', departmentId: 'income', detail: '1 warning: income proof date needs review' }));
  log.push(makeAudit(id(), at(2, 2), who(geetha, 'Geetha Lakshmi'), 'changes_requested', { applicationId: 'APP-10329', departmentId: 'domicile', detail: 'Address proof not readable. Re-upload requested.' }));
  log.push(makeAudit(id(), at(5, 2), o, 'review_started', { applicationId: 'APP-10294', departmentId: 'caste' }));
  log.push(makeAudit(id(), at(4, 3), o, 'document_reviewed', { applicationId: 'APP-10294', departmentId: 'caste', detail: 'Accepted: Government photo ID' }));
  log.push(makeAudit(id(), at(4, 2), o, 'application_approved', { applicationId: 'APP-10294', departmentId: 'caste', detail: 'Approved after document verification' }));
  log.push(makeAudit(id(), at(4, 2), { id: null, name: 'CertiTrack system', role: 'system' }, 'esign_completed', { applicationId: 'APP-10294', departmentId: 'caste', detail: 'Simulated e-sign (prototype)' }));
  log.push(makeAudit(id(), at(4, 2), { id: null, name: 'CertiTrack system', role: 'system' }, 'certificate_issued', { applicationId: 'APP-10294', departmentId: 'caste', detail: 'CTK-CST-2026-000309' }));
  log.push(makeAudit(id(), at(4, 1), { id: null, name: 'Partner courier (simulated)', role: 'system' }, 'delivery_dispatched', { applicationId: 'APP-10294', departmentId: 'caste', detail: 'Tracking CTK908172364IN' }));
  log.push(makeAudit(id(), at(10, 4), o, 'application_rejected', { applicationId: 'APP-10203', departmentId: 'caste', result: 'success', detail: 'Caste evidence issued to a different applicant' }));
  log.push(makeAudit(id(), at(1, 1), sathish ? who(sathish, 'Sathish Kumar') : o, 'document_reviewed', { applicationId: 'APP-10158', departmentId: 'income', detail: 'Accepted: Income proof' }));
  log.push(makeAudit(id(), at(0, 3), a, 'settings_updated', { detail: 'Simulation speed kept at normal' }));

  return log;
}
