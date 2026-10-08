import type { AIValidationResult, Application, CertificateTypeId, Document, DocumentStatus, MimeType, OfficerDecision, RequirementId, User } from '../types';
import { appStore } from '../store/appStore';
import { addAudit, addNotifications, appendEvents, findApplication, updateApplication, updateDocument } from '../store/mutations';
import type { EventSpec } from '../store/mutations';
import { deleteBlob, getBlob, putBlob } from './blobStore';
import { analyzeDocument, fingerprintFile } from './aiEngine';
import { validateFile } from '../utils/validation';
import { randomCode } from '../utils/random';
import { REQUIREMENTS, CERTIFICATE_TYPES } from '../config/certificateTypes';
import { OPEN_STATUSES } from '../config/workflow';
import { AI_STAGE_DELAY_MS } from '../config/demo';
import { effectiveDocStatus } from '../utils/applicationRules';
import { MSG } from '../utils/messages';
import { ServiceError, nowIso, simulateLatency } from './api';
import { actorOf, AI_ACTOR } from './actors';
import { canDecide, canViewApplication, canViewDocumentContent, isCitizen, isOfficer } from './access';
import { getApplication, officerIdsFor, recordAccessDenied } from './applicationService';

export interface PreparedUpload {
  blobKey: string;
  fileName: string;
  fileSize: number;
  mimeType: MimeType;
}

/** Validates a browser file by content and stores it in the local blob store. */
export async function prepareUpload(file: File): Promise<PreparedUpload> {
  await simulateLatency(120);
  const check = await validateFile(file);
  if (!check.ok) throw new ServiceError('VALIDATION', check.error);
  const blobKey = `blob-${randomCode(14).toLowerCase()}`;
  await putBlob(blobKey, file);
  return { blobKey, fileName: file.name.slice(0, 120), fileSize: file.size, mimeType: check.mimeType };
}

export async function discardUpload(blobKey: string | null): Promise<void> {
  if (blobKey) await deleteBlob(blobKey);
}

export interface AIRunInput {
  documentId: string;
  applicationId: string | null;
  requirementId: RequirementId;
  certificateType: CertificateTypeId;
  fileName: string;
  fileSize: number;
  mimeType: MimeType;
  applicantName: string;
  applicantDob: string;
  applicantAddress: string;
  details: Record<string, string>;
}

export const AI_STAGES = [
  'Reading file',
  'Extracting text (OCR)',
  'Matching name and date of birth',
  'Checking seals, dates and completeness',
  'Scanning for duplicates and edits',
  'Writing advisory summary',
];

/** Runs the nine pre-checks in simulated stages so the UI can show real progress. */
export async function runAIValidation(input: AIRunInput, onStage?: (index: number, label: string) => void): Promise<AIValidationResult> {
  for (let i = 0; i < AI_STAGES.length; i++) {
    onStage?.(i, AI_STAGES[i]!);
    await simulateLatency(AI_STAGE_DELAY_MS);
  }
  const state = appStore.getState();
  const names = new Map(state.applications.map((a) => [a.id, a.applicantName] as const));
  const existingFingerprints = state.documents.map((d) => ({ fingerprint: d.fingerprint, applicationId: d.applicationId, applicantName: names.get(d.applicationId) ?? '' }));
  return analyzeDocument({ ...input, existingFingerprints, runAt: nowIso() });
}

export interface DocumentMeta {
  id: string;
  requirementId: RequirementId;
  label: string;
  fileName: string;
  fileSize: number;
  mimeType: MimeType;
  version: number;
  uploadedAt: string;
  status: DocumentStatus;
  confidence: number | null;
  officerDecision: OfficerDecision;
}

export function toMeta(doc: Document): DocumentMeta {
  return {
    id: doc.id,
    requirementId: doc.requirementId,
    label: doc.label,
    fileName: doc.fileName,
    fileSize: doc.fileSize,
    mimeType: doc.mimeType,
    version: doc.version,
    uploadedAt: doc.uploadedAt,
    status: effectiveDocStatus(doc),
    confidence: doc.ai ? doc.ai.confidence : null,
    officerDecision: doc.officerDecision,
  };
}

function sortByRequirement(docs: Document[], type: CertificateTypeId): Document[] {
  const order = CERTIFICATE_TYPES[type].requirements;
  return [...docs].sort((a, b) => order.indexOf(a.requirementId) - order.indexOf(b.requirementId));
}

