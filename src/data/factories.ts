import type {
  Application,
  ApplicationStatus,
  AuditLog,
  AppNotification,
  Certificate,
  CertificateTypeId,
  Delivery,
  DepartmentId,
  DeliveryEvent,
  DeliveryStatus,
  Document,
  MimeType,
  NotificationKind,
  OfficerDecision,
  RequirementId,
  TimelineEvent,
  User,
} from '../types';
import { CERTIFICATE_TYPES, REQUIREMENTS } from '../config/certificateTypes';
import { analyzeDocument, fingerprintFile } from '../services/aiEngine';
import { addDays, formatDate } from '../utils/format';
import { randomCode } from '../utils/random';

export const MIN = 60_000;
export const HOUR = 60 * MIN;
export const DAY = 24 * HOUR;

/** Timestamp helper: `ago(now, 2, 3)` = two days and three hours before now. */
export function ago(now: number, days: number, hours = 0, minutes = 0): string {
  return new Date(now - (days * DAY + hours * HOUR + minutes * MIN)).toISOString();
}

export function plus(iso: string, minutes: number): string {
  return new Date(Date.parse(iso) + minutes * MIN).toISOString();
}

export interface Actor {
  name: string;
  role: TimelineEvent['actorRole'];
  id?: string | null;
}

export interface TimelineFacts {
  submittedAt: string;
  applicantName: string;
  deptName: string;
  certLabel: string;
  ai?: { at: string; summary: string; tone: TimelineEvent['tone'] } | null;
  queuedAt?: string | null;
  reviewStart?: { at: string; officer: string } | null;
  changes?: { at: string; detail: string; officer: string } | null;
  resubmitted?: { at: string; label: string } | null;
  rejected?: { at: string; reason: string; officer: string } | null;
  approved?: { at: string; officer: string } | null;
  esignQueuedAt?: string | null;
  signedAt?: string | null;
  issuedAt?: string | null;
  delivery?: { dispatchedAt: string; inTransitAt?: string | null; outForDeliveryAt?: string | null; deliveredAt?: string | null; location: string } | null;
}

/** Builds the chronological timeline for an application from its known facts. */
export function buildTimeline(appId: string, f: TimelineFacts): TimelineEvent[] {
  const events: Omit<TimelineEvent, 'id'>[] = [];
  const citizen: Actor = { name: f.applicantName, role: 'citizen' };
  const system: Actor = { name: 'CertiTrack system', role: 'system' };
  const ai: Actor = { name: 'AI pre-verification (prototype)', role: 'ai' };
  const courier: Actor = { name: 'Partner courier (simulated)', role: 'courier' };
  const push = (at: string, stage: TimelineEvent['stage'], key: string, action: string, description: string, dept: string | null, actor: Actor, tone: TimelineEvent['tone']) =>
    events.push({ at, stage, key, action, description, department: dept, actorName: actor.name, actorRole: actor.role, tone });

  push(f.submittedAt, 'apply', 'submitted', 'Application submitted', `Application received for ${f.certLabel}. Track it in CertiTrack.`, null, citizen, 'info');
  if (f.ai) push(f.ai.at, 'ai_check', 'ai_check', 'AI pre-check completed', f.ai.summary, null, ai, f.ai.tone);
  if (f.queuedAt) push(f.queuedAt, 'review', 'queued', 'Queued for officer review', `Assigned to the ${f.deptName} queue.`, f.deptName, system, 'info');
  if (f.reviewStart) {
    push(f.reviewStart.at, 'review', 'review_started', 'Officer review started', `${f.reviewStart.officer} opened the file and is verifying documents.`, f.deptName, { name: f.reviewStart.officer, role: 'officer' }, 'info');
  }
  if (f.changes) {
    push(f.changes.at, 'review', 'changes_requested', 'Changes requested', f.changes.detail, f.deptName, { name: f.changes.officer, role: 'officer' }, 'warning');
  }
  if (f.resubmitted) {
    push(f.resubmitted.at, 'review', 'resubmitted', 'Document resubmitted', `${f.resubmitted.label} re-uploaded and checked by AI. Returned to the officer queue.`, f.deptName, citizen, 'info');
  }
  if (f.rejected) {
    push(f.rejected.at, 'review', 'rejected', 'Application rejected', f.rejected.reason, f.deptName, { name: f.rejected.officer, role: 'officer' }, 'danger');
  }
  if (f.approved) {
    push(f.approved.at, 'review', 'approved', 'Approved by officer', 'Documents verified by the officer. Certificate sent for digital signing.', f.deptName, { name: f.approved.officer, role: 'officer' }, 'success');
  }
  if (f.esignQueuedAt) push(f.esignQueuedAt, 'esign', 'esign_queued', 'e-Sign queued', 'Awaiting digital signature by the competent authority (simulated e-sign in this prototype).', f.deptName, system, 'info');
  if (f.signedAt) push(f.signedAt, 'esign', 'signed', 'Digitally signed', 'Signed by the competent authority (simulated e-sign, prototype only).', f.deptName, system, 'success');
  if (f.issuedAt) push(f.issuedAt, 'issued', 'issued', 'Certificate issued', 'Certificate added to the applicant’s Certificate Locker.', f.deptName, system, 'success');
  if (f.delivery) {
    const d = f.delivery;
    push(d.dispatchedAt, 'delivered', 'dispatched', 'Dispatched for delivery', `Physical copy dispatched from ${d.location}.`, null, courier, 'info');
    if (d.inTransitAt) push(d.inTransitAt, 'delivered', 'in_transit', 'In transit', `Moving through the courier network via ${d.location}.`, null, courier, 'info');
    if (d.outForDeliveryAt) push(d.outForDeliveryAt, 'delivered', 'out_for_delivery', 'Out for delivery', 'With the delivery agent for the registered address.', null, courier, 'info');
    if (d.deliveredAt) push(d.deliveredAt, 'delivered', 'delivered', 'Delivered', 'Physical copy delivered to the registered address.', null, courier, 'success');
  }
  events.sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
  return events.map((e, i) => ({ ...e, id: `evt-${appId}-${String(i + 1).padStart(2, '0')}` }));
}

