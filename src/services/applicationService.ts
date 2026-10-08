import type {
  AIValidationResult,
  Application,
  CertificateTypeId,
  Document,
  MimeType,
  PublicTrackResult,
  Priority,
  RequirementId,
  TimelineEvent,
  User,
} from '../types';
import { appStore } from '../store/appStore';
import { addAudit, addNotifications, appendEvents, bumpCounter, findApplication, updateApplication, updateDocument } from '../store/mutations';
import type { EventSpec, NotificationSpec } from '../store/mutations';
import { CERTIFICATE_TYPES, REQUIREMENTS } from '../config/certificateTypes';
import { APPLICATION_STATUS_META, OPEN_STATUSES } from '../config/workflow';
import { SIM_TIMINGS } from '../config/demo';
import { averageAiScore } from '../data/factories';
import { fingerprintFile } from './aiEngine';
import { addDays } from '../utils/format';
import { MSG } from '../utils/messages';
import { documentBlockers, validateDetails, validatePersonal } from '../utils/applicationValidation';
import type { PersonalForm } from '../utils/applicationValidation';
import { effectiveDocStatus } from '../utils/applicationRules';
import { computeSteps, currentStage } from '../utils/stages';
import { normalizeMobile } from '../utils/validation';
import type { FieldErrors } from '../utils/validation';
import { ServiceError, nowIso, simulateLatency } from './api';
import { actorOf, AI_ACTOR, SYSTEM_ACTOR } from './actors';
import { canDecide, canViewApplication, isCitizen, isOfficer } from './access';
import { scheduleSimulation } from './simulation';

export function officerIdsFor(departmentId: string): string[] {
  return appStore.getState().users.filter((u) => u.role === 'officer' && u.active && u.departmentId === departmentId).map((u) => u.id);
}

function ev(at: string, stage: TimelineEvent['stage'], key: string, action: string, description: string, department: string | null, actor: { name: string; role: string }, tone: TimelineEvent['tone']): EventSpec {
  const role = (actor.role === 'public' ? 'system' : actor.role) as TimelineEvent['actorRole'];
  return { at, stage, key, action, description, department, actorName: actor.name, actorRole: role, tone };
}

function deptName(departmentId: string): string {
  return appStore.getState().departments.find((d) => d.id === departmentId)?.name ?? 'Department';
}

/**
 * Denied attempts already written in this page session. Each distinct attempt is logged once, which
 * stops a denied query from re-running forever (every audit write changes the store).
 */
const recordedDenials = new Set<string>();

/** Records a denied access attempt for the audit trail. */
export function recordAccessDenied(viewer: User, applicationId: string, departmentId: string | null, detail: string): void {
  const key = `${viewer.id}|${applicationId}|${detail}`;
  if (recordedDenials.has(key)) return;
  recordedDenials.add(key);
  const at = nowIso();
  appStore.commit((s) =>
    addAudit(s, actorOf(viewer), at, {
      action: 'access_denied',
      result: 'denied',
      applicationId,
      departmentId: (departmentId as Application['departmentId'] | null) ?? null,
      detail,
    }),
  );
}

export async function listApplications(viewer: User): Promise<Application[]> {
  await simulateLatency();
  return appStore
    .getState()
    .applications.filter((a) => canViewApplication(viewer, a))
    .sort((a, b) => Date.parse(b.submittedAt) - Date.parse(a.submittedAt));
}

export async function getApplication(viewer: User, id: string): Promise<Application> {
  await simulateLatency();
  const app = findApplication(appStore.getState(), id);
  if (!app) throw new ServiceError('NOT_FOUND', `We could not find application ${id}.`);
  if (!canViewApplication(viewer, app)) {
    if (isOfficer(viewer)) {
      recordAccessDenied(viewer, id, app.departmentId, `Attempted to open a ${CERTIFICATE_TYPES[app.certificateType].label.toLowerCase()} file outside the officer’s department.`);
      throw new ServiceError('FORBIDDEN', `${id} belongs to the ${deptName(app.departmentId)}. Officers can only open files from their own department. This attempt was recorded.`);
    }
    throw new ServiceError('NOT_FOUND', `We could not find application ${id}.`);
  }
  return app;
}

export interface NewApplicationDocument {
  documentId: string;
  requirementId: RequirementId;
  fileName: string;
  fileSize: number;
  mimeType: MimeType;
  blobKey: string | null;
  ai: AIValidationResult;
}