/** Full documents with AI detail. Only the applicant and the owning department may read these. */
export async function listDocuments(viewer: User, applicationId: string): Promise<Document[]> {
  const app = await getApplication(viewer, applicationId);
  if (!canViewDocumentContent(viewer, app)) {
    throw new ServiceError('FORBIDDEN', 'Document contents are visible only to the applicant and the owning department.');
  }
  return sortByRequirement(appStore.getState().documents.filter((d) => d.applicationId === applicationId), app.certificateType);
}

/** Metadata only (no OCR or AI detail). Used by Super Admin views. */
export async function listDocumentMeta(viewer: User, applicationId: string): Promise<DocumentMeta[]> {
  const app = await getApplication(viewer, applicationId);
  return sortByRequirement(appStore.getState().documents.filter((d) => d.applicationId === applicationId), app.certificateType).map(toMeta);
}

export type DocumentPreview =
  | { kind: 'file'; url: string; mimeType: MimeType; fileName: string }
  | { kind: 'simulated'; document: Document }
  | { kind: 'missing'; fileName: string };

export async function getDocumentPreview(viewer: User, documentId: string): Promise<DocumentPreview> {
  await simulateLatency(100);
  const state = appStore.getState();
  const doc = state.documents.find((d) => d.id === documentId);
  if (!doc) throw new ServiceError('NOT_FOUND', 'This document is no longer available.');
  const app = findApplication(state, doc.applicationId);
  if (!app || !canViewDocumentContent(viewer, app)) {
    if (isOfficer(viewer) && app) recordAccessDenied(viewer, app.id, app.departmentId, `Attempted to preview ${doc.label.toLowerCase()} outside the department.`);
    throw new ServiceError('FORBIDDEN', 'You do not have access to this document.');
  }
  if (!doc.blobKey) return { kind: 'simulated', document: doc };
  const blob = await getBlob(doc.blobKey);
  if (!blob) return { kind: 'missing', fileName: doc.fileName };
  return { kind: 'file', url: URL.createObjectURL(blob), mimeType: doc.mimeType, fileName: doc.fileName };
}

export interface DecisionInput {
  decision: OfficerDecision;
  remark: string;
}

export async function decideDocument(officer: User, documentId: string, input: DecisionInput): Promise<void> {
  await simulateLatency(120);
  const state = appStore.getState();
  const doc = state.documents.find((d) => d.id === documentId);
  if (!doc) throw new ServiceError('NOT_FOUND', 'This document is no longer available.');
  const app = findApplication(state, doc.applicationId) as Application;
  if (!canDecide(officer, app)) {
    recordAccessDenied(officer, app.id, app.departmentId, 'Attempted to decide on a document outside the department.');
    throw new ServiceError('FORBIDDEN', `Only ${app.departmentId} officers can decide on this document.`);
  }
  if (!OPEN_STATUSES.includes(app.status) || app.status === 'esign_pending') throw new ServiceError('CONFLICT', 'This application is already decided.');
  const remark = input.remark.trim();
  if (input.decision === 'flagged' && remark.length < 10) {
    throw new ServiceError('VALIDATION', 'Explain what is wrong with this document.', { remark: 'Explain what is wrong (at least 10 characters).' });
  }
  const at = nowIso();
  appStore.commit((s) => {
    let next = updateDocument(s, documentId, (d) => ({ ...d, officerDecision: input.decision, officerRemark: remark || null }));
    const verb = input.decision === 'accepted' ? 'Accepted' : input.decision === 'flagged' ? 'Flagged' : 'Decision cleared for';
    next = addAudit(next, actorOf(officer), at, {
      action: 'document_reviewed',
      applicationId: app.id,
      departmentId: app.departmentId,
      detail: `${verb}: ${doc.label}${remark ? ` · ${remark}` : ''}`,
    });
    return next;
  });
}

