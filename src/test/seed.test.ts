import { describe, expect, it } from 'vitest';
import { buildSeedData } from '../data/seed';
import { CERTIFICATE_TYPES } from '../config/certificateTypes';
import { canViewApplication, canViewDocumentContent } from '../services/access';
import { analyzeDocument } from '../services/aiEngine';
import { isValidEmail, isValidMobile, validateDob, validateName, validatePassword } from '../utils/validation';
import { computeSteps } from '../utils/stages';
import { filterApplications, groupDocumentsByApp } from '../utils/applicationRules';
import { stageBottlenecks } from '../utils/analytics';
import { DEFAULT_ADMIN_EMAIL, DEFAULT_ADMIN_ID, DEFAULT_ADMIN_PASSWORD, SAMPLE_CITIZEN_ID } from '../data/mockUsers';
import type { AdminUser, OfficerUser } from '../types';

const NOW = Date.parse('2026-10-08T09:00:00.000Z');
const data = buildSeedData(NOW);

describe('seed data', () => {
  it('seeds only the documented prototype administrator as an active account', () => {
    const admin = data.users.find((user) => user.id === DEFAULT_ADMIN_ID);
    expect(admin).toMatchObject({
      email: DEFAULT_ADMIN_EMAIL,
      role: 'super_admin',
      active: true,
      accountStatus: 'approved',
    });
    expect(data.users.filter((user) => user.active)).toEqual([admin]);
    expect(DEFAULT_ADMIN_PASSWORD).toBe('admin@123');
  });

  it('keeps fictional sample profiles disabled and without credential material', () => {
    for (const user of data.users.filter((candidate) => candidate.id !== DEFAULT_ADMIN_ID)) {
      expect(user.active).toBe(false);
      expect(user.passwordDigest).toBe('');
    }
  });

  it('generates unique application IDs and at least 150 applications', () => {
    const ids = data.applications.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.length).toBeGreaterThanOrEqual(150);
  });

  it('gives every application one document per required slot, each with an AI result', () => {
    const byApp = groupDocumentsByApp(data.documents);
    for (const app of data.applications) {
      const docs = byApp.get(app.id) ?? [];
      const req = CERTIFICATE_TYPES[app.certificateType].requirements;
      expect(docs.length, app.id).toBe(req.length);
      for (const d of docs) expect(d.ai, `${app.id} ${d.id}`).not.toBeNull();
    }
  });

  it('keeps timelines in chronological order and status consistent with the timeline', () => {
    for (const app of data.applications) {
      const times = app.timeline.map((e) => Date.parse(e.at));
      expect(times.every((t, i) => i === 0 || t >= times[i - 1]!), app.id).toBe(true);
      expect(Date.parse(app.submittedAt) <= NOW, app.id).toBe(true);
      if (app.status === 'issued' || app.status === 'delivered') expect(app.timeline.some((e) => e.key === 'issued'), app.id).toBe(true);
      if (app.status === 'rejected') expect(app.timeline.some((e) => e.key === 'rejected'), app.id).toBe(true);
      if (app.status === 'changes_requested') expect(app.timeline.some((e) => e.key === 'changes_requested'), app.id).toBe(true);
    }
  });

  it('has a curated caste file in review with AI warnings and an income file for isolation tests', () => {
    const caste = data.applications.find((a) => a.id === 'APP-10388')!;
    const income = data.applications.find((a) => a.id === 'APP-10421')!;
    expect(caste.departmentId).toBe('caste');
    expect(income.departmentId).toBe('income');
    expect(caste.status).toBe('in_review');
    const officer: OfficerUser = {
      id: 'test-officer',
      role: 'department_staff',
      name: 'Test Officer',
      email: 'officer@example.test',
      mobile: '',
      createdAt: new Date(NOW).toISOString(),
      passwordDigest: '',
      active: true,
      lastLoginAt: null,
      accountStatus: 'approved',
      employeeId: 'CASTE-001',
      departmentId: 'caste',
      designation: 'Test Officer',
    };
    expect(canViewApplication(officer, caste)).toBe(true);
    expect(canViewApplication(officer, income)).toBe(false);
  });

  it('scopes citizens to their own applications and denies admins document content', () => {
    const citizen = data.users.find((u) => u.id === SAMPLE_CITIZEN_ID)!;
    const admin: AdminUser = {
      id: 'test-admin',
      role: 'super_admin',
      name: 'Test Admin',
      email: 'admin@example.test',
      mobile: '',
      createdAt: new Date(NOW).toISOString(),
      passwordDigest: '',
      active: true,
      lastLoginAt: null,
      accountStatus: 'approved',
      designation: 'Test Administrator',
      systemAccess: [],
    };
    const mine = data.applications.filter((a) => canViewApplication(citizen, a));
    expect(mine.every((a) => a.citizenId === citizen.id)).toBe(true);
    expect(mine.length).toBeGreaterThan(0);
    const any = data.applications[0]!;
    expect(canViewDocumentContent(admin, any)).toBe(false);
  });

  it('computes the six-stage progress for each curated status', () => {
    const get = (id: string) => data.applications.find((a) => a.id === id)!;
    const delivery = (id: string) => data.deliveries.find((d) => d.applicationId === id) ?? null;
    const steps = computeSteps(get('APP-10294'), delivery('APP-10294'));
    expect(steps.map((s) => s.state)).toEqual(['complete', 'complete', 'complete', 'complete', 'complete', 'current']);
    const rejected = computeSteps(get('APP-10203'), null);
    expect(rejected.find((s) => s.id === 'review')?.state).toBe('blocked');
  });

  it('filters the queue by AI result and open status', () => {
    const caste = data.applications.filter((a) => a.departmentId === 'caste');
    const docs = groupDocumentsByApp(data.documents);
    const open = filterApplications(caste, { status: 'open' }, docs, NOW);
    expect(open.length).toBeGreaterThan(0);
    expect(open.every((a) => ['ai_checking', 'in_review', 'changes_requested', 'esign_pending'].includes(a.status))).toBe(true);
    const issues = filterApplications(caste, { ai: 'issue' }, docs, NOW);
    expect(issues.some((a) => a.id === 'APP-10388')).toBe(true);
  });

  it('computes bottleneck rows with samples', () => {
    const rows = stageBottlenecks(data.applications);
    expect(rows.length).toBe(5);
    expect(rows.some((r) => r.samples > 0)).toBe(true);
  });
});

