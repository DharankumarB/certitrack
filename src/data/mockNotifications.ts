import type { AppNotification, User } from '../types';
import { DEMO_ADMIN_ID, DEMO_CITIZEN_ID, DEMO_OFFICER_ID } from './mockUsers';
import { makeNotification } from './factories';
import { ago } from './factories';

/** Curated notifications for the three demo accounts. */
export function curatedNotifications(now: number, users: User[]): AppNotification[] {
  const byId = (id: string) => users.find((u) => u.id === id);
  const citizen = byId(DEMO_CITIZEN_ID);
  const officer = byId(DEMO_OFFICER_ID);
  const admin = byId(DEMO_ADMIN_ID);
  const list: AppNotification[] = [];
  let n = 0;
  const id = () => `ntf-${String(++n).padStart(4, '0')}`;
  const at = (days: number, hours = 0, minutes = 0) => ago(now, days, hours, minutes);

  if (citizen) {
    const c = (opts: Parameters<typeof makeNotification>[3], when: string) => list.push(makeNotification(id(), citizen, when, opts));
    c({ title: 'Application received', body: 'Application received. Track it in CertiTrack. (APP-10102)', kind: 'application', tone: 'info', applicationId: 'APP-10102', read: true }, at(40, 3));
    c({ title: 'Certificate issued', body: 'Your domicile certificate has been issued. Download it from your locker. (APP-10102)', kind: 'certificate', tone: 'success', applicationId: 'APP-10102', read: true }, at(37, 4, 3));
    c({ title: 'Delivered', body: 'Your physical certificate was delivered to your registered address. (APP-10102)', kind: 'delivery', tone: 'success', applicationId: 'APP-10102', read: true }, at(34, 1));
    c({ title: 'Certificate issued', body: 'Your income certificate has been issued. Download it from your locker. (APP-10158)', kind: 'certificate', tone: 'success', applicationId: 'APP-10158', read: true }, at(17, 6, 3));
    c({ title: 'Application rejected', body: 'Application APP-10203 was rejected: the caste evidence was issued to a different applicant. You may apply again with the correct evidence.', kind: 'rejection', tone: 'danger', applicationId: 'APP-10203', read: true }, at(10, 4));
    c({ title: 'Application approved', body: 'Your caste certificate has been approved. Digital signing is in progress. (APP-10294)', kind: 'approval', tone: 'success', applicationId: 'APP-10294', read: true }, at(4, 2));
    c({ title: 'Certificate issued', body: 'Your caste certificate has been issued. Download it from your locker. (APP-10294)', kind: 'certificate', tone: 'success', applicationId: 'APP-10294', read: true }, at(4, 2, -3));
    c({ title: 'Dispatched for delivery', body: 'Your physical certificate is on its way. Tracking ID CTK908172364IN. (APP-10294)', kind: 'delivery', tone: 'info', applicationId: 'APP-10294', read: false }, at(4, 1));
    c({ title: 'Document needs a second look', body: 'Your income proof passed most checks. An officer will double-check one detail. (APP-10311)', kind: 'application', tone: 'warning', applicationId: 'APP-10311', read: false }, at(3, 2));
    c({ title: 'Needs changes', body: 'Needs changes: address proof is not readable. Upload a clear scan of the full page and resubmit. Your other documents are accepted. (APP-10329)', kind: 'changes', tone: 'warning', applicationId: 'APP-10329', read: false }, at(2, 2));
    c({ title: 'Application approved', body: 'Your caste certificate has been approved. Digital signing is in progress. (APP-10347)', kind: 'approval', tone: 'success', applicationId: 'APP-10347', read: false }, at(0, 0, 4));
    c({ title: 'Application received', body: 'Application received. Track it in CertiTrack. (APP-10347)', kind: 'application', tone: 'info', applicationId: 'APP-10347', read: true }, at(2, 4));
  }

  if (officer) {
    const o = (opts: Parameters<typeof makeNotification>[3], when: string) => list.push(makeNotification(id(), officer, when, opts));
    o({ title: 'New application in your queue', body: 'Anjali Pillai submitted a caste certificate (APP-10415). AI pre-check is complete.', kind: 'officer', tone: 'info', applicationId: 'APP-10415', read: false }, at(0, 22));
    o({ title: 'AI flagged a possible duplicate', body: 'Suresh Babu’s identity file (APP-10388) matches an earlier upload pattern. Compare originals before deciding.', kind: 'officer', tone: 'warning', applicationId: 'APP-10388', read: false }, at(1, 5));
    o({ title: 'Sent for e-sign', body: 'APP-10347 was approved and queued for digital signing.', kind: 'officer', tone: 'success', applicationId: 'APP-10347', read: true }, at(0, 0, 4));
    o({ title: 'Document resubmitted', body: 'Meera Krishnan re-uploaded the caste evidence for APP-10294. It is back in your queue.', kind: 'officer', tone: 'info', applicationId: 'APP-10294', read: true }, at(5, 1));
  }

  if (admin) {
    const a = (opts: Parameters<typeof makeNotification>[3], when: string) => list.push(makeNotification(id(), admin, when, { ...opts, channels: ['in_app'] }));
    a({ title: 'Caste queue above target', body: 'Caste Certificate Department has 4 applications waiting for review (target: 3). See Departments → Caste.', kind: 'system', tone: 'warning', applicationId: null, read: false }, at(0, 1));
    a({ title: 'AI flagged documents for officers', body: 'Two documents across caste and income queues carry duplicate or edit indicators. Officers have been notified.', kind: 'system', tone: 'warning', applicationId: null, read: false }, at(0, 2));
    a({ title: 'Courier advisory (simulated)', body: 'Partner courier reported a 1-day delay in the Tiruppur region. Dispatches are continuing.', kind: 'delivery', tone: 'info', applicationId: null, read: true }, at(1, 3));
    a({ title: 'Repeated sign-in failures blocked', body: 'Three failed sign-in attempts were blocked for an officer account. The account remains active.', kind: 'security', tone: 'danger', applicationId: null, read: true }, at(0, 2, 10));
    a({ title: 'Demo dataset loaded', body: 'Synthetic demo data was generated: curated stories plus 140 applications across three departments.', kind: 'system', tone: 'info', applicationId: null, read: true }, at(0, 0, 45));
  }

  return list;
}
