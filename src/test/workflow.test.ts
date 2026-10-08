import { describe, expect, it, beforeAll } from 'vitest';
import { appStore } from '../store/appStore';
import { buildSeedData } from '../data/seed';
import { approveApplication, requestChanges, rejectApplication, createApplication, getApplication } from '../services/applicationService';
import { decideDocument } from '../services/documentService';
import { runSimulation } from '../services/simulation';
import { ServiceError } from '../services/api';
import { SAMPLE_CITIZEN_ID } from '../data/mockUsers';
import type { CitizenUser, OfficerUser } from '../types';

const officer = (): OfficerUser => ({
  id: 'test-caste-staff',
  role: 'department_staff',
  name: 'Test Staff',
  email: 'staff@example.test',
  mobile: '',
  createdAt: new Date().toISOString(),
  passwordDigest: '',
  active: true,
  accountStatus: 'approved',
  lastLoginAt: null,
  employeeId: 'CASTE-TEST',
  departmentId: 'caste',
  designation: 'Test Officer',
});
const citizen = (): CitizenUser => appStore.getState().users.find((u) => u.id === SAMPLE_CITIZEN_ID)! as CitizenUser;

beforeAll(() => {
  appStore.replace(buildSeedData(Date.now()));
});

describe('officer decisions and live propagation', () => {
  it('blocks officers from opening another department’s file and records the attempt', async () => {
    await expect(getApplication(officer(), 'APP-10421')).rejects.toBeInstanceOf(ServiceError);
    const denied = appStore.getState().auditLogs.find((l) => l.action === 'access_denied' && l.applicationId === 'APP-10421');
    expect(denied?.result).toBe('denied');
  });

  it('will not approve a file with unresolved warnings', async () => {
    await expect(approveApplication(officer(), 'APP-10388')).rejects.toThrow(/Accept each document|Request changes/);
  });

  it('requires a reason before requesting changes', async () => {
    await expect(requestChanges(officer(), 'APP-10388', { flaggedDocumentIds: ['doc-10388-identity'], remark: 'short' })).rejects.toBeInstanceOf(ServiceError);
  });

  it('approves a clean file, then e-sign issues the certificate and notifies the citizen', async () => {
    await approveApplication(officer(), 'APP-10415', { remark: 'Verified against originals.' });
    const pending = appStore.getState().applications.find((a) => a.id === 'APP-10415')!;
    expect(pending.status).toBe('esign_pending');
    // Simulate time passing beyond the e-sign deadline.
    const changed = runSimulation(Date.now() + 60 * 60 * 1000);
    expect(changed).toBe(true);
    const issued = appStore.getState().applications.find((a) => a.id === 'APP-10415')!;
    expect(issued.status).toBe('issued');
    expect(appStore.getState().certificates.some((c) => c.applicationId === 'APP-10415' && c.certificateType === 'caste')).toBe(true);
    expect(appStore.getState().notifications.some((n) => n.applicationId === 'APP-10415' && n.recipientId === issued.citizenId && n.kind === 'certificate')).toBe(true);
    expect(appStore.getState().auditLogs.some((l) => l.applicationId === 'APP-10415' && l.action === 'certificate_issued')).toBe(true);
  });

  it('rejects with a reason and notifies the citizen', async () => {
    await rejectApplication(officer(), 'APP-10388', { reason: 'Duplicate of an existing application', remark: 'The identity file matches another applicant.' });
    const app = appStore.getState().applications.find((a) => a.id === 'APP-10388')!;
    expect(app.status).toBe('rejected');
    expect(app.rejectionReason).toContain('Duplicate');
    expect(appStore.getState().notifications.some((n) => n.applicationId === 'APP-10388' && n.kind === 'rejection')).toBe(true);
  });

  it('is idempotent: repeating the same simulation time changes nothing the second time', () => {
    const later = Date.now() + 2 * 60 * 60 * 1000;
    runSimulation(later);
    const rev = appStore.getState().rev;
    expect(runSimulation(later)).toBe(false);
    expect(appStore.getState().rev).toBe(rev);
  });

  it('creates an application that appears in the citizen’s list and the officer queue', async () => {
    const created = await createApplication(citizen(), {
      certificateType: 'income',
      personal: {
        name: 'Meera Krishnan',
        dob: '1994-03-18',
        gender: 'Female',
        mobile: '9000000001',
        email: 'meera.krishnan@example.test',
        address: '14, Gandhi Street, Ward 7, near the Panchayat Office',
        district: 'Coimbatore',
        taluk: 'Pollachi',
        village: 'Kinathukadavu',
      },
      details: { annualIncome: '250000', incomeSource: 'Salaried employment', familyMembers: '3', financialYear: '2026-27' },
      documents: [
        { documentId: 'doc-new-1', requirementId: 'identity', fileName: 'aadhaar-card.pdf', fileSize: 210000, mimeType: 'application/pdf', blobKey: null, ai: { documentId: 'doc-new-1', engine: 'test', runAt: new Date().toISOString(), durationMs: 1, confidence: 0.95, verdict: 'verified', detectedType: 'Government photo ID', expectedType: 'Government photo ID', ocr: [], checks: [], issues: [], recommendedAction: '', fingerprint: 'x' } },
        { documentId: 'doc-new-2', requirementId: 'address', fileName: 'electricity-bill.pdf', fileSize: 180000, mimeType: 'application/pdf', blobKey: null, ai: { documentId: 'doc-new-2', engine: 'test', runAt: new Date().toISOString(), durationMs: 1, confidence: 0.95, verdict: 'verified', detectedType: 'Address proof', expectedType: 'Address proof', ocr: [], checks: [], issues: [], recommendedAction: '', fingerprint: 'x' } },
        { documentId: 'doc-new-3', requirementId: 'income_proof', fileName: 'salary-slip.pdf', fileSize: 140000, mimeType: 'application/pdf', blobKey: null, ai: { documentId: 'doc-new-3', engine: 'test', runAt: new Date().toISOString(), durationMs: 1, confidence: 0.95, verdict: 'verified', detectedType: 'Income proof', expectedType: 'Income proof', ocr: [], checks: [], issues: [], recommendedAction: '', fingerprint: 'x' } },
        { documentId: 'doc-new-4', requirementId: 'photo', fileName: 'passport-photo.jpg', fileSize: 98000, mimeType: 'image/jpeg', blobKey: null, ai: { documentId: 'doc-new-4', engine: 'test', runAt: new Date().toISOString(), durationMs: 1, confidence: 0.95, verdict: 'verified', detectedType: 'Passport-size photo', expectedType: 'Passport-size photo', ocr: [], checks: [], issues: [], recommendedAction: '', fingerprint: 'x' } },
      ],
      deliveryRequested: false,
      declared: true,
    });
    expect(created.id).toMatch(/^APP-\d+$/);
    expect(created.status).toBe('in_review');
    expect(created.timeline.map((e) => e.key)).toEqual(['submitted', 'ai_check', 'queued']);
    expect(appStore.getState().notifications.some((n) => n.applicationId === created.id && n.recipientId === SAMPLE_CITIZEN_ID)).toBe(true);
  });

  it('refuses document decisions on a closed application', async () => {
    await expect(decideDocument(officer(), 'doc-10388-identity', { decision: 'accepted', remark: '' })).rejects.toBeInstanceOf(ServiceError);
  });
});