export interface DocSpec {
  requirementId: RequirementId;
  fileName: string;
  fileSize: number;
  mimeType: MimeType;
  officerDecision?: OfficerDecision;
  officerRemark?: string | null;
  version?: number;
}

export interface DocContext {
  appId: string;
  certificateType: CertificateTypeId;
  submittedAt: string;
  applicantName: string;
  applicantDob: string;
  applicantAddress: string;
  details: Record<string, string>;
  uploadedBy: string;
  existingFingerprints: Array<{ fingerprint: string; applicationId: string; applicantName: string }>;
  uploadOffsetMinutes?: number;
}

/** Builds documents with AI results. The AI engine is pure, so seeded results are deterministic. */
export function buildDocuments(ctx: DocContext, specs: DocSpec[], idPrefix: string): Document[] {
  const uploadedAt = plus(ctx.submittedAt, -(ctx.uploadOffsetMinutes ?? 2));
  return specs.map((spec, i) => {
    const id = `${idPrefix}-${spec.requirementId}`;
    const runAt = plus(uploadedAt, 2);
    const ai = analyzeDocument({
      documentId: id,
      applicationId: ctx.appId,
      requirementId: spec.requirementId,
      certificateType: ctx.certificateType,
      fileName: spec.fileName,
      fileSize: spec.fileSize,
      mimeType: spec.mimeType,
      applicantName: ctx.applicantName,
      applicantDob: spec.requirementId === 'identity' ? ctx.applicantDob : null,
      applicantAddress: ctx.applicantAddress,
      details: ctx.details,
      existingFingerprints: ctx.existingFingerprints,
      runAt,
    });
    return {
      id,
      applicationId: ctx.appId,
      requirementId: spec.requirementId,
      label: REQUIREMENTS[spec.requirementId].label,
      fileName: spec.fileName,
      fileSize: spec.fileSize,
      mimeType: spec.mimeType,
      version: spec.version ?? 1,
      uploadedAt: plus(uploadedAt, i * 0.2),
      uploadedBy: ctx.uploadedBy,
      ai,
      officerDecision: spec.officerDecision ?? null,
      officerRemark: spec.officerRemark ?? null,
      blobKey: null,
      fingerprint: fingerprintFile(spec.fileName, spec.fileSize),
    };
  });
}