export interface NewApplicationInput {
  certificateType: CertificateTypeId;
  personal: PersonalForm;
  details: Record<string, string>;
  documents: NewApplicationDocument[];
  deliveryRequested: boolean;
  declared: boolean;
}

export async function createApplication(citizen: User, input: NewApplicationInput): Promise<Application> {
  await simulateLatency(320);
  if (!isCitizen(citizen)) throw new ServiceError('FORBIDDEN', 'Only citizens can apply for certificates.');
  const now = Date.now();
  const personalErrors = validatePersonal(input.personal, now);
  const detailErrors = validateDetails(input.certificateType, input.details, now);
  const errors: FieldErrors<string> = { ...personalErrors, ...detailErrors };
  if (!CERTIFICATE_TYPES[input.certificateType]) errors.certificateType = 'Choose a certificate type.';
  if (!input.declared) errors.declared = 'Confirm the declaration to submit.';
  if (Object.keys(errors).length > 0) throw new ServiceError('VALIDATION', 'Some details need attention. Check the highlighted fields.', errors);
  const blockers = documentBlockers(input.certificateType, input.documents.map((d) => ({ requirementId: d.requirementId, ai: d.ai })));
  if (blockers.length > 0) throw new ServiceError('VALIDATION', blockers.join(' '));

  const at = nowIso();
  let created: Application | undefined;
  appStore.commit((s) => {
    const { value, state: counted } = bumpCounter(s, 'application');
    const id = `APP-${value}`;
    const type = CERTIFICATE_TYPES[input.certificateType];
    const dept = counted.departments.find((d) => d.id === type.departmentId)!;
    const docs: Document[] = input.documents.map((d) => ({
      id: d.documentId,
      applicationId: id,
      requirementId: d.requirementId,
      label: REQUIREMENTS[d.requirementId].label,
      fileName: d.fileName,
      fileSize: d.fileSize,
      mimeType: d.mimeType,
      version: 1,
      uploadedAt: at,
      uploadedBy: citizen.name,
      ai: { ...d.ai, documentId: d.documentId },
      officerDecision: null,
      officerRemark: null,
      blobKey: d.blobKey,
      fingerprint: fingerprintFile(d.fileName, d.fileSize),
    }));
    const warnings = docs.filter((d) => d.ai?.verdict !== 'verified');
    const aiSummary =
      warnings.length === 0
        ? `All ${docs.length} documents verified. No warnings.`
        : `${warnings.length} warning${warnings.length > 1 ? 's' : ''}: ${warnings.map((w) => w.label.toLowerCase()).join(', ')} ${warnings.length > 1 ? 'need' : 'needs'} officer review.`;
    const app: Application = {
      id,
      certificateType: input.certificateType,
      departmentId: type.departmentId,
      citizenId: citizen.id,
      applicantName: input.personal.name.trim(),
      applicantEmail: input.personal.email.trim().toLowerCase(),
      applicantMobile: normalizeMobile(input.personal.mobile),
      applicantDob: input.personal.dob,
      gender: input.personal.gender,
      address: input.personal.address.trim(),
      district: input.personal.district,
      taluk: input.personal.taluk,
      village: input.personal.village.trim(),
      details: { ...input.details },
      status: 'in_review',
      priorityOverride: null,
      submittedAt: at,
      updatedAt: at,
      expectedBy: addDays(at, dept.slaDays),
      deliveryRequested: input.deliveryRequested,
      reviewStartedAt: null,
      reviewerId: null,
      officerRemark: null,
      rejectionReason: null,
      esignAt: null,
      completedAt: null,
      certificateId: null,
      aiScore: averageAiScore(docs),
      timeline: [],
    };
    let state = { ...counted, applications: [app, ...counted.applications], documents: [...docs, ...counted.documents] };
    state = appendEvents(state, id, [
      ev(at, 'apply', 'submitted', 'Application submitted', `Application received for ${type.label}. Track it in CertiTrack.`, null, citizen, 'info'),
      ev(at, 'ai_check', 'ai_check', 'AI pre-check completed', aiSummary, null, AI_ACTOR, warnings.length ? 'warning' : 'success'),
      ev(at, 'review', 'queued', 'Queued for officer review', `Assigned to the ${dept.name} queue.`, dept.name, SYSTEM_ACTOR, 'info'),
    ]);
    const notes: NotificationSpec[] = [
      { recipientId: citizen.id, ...MSG.submitted(id), kind: 'application', tone: 'info', applicationId: id },
      ...officerIdsFor(dept.id).map((oid) => ({ recipientId: oid, ...MSG.officerNewApplication(id, app.applicantName, input.certificateType), kind: 'officer' as const, tone: 'info' as const, applicationId: id })),
    ];
    state = addNotifications(state, notes, at);
    state = addAudit(state, actorOf(citizen), at, { action: 'application_submitted', applicationId: id, departmentId: type.departmentId, detail: `${type.label} submitted with ${docs.length} documents` });
    state = addAudit(state, AI_ACTOR, at, { action: 'ai_check_run', applicationId: id, departmentId: type.departmentId, detail: aiSummary });
    created = state.applications.find((a) => a.id === id);
    return state;
  });
  return created!;
}

