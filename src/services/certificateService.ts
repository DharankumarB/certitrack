import type { AppData, Certificate, User } from '../types';
import { appStore } from '../store/appStore';
import { addAudit, findApplication } from '../store/mutations';
import { CERTIFICATE_TYPES } from '../config/certificateTypes';
import { ServiceError, nowIso, simulateLatency } from './api';
import { actorOf, PUBLIC_ACTOR } from './actors';
import { isAdmin, isCitizen, isOfficer } from './access';

function canSee(viewer: User, cert: Certificate, state: AppData): boolean {
  if (isAdmin(viewer)) return true;
  if (isCitizen(viewer)) return cert.citizenId === viewer.id;
  if (isOfficer(viewer)) return findApplication(state, cert.applicationId)?.departmentId === viewer.departmentId;
  return false;
}

export async function listCertificates(viewer: User): Promise<Certificate[]> {
  await simulateLatency();
  const state = appStore.getState();
  return state.certificates.filter((c) => canSee(viewer, c, state)).sort((a, b) => Date.parse(b.issuedAt) - Date.parse(a.issuedAt));
}

export async function getCertificate(viewer: User, id: string): Promise<Certificate> {
  await simulateLatency();
  const state = appStore.getState();
  const cert = state.certificates.find((c) => c.id === id);
  if (!cert || !canSee(viewer, cert, state)) throw new ServiceError('NOT_FOUND', 'This certificate is not in your locker.');
  return cert;
}

export async function recordCertificateAction(viewer: User, certificateId: string, action: 'certificate_viewed' | 'certificate_downloaded', detail = ''): Promise<void> {
  const cert = appStore.getState().certificates.find((c) => c.id === certificateId);
  if (!cert) return;
  const at = nowIso();
  appStore.commit((s) => addAudit(s, actorOf(viewer), at, { action, applicationId: cert.applicationId, detail: detail || `${cert.certificateNumber}` }));
}

export interface VerificationResult {
  state: 'valid' | 'revoked' | 'not_found';
  certificateNumber?: string;
  typeLabel?: string;
  issuedAt?: string;
  validUntil?: string | null;
  applicantName?: string | null;
  district?: string;
}

/** Public verification by verification code. Applicant name appears only when the share link includes consent. */
export async function verifyCertificate(code: string, showName: boolean): Promise<VerificationResult> {
  await simulateLatency(260);
  const normalised = code.trim().toUpperCase();
  const cert = appStore.getState().certificates.find((c) => c.verificationCode === normalised);
  const at = nowIso();
  appStore.commit((s) =>
    addAudit(s, PUBLIC_ACTOR, at, {
      action: 'certificate_verified',
      result: cert ? 'success' : 'failed',
      applicationId: cert?.applicationId ?? null,
      detail: cert ? `Verification ${cert.certificateNumber}` : 'Unknown verification code',
    }),
  );
  if (!cert) return { state: 'not_found' };
  return {
    state: cert.status === 'active' ? 'valid' : 'revoked',
    certificateNumber: cert.certificateNumber,
    typeLabel: CERTIFICATE_TYPES[cert.certificateType].label,
    issuedAt: cert.issuedAt,
    validUntil: cert.validUntil,
    applicantName: showName ? cert.applicantName : null,
    district: cert.district,
  };
}

export async function createShareLink(viewer: User, certificateId: string, showName: boolean): Promise<string> {
  await simulateLatency(120);
  const cert = await getCertificate(viewer, certificateId);
  const at = nowIso();
  appStore.commit((s) => addAudit(s, actorOf(viewer), at, { action: 'certificate_shared', applicationId: cert.applicationId, detail: `${cert.certificateNumber} · ${showName ? 'name shown with consent' : 'name hidden'}` }));
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}/verify/${cert.verificationCode}${showName ? '?name=1' : ''}`;
}