/** Citizen re-uploads a flagged document. The AI re-checks it, then the file returns to the queue when clear. */
export async function replaceDocument(
  citizen: User,
  applicationId: string,
  documentId: string,
  upload: PreparedUpload,
  onStage?: (index: number, label: string) => void,
): Promise<Document> {
  if (!isCitizen(citizen)) throw new ServiceError('FORBIDDEN', 'Only the applicant can upload documents.');
  const state = appStore.getState();
  const app = findApplication(state, applicationId);
  const doc = state.documents.find((d) => d.id === documentId && d.applicationId === applicationId);
  if (!app || !doc || !canViewApplication(citizen, app)) throw new ServiceError('NOT_FOUND', 'We could not find that document.');
  if (app.status !== 'changes_requested') throw new ServiceError('CONFLICT', 'This application does not need document changes right now.');
  const previousKey = doc.blobKey;
  const startedAt = nowIso();
  appStore.commit((s) => {
    const current = findApplication(s, applicationId);
    if (!current || current.status !== 'changes_requested') return s;
    const events: EventSpec[] = [
      { at: startedAt, stage: 'ai_check', key: 'ai_recheck', action: 'AI re-check started', description: `Re-checking ${doc.label.toLowerCase()} (${upload.fileName}).`, department: null, actorName: citizen.name, actorRole: 'citizen', tone: 'info' },
    ];
    const next = updateApplication(s, applicationId, (a) => ({ ...a, status: 'ai_checking' }));
    return appendEvents(next, applicationId, events);
  });
  const ai = await runAIValidation(
    {
      documentId,
      applicationId,
      requirementId: doc.requirementId,
      certificateType: app.certificateType,
      fileName: upload.fileName,
      fileSize: upload.fileSize,
      mimeType: upload.mimeType,
      applicantName: app.applicantName,
      applicantDob: app.applicantDob,
      applicantAddress: app.address,
      details: app.details,
    },
    onStage,
  );
  const done = nowIso();
  let updatedDoc: Document | undefined;
  appStore.commit((s) => {
    const current = findApplication(s, applicationId);
    if (!current) return s;
    let next = updateDocument(s, documentId, (d) => ({
      ...d,
      fileName: upload.fileName,
      fileSize: upload.fileSize,
      mimeType: upload.mimeType,
      blobKey: upload.blobKey,
      version: d.version + 1,
      uploadedAt: done,
      uploadedBy: citizen.name,
      ai: { ...ai, documentId },
      officerDecision: null,
      officerRemark: null,
      fingerprint: fingerprintFile(upload.fileName, upload.fileSize),
    }));
    updatedDoc = next.documents.find((d) => d.id === documentId);
    const stillFlagged = next.documents.filter((d) => d.applicationId === applicationId && effectiveDocStatus(d) === 'needs_changes');
    const dept = next.departments.find((d) => d.id === current.departmentId)?.name ?? 'Department';
    const events: EventSpec[] = [
      { at: done, stage: 'ai_check', key: 'ai_recheck_done', action: 'AI re-check completed', description: `${doc.label}: ${ai.recommendedAction}`, department: null, actorName: 'AI pre-verification (prototype)', actorRole: 'ai', tone: ai.verdict === 'needs_changes' ? 'warning' : ai.verdict === 'warning' ? 'warning' : 'success' },
    ];
    if (stillFlagged.length > 0) {
      next = updateApplication(next, applicationId, (a) => ({ ...a, status: 'changes_requested' }));
      next = appendEvents(next, applicationId, events);
    } else {
      next = updateApplication(next, applicationId, (a) => ({ ...a, status: 'in_review', officerRemark: null }));
      events.push({ at: done, stage: 'review', key: 'resubmitted', action: 'Document resubmitted', description: `${doc.label} re-uploaded and checked by AI. Returned to the officer queue.`, department: dept, actorName: citizen.name, actorRole: 'citizen', tone: 'info' });
      next = appendEvents(next, applicationId, events);
      const notes = [
        ...officerIdsFor(current.departmentId).map((id) => ({ recipientId: id, ...MSG.officerResubmitted(applicationId, current.applicantName, doc.label), kind: 'officer' as const, tone: 'info' as const, applicationId })),
        { recipientId: citizen.id, title: 'Document received', body: `Your ${doc.label.toLowerCase()} was re-uploaded and checked. Your application is back in the officer queue. (${applicationId})`, kind: 'application' as const, tone: 'success' as const, applicationId },
      ];
      next = addNotifications(next, notes, done);
    }
    next = addAudit(next, actorOf(citizen), done, { action: 'document_replaced', applicationId, departmentId: current.departmentId, detail: `${doc.label} v${doc.version + 1}: ${ai.verdict.replace('_', ' ')}` });
    next = addAudit(next, AI_ACTOR, done, { action: 'ai_check_run', applicationId, departmentId: current.departmentId, detail: `Re-check of ${doc.label.toLowerCase()}: ${ai.verdict.replace('_', ' ')}` });
    return next;
  });
  if (previousKey && previousKey !== upload.blobKey) await deleteBlob(previousKey);
  if (!updatedDoc) throw new ServiceError('NOT_FOUND', 'The application changed while uploading. Refresh and try again.');
  return updatedDoc;
}

export function requirementLabel(requirementId: RequirementId): string {
  return REQUIREMENTS[requirementId].label;
}