export interface DecisionMeta {
  remark?: string;
}

function assertOfficerOwns(officer: User, app: Application): void {
  if (!canDecide(officer, app)) {
    recordAccessDenied(officer, app.id, app.departmentId, 'Attempted to act on a file outside the officer’s department.');
    throw new ServiceError('FORBIDDEN', `${app.id} belongs to the ${deptName(app.departmentId)}. Only its officers can decide on it.`);
  }
}

export async function startReview(officer: User, applicationId: string): Promise<Application> {
  await simulateLatency(120);
  const current = findApplication(appStore.getState(), applicationId);
  if (!current) throw new ServiceError('NOT_FOUND', `We could not find application ${applicationId}.`);
  assertOfficerOwns(officer, current);
  if (current.status !== 'in_review' || current.reviewStartedAt) return current;
  const at = nowIso();
  appStore.commit((s) => {
    const app = findApplication(s, applicationId);
    if (!app || app.status !== 'in_review' || app.reviewStartedAt) return s;
    let state = updateApplication(s, applicationId, (a) => ({ ...a, reviewStartedAt: at, reviewerId: officer.id }));
    state = appendEvents(state, applicationId, [ev(at, 'review', 'review_started', 'Officer review started', `${officer.name} opened the file and is verifying documents.`, deptName(app.departmentId), actorOf(officer), 'info')]);
    return addAudit(state, actorOf(officer), at, { action: 'review_started', applicationId, departmentId: app.departmentId });
  });
  return findApplication(appStore.getState(), applicationId)!;
}

export async function setPriority(officer: User, applicationId: string, priority: Priority | null): Promise<void> {
  await simulateLatency(120);
  const app = findApplication(appStore.getState(), applicationId);
  if (!app) throw new ServiceError('NOT_FOUND', `We could not find application ${applicationId}.`);
  assertOfficerOwns(officer, app);
  const at = nowIso();
  appStore.commit((s) => {
    const next = updateApplication(s, applicationId, (a) => ({ ...a, priorityOverride: priority }));
    return addAudit(next, actorOf(officer), at, { action: 'priority_changed', applicationId, departmentId: app.departmentId, detail: priority ? `Set to ${priority}` : 'Returned to automatic priority' });
  });
}

export interface ChangesInput {
  flaggedDocumentIds: string[];
  remark: string;
}

export async function requestChanges(officer: User, applicationId: string, input: ChangesInput): Promise<void> {
  await simulateLatency();
  const app = findApplication(appStore.getState(), applicationId);
  if (!app) throw new ServiceError('NOT_FOUND', `We could not find application ${applicationId}.`);
  assertOfficerOwns(officer, app);
  const errors: FieldErrors<'remark' | 'flaggedDocumentIds'> = {};
  if (input.flaggedDocumentIds.length === 0) errors.flaggedDocumentIds = 'Select at least one document that needs changes.';
  if (input.remark.trim().length < 15) errors.remark = 'Give the citizen a clear reason (at least 15 characters).';
  if (Object.keys(errors).length > 0) throw new ServiceError('VALIDATION', 'A reason and at least one document are required.', errors);
  if (!OPEN_STATUSES.includes(app.status) || app.status === 'esign_pending') {
    throw new ServiceError('CONFLICT', 'This application is no longer awaiting review.');
  }
  const at = nowIso();
  const remark = input.remark.trim();
  const flagged = new Set(input.flaggedDocumentIds);
  appStore.commit((s) => {
    const current = findApplication(s, applicationId);
    if (!current) return s;
    let state = s;
    for (const doc of s.documents.filter((d) => d.applicationId === applicationId && flagged.has(d.id))) {
      state = updateDocument(state, doc.id, (d) => ({ ...d, officerDecision: 'flagged', officerRemark: remark }));
    }
    const labels = s.documents.filter((d) => flagged.has(d.id)).map((d) => d.label);
    state = updateApplication(state, applicationId, (a) => ({
      ...a,
      status: 'changes_requested',
      officerRemark: remark,
      reviewStartedAt: a.reviewStartedAt ?? at,
      reviewerId: officer.id,
    }));
    const events: EventSpec[] = [];
    if (!current.reviewStartedAt) events.push(ev(at, 'review', 'review_started', 'Officer review started', `${officer.name} opened the file and is verifying documents.`, deptName(current.departmentId), actorOf(officer), 'info'));
    events.push(ev(at, 'review', 'changes_requested', 'Changes requested', `${labels.join(', ')}: ${remark}`, deptName(current.departmentId), actorOf(officer), 'warning'));
    state = appendEvents(state, applicationId, events);
    const label = labels.length === 1 ? labels[0]! : `${labels.length} documents`;
    state = addNotifications(state, [{ recipientId: current.citizenId, ...MSG.changes(label, remark, applicationId), kind: 'changes', tone: 'warning', applicationId }], at);
    return addAudit(state, actorOf(officer), at, { action: 'changes_requested', applicationId, departmentId: current.departmentId, detail: `${labels.join(', ')}: ${remark}` });
  });
}