export function averageAiScore(docs: Document[]): number {
  const scored = docs.filter((d) => d.ai);
  if (scored.length === 0) return 0;
  return Math.round((scored.reduce((s, d) => s + (d.ai?.confidence ?? 0), 0) / scored.length) * 100);
}

export interface AppInput {
  id: string;
  certificateType: CertificateTypeId;
  departmentId: DepartmentId;
  citizen: { id: string; name: string; email: string; mobile: string; dob: string; gender: string; address: string; district: string; taluk: string; village: string };
  details: Record<string, string>;
  status: ApplicationStatus;
  submittedAt: string;
  deptSlaDays: number;
  deliveryRequested: boolean;
  timeline: TimelineEvent[];
  documents: Document[];
  reviewStartedAt: string | null;
  reviewerId: string | null;
  officerRemark: string | null;
  rejectionReason: string | null;
  esignAt: string | null;
  completedAt: string | null;
  certificateId: string | null;
  priorityOverride?: Application['priorityOverride'];
}

export function buildApplication(input: AppInput): Application {
  const updatedAt = input.timeline.length > 0 ? input.timeline[input.timeline.length - 1]!.at : input.submittedAt;
  return {
    id: input.id,
    certificateType: input.certificateType,
    departmentId: input.departmentId,
    citizenId: input.citizen.id,
    applicantName: input.citizen.name,
    applicantEmail: input.citizen.email,
    applicantMobile: input.citizen.mobile,
    applicantDob: input.citizen.dob,
    gender: input.citizen.gender,
    address: input.citizen.address,
    district: input.citizen.district,
    taluk: input.citizen.taluk,
    village: input.citizen.village,
    details: input.details,
    status: input.status,
    priorityOverride: input.priorityOverride ?? null,
    submittedAt: input.submittedAt,
    updatedAt,
    expectedBy: addDays(input.submittedAt, input.deptSlaDays),
    deliveryRequested: input.deliveryRequested,
    reviewStartedAt: input.reviewStartedAt,
    reviewerId: input.reviewerId,
    officerRemark: input.officerRemark,
    rejectionReason: input.rejectionReason,
    esignAt: input.esignAt,
    completedAt: input.completedAt,
    certificateId: input.certificateId,
    aiScore: averageAiScore(input.documents),
    timeline: input.timeline,
  };
}

export interface CertificateInput {
  id: string;
  number: number;
  year: number;
  type: CertificateTypeId;
  applicationId: string;
  citizen: { id: string; name: string; dob: string; address: string; district: string };
  parentOrSpouseName: string;
  details: Record<string, string>;
  issuedAt: string;
  deliveryRequested: boolean;
  taluk: string;
}

export function buildCertificate(input: CertificateInput): Certificate {
  const def = CERTIFICATE_TYPES[input.type];
  const prefix = input.type.slice(0, 3).toUpperCase();
  const validUntil = def.validityMonths ? addMonths(input.issuedAt, def.validityMonths) : null;
  return {
    id: input.id,
    certificateNumber: `CTK-${prefix}-${input.year}-${String(input.number).padStart(6, '0')}`,
    certificateType: input.type,
    applicationId: input.applicationId,
    citizenId: input.citizen.id,
    applicantName: input.citizen.name,
    applicantDob: input.citizen.dob,
    parentOrSpouseName: input.parentOrSpouseName,
    address: input.citizen.address,
    district: input.citizen.district,
    details: input.details,
    issuedAt: input.issuedAt,
    validUntil,
    authority: `${def.label.replace(' Certificate', '')} Department · ${input.citizen.district} District Office`,
    signatory: 'Competent Authority (digital signatory, simulated)',
    signatureAlgorithm: 'RSA-2048 · SHA-256 (simulated)',
    signedAt: input.issuedAt,
    verificationCode: `VRF-${randomCode(4)}-${randomCode(4)}`,
    deliveryRequested: input.deliveryRequested,
    status: 'active',
  };
}

export function addMonths(iso: string, months: number): string {
  const d = new Date(iso);
  d.setMonth(d.getMonth() + months);
  return d.toISOString();
}