describe('AI pre-check engine', () => {
  const base = {
    documentId: 'doc-test',
    applicationId: 'APP-1',
    certificateType: 'caste' as const,
    applicantName: 'Meera Krishnan',
    applicantDob: '1994-03-18',
    applicantAddress: '14, Gandhi Street',
    details: {},
    existingFingerprints: [],
    runAt: new Date(NOW).toISOString(),
  };

  it('verifies a clean identity document', () => {
    const r = analyzeDocument({ ...base, requirementId: 'identity', fileName: 'aadhaar-card.pdf', fileSize: 210000, mimeType: 'application/pdf' });
    expect(r.verdict).toBe('verified');
    expect(r.checks).toHaveLength(9);
  });

  it('flags a wrong document type as needing changes', () => {
    const r = analyzeDocument({ ...base, requirementId: 'address', fileName: 'aadhaar-card.pdf', fileSize: 210000, mimeType: 'application/pdf' });
    expect(r.verdict).toBe('needs_changes');
    expect(r.checks.find((c) => c.key === 'document_type')?.status).toBe('fail');
  });

  it('warns on low-resolution images and on possible duplicates', () => {
    const low = analyzeDocument({ ...base, requirementId: 'address', fileName: 'address-proof-lowres.jpg', fileSize: 19000, mimeType: 'image/jpeg' });
    expect(low.verdict).not.toBe('verified');
    const dup = analyzeDocument({ ...base, requirementId: 'identity', fileName: 'voter-id-duplicate-copy.pdf', fileSize: 201000, mimeType: 'application/pdf' });
    expect(dup.checks.find((c) => c.key === 'duplicate')?.status).toBe('warn');
  });

  it('is deterministic for identical inputs', () => {
    const a = analyzeDocument({ ...base, requirementId: 'photo', fileName: 'passport-photo.jpg', fileSize: 98000, mimeType: 'image/jpeg' });
    const b = analyzeDocument({ ...base, requirementId: 'photo', fileName: 'passport-photo.jpg', fileSize: 98000, mimeType: 'image/jpeg' });
    expect(a).toEqual(b);
  });
});

describe('validation helpers', () => {
  it('validates mobile, email, name, dob and password rules', () => {
    expect(isValidMobile('9876543210')).toBe(true);
    expect(isValidMobile('+91 98765 43210')).toBe(true);
    expect(isValidMobile('1234567890')).toBe(false);
    expect(isValidEmail('name@example.com')).toBe(true);
    expect(isValidEmail('name@example')).toBe(false);
    expect(validateName('M')).toBeTruthy();
    expect(validateName('DK')).toBeUndefined();
    expect(validateName('Meera Krishnan')).toBeUndefined();
    expect(validateDob('2099-01-01', NOW)).toBeTruthy();
    expect(validateDob('1994-03-18', NOW)).toBeUndefined();
    expect(validatePassword('short')).toBeTruthy();
    expect(validatePassword('Password123!')).toBeUndefined();
    expect(validatePassword('Password1')).toBeTruthy();
  });
});