export interface RejectInput {
  reason: string;
  remark: string;
}

export const REJECTION_REASONS = [
  'Document is not valid for this certificate',
  'Identity or name does not match the records',
  'Applicant is not eligible under the rules',
  'Duplicate of an existing application',
  'Other (explain in remarks)',
];

export async function rejectApplication(officer: User, applicationId: string, input: RejectInput): Promise<void> {
  await simulateLatency();
  const app = findApplication(appStore.getState(), applicationId);
  if (!app) throw new ServiceError('NOT_FOUND', `We could not find application ${applicationId}.`);
  assertOfficerOwns(officer, app);
  const errors: FieldErrors<'reason' | 'remark'> = {};
  if (!REJECTION_REASONS.includes(input.reason)) errors.reason = 'Choose a rejection reason.';
  if (input.remark.trim().length < 15) errors.remark = 'Explain the decision (at least 15 characters).';
  if (Object.keys(errors).length > 0) throw new ServiceError('VALIDATION', 'A reason and explanation are required.', errors);
  if (!OPEN_STATUSES.includes(app.status) || app.status === 'esign_pending') throw new ServiceError('CONFLICT', 'This application is already decided.');
  const at = nowIso();
  const remark = input.remark.trim();
  const reason = `${input.reason}. ${remark}`;
  appStore.commit((s) => {
    const current = findApplication(s, applicationId);
    if (!current || !OPEN_STATUSES.includes(current.status)) return s;
    let state = updateApplication(s, applicationId, (a) => ({ ...a, status: 'rejected', rejectionReason: reason, officerRemark: remark, completedAt: at, reviewerId: officer.id, reviewStartedAt: a.reviewStartedAt ?? at }));
    state = appendEvents(state, applicationId, [ev(at, 'review', 'rejected', 'Application rejected', reason, deptName(current.departmentId), actorOf(officer), 'danger')]);
    state = addNotifications(state, [{ recipientId: current.citizenId, ...MSG.rejected(applicationId, input.reason.toLowerCase()), kind: 'rejection', tone: 'danger', applicationId }], at);
    return addAudit(state, actorOf(officer), at, { action: 'application_rejected', applicationId, departmentId: current.departmentId, result: 'success', detail: reason });
  });
}