export interface DeliveryInput {
  id: string;
  number: number;
  applicationId: string;
  certificateId: string;
  recipientName: string;
  recipientAddress: string;
  location: string;
  dispatchedAt: string;
  status: DeliveryStatus;
  nextStepAt: string | null;
  inTransitAt?: string | null;
  outForDeliveryAt?: string | null;
  deliveredAt?: string | null;
}

export function buildDelivery(input: DeliveryInput): Delivery {
  const events: DeliveryEvent[] = [];
  const add = (status: DeliveryStatus, at: string, description: string) =>
    events.push({ id: `${input.id}-${status}`, at, status, location: input.location, description });
  add('dispatched', input.dispatchedAt, `Dispatched from ${input.location}.`);
  if (input.inTransitAt) add('in_transit', input.inTransitAt, `Departed ${input.location}; moving through the courier network.`);
  if (input.outForDeliveryAt) add('out_for_delivery', input.outForDeliveryAt, 'With the delivery agent for the registered address.');
  if (input.deliveredAt) add('delivered', input.deliveredAt, 'Delivered to the registered address. Signature captured.');
  const estimate = addDays(input.dispatchedAt, 4);
  return {
    id: input.id,
    applicationId: input.applicationId,
    certificateId: input.certificateId,
    trackingId: `CTK${String(input.number).padStart(9, '0')}IN`,
    carrier: 'Partner courier (simulated)',
    status: input.status,
    recipientName: input.recipientName,
    recipientAddress: input.recipientAddress,
    dispatchedAt: input.dispatchedAt,
    estimatedDelivery: input.status === 'delivered' && input.deliveredAt ? input.deliveredAt : estimate,
    currentLocation: input.status === 'delivered' ? 'Delivered' : input.location,
    deliveredAt: input.deliveredAt ?? null,
    nextStepAt: input.nextStepAt,
    events,
  };
}

export function makeNotification(
  id: string,
  recipient: User,
  at: string,
  opts: { title: string; body: string; kind: NotificationKind; tone: AppNotification['tone']; applicationId: string | null; read: boolean; channels?: AppNotification['channels'] },
): AppNotification {
  const channels: AppNotification['channels'] =
    opts.channels ?? (recipient.role === 'citizen' ? citizenChannels(recipient) : ['in_app']);
  return {
    id,
    recipientId: recipient.id,
    recipientRole: recipient.role,
    title: opts.title,
    body: opts.body,
    kind: opts.kind,
    tone: opts.tone,
    channels,
    applicationId: opts.applicationId,
    createdAt: at,
    read: opts.read,
  };
}

export function citizenChannels(user: User): AppNotification['channels'] {
  if (user.role !== 'citizen') return ['in_app'];
  const channels: AppNotification['channels'] = ['in_app'];
  if (user.notificationPrefs.whatsapp) channels.push('whatsapp');
  if (user.notificationPrefs.email) channels.push('email');
  return channels;
}

export function makeAudit(
  id: string,
  at: string,
  actor: { id: string | null; name: string; role: AuditLog['actorRole'] },
  action: string,
  opts: { applicationId?: string | null; departmentId?: DepartmentId | null; result?: AuditLog['result']; detail?: string; device?: string },
): AuditLog {
  return {
    id,
    at,
    actorId: actor.id,
    actorName: actor.name,
    actorRole: actor.role,
    action,
    applicationId: opts.applicationId ?? null,
    departmentId: opts.departmentId ?? null,
    result: opts.result ?? 'success',
    detail: opts.detail ?? '',
    ipMasked: '•••.•••.•••.' + String(20 + (id.length * 7) % 200),
    device: opts.device ?? 'Chrome · Windows (placeholder)',
  };
}

export const DEVICE_LABELS = ['Chrome · Windows (placeholder)', 'Edge · Windows (placeholder)', 'Safari · iOS (placeholder)', 'Chrome · Android (placeholder)', 'Firefox · Linux (placeholder)'];

export function formatDocDate(iso: string): string {
  return formatDate(iso);
}

export function certificateLabel(type: CertificateTypeId): string {
  return CERTIFICATE_TYPES[type].label;
}