export async function approveApplication(officer: User, applicationId: string, meta: DecisionMeta = {}): Promise<void> {
  await simulateLatency();
  const app = findApplication(appStore.getState(), applicationId);
  if (!app) throw new ServiceError('NOT_FOUND', `We could not find application ${applicationId}.`);
  assertOfficerOwns(officer, app);
  if (!OPEN_STATUSES.includes(app.status) || app.status === 'esign_pending') throw new ServiceError('CONFLICT', 'This application is not awaiting an approval decision.');
  const docs = appStore.getState().documents.filter((d) => d.applicationId === applicationId);
  if (docs.some((d) => effectiveDocStatus(d) === 'needs_changes')) {
    throw new ServiceError('CONFLICT', 'Request changes for the flagged document before approving.');
  }
  const unresolved = docs.filter((d) => effectiveDocStatus(d) !== 'verified');
  if (unresolved.length > 0) {
    throw new ServiceError('CONFLICT', `Accept each document with a warning first: ${unresolved.map((d) => d.label).join(', ')}.`);
  }
  const at = nowIso();
  const speed = appStore.getState().settings.simulationSpeed;
  const esignAt = new Date(Date.now() + SIM_TIMINGS[speed].esignDelay).toISOString();
  const remark = meta.remark?.trim() ?? '';
  appStore.commit((s) => {
    const current = findApplication(s, applicationId);
    if (!current || !OPEN_STATUSES.includes(current.status) || current.status === 'esign_pending') return s;
    let state = updateApplication(s, applicationId, (a) => ({ ...a, status: 'esign_pending', esignAt, officerRemark: remark || a.officerRemark, reviewerId: officer.id, reviewStartedAt: a.reviewStartedAt ?? at }));
    const events: EventSpec[] = [];
    if (!current.reviewStartedAt) events.push(ev(at, 'review', 'review_started', 'Officer review started', `${officer.name} opened the file and is verifying documents.`, deptName(current.departmentId), actorOf(officer), 'info'));
    events.push(ev(at, 'review', 'approved', 'Approved by officer', remark ? `Documents verified. Note: ${remark}` : 'Documents verified by the officer. Certificate sent for digital signing.', deptName(current.departmentId), actorOf(officer), 'success'));
    events.push(ev(at, 'esign', 'esign_queued', 'e-Sign queued', 'Awaiting digital signature by the competent authority (simulated e-sign in this prototype).', deptName(current.departmentId), SYSTEM_ACTOR, 'info'));
    state = appendEvents(state, applicationId, events);
    state = addNotifications(state, [{ recipientId: current.citizenId, ...MSG.approved(current.certificateType, applicationId), kind: 'approval', tone: 'success', applicationId }], at);
    return addAudit(state, actorOf(officer), at, { action: 'application_approved', applicationId, departmentId: current.departmentId, detail: remark || 'Approved after document verification' });
  });
  scheduleSimulation(SIM_TIMINGS[speed].esignDelay + 200);
}

export interface PublicTrackInput {
  applicationId: string;
  mobile: string;
}

/** Public tracking: Application ID plus the last four digits of the registered mobile number. */
export async function publicTrack(input: PublicTrackInput): Promise<PublicTrackResult> {
  await simulateLatency();
  const id = input.applicationId.trim().toUpperCase();
  const errors: FieldErrors<'applicationId' | 'mobile'> = {};
  if (!/^APP-\d{4,7}$/.test(id)) errors.applicationId = 'Enter an Application ID such as APP-10294.';
  const last4 = normalizeMobile(input.mobile).slice(-4);
  if (!/^\d{4}$/.test(last4)) errors.mobile = 'Enter the last four digits of the registered mobile number.';
  if (Object.keys(errors).length > 0) throw new ServiceError('VALIDATION', 'Check the highlighted fields.', errors);
  const state = appStore.getState();
  const app = findApplication(state, id);
  if (!app || app.applicantMobile.slice(-4) !== last4) {
    throw new ServiceError('NOT_FOUND', 'We could not match that Application ID and mobile number. Check both and try again.');
  }
  const delivery = state.deliveries.find((d) => d.applicationId === app.id) ?? null;
  const steps = computeSteps(app, delivery);
  return {
    applicationId: app.id,
    certificateLabel: CERTIFICATE_TYPES[app.certificateType].label,
    stageLabel: currentStage(steps).label,
    statusLabel: APPLICATION_STATUS_META[app.status].label,
    departmentName: deptName(app.departmentId),
    lastUpdated: app.updatedAt,
    submittedAt: app.submittedAt,
    expectedBy: app.expectedBy,
    stages: steps.map((s) => ({ label: s.label, state: s.state })),
  };
}

/** Officers see masked contact details. Revealing them is a deliberate action and is audit-logged. */
export async function logContactReveal(officer: User, applicationId: string): Promise<void> {
  const app = findApplication(appStore.getState(), applicationId);
  if (!app) throw new ServiceError('NOT_FOUND', `We could not find application ${applicationId}.`);
  assertOfficerOwns(officer, app);
  const at = nowIso();
  appStore.commit((s) => addAudit(s, actorOf(officer), at, { action: 'contact_revealed', applicationId, departmentId: app.departmentId, detail: 'Applicant contact details revealed for verification' }));
}
