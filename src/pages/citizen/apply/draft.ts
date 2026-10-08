import type { AIValidationResult, CertificateTypeId, MimeType, RequirementId, User } from '../../../types';
import { EMPTY_PERSONAL, type PersonalForm } from '../../../utils/applicationValidation';
import { randomCode } from '../../../utils/random';

export const STEP_LABELS = ['Certificate', 'Personal details', 'Certificate details', 'Documents', 'AI pre-check', 'Review & submit'] as const;
export const DRAFT_KEY = 'certitrack.applyDraft.v1';

export interface DraftUpload {
  documentId: string;
  blobKey: string;
  fileName: string;
  fileSize: number;
  mimeType: MimeType;
}

export interface Draft {
  step: number;
  certificateType: CertificateTypeId | '';
  personal: PersonalForm;
  details: Record<string, string>;
  deliveryRequested: boolean;
  declared: boolean;
  uploads: Partial<Record<RequirementId, DraftUpload>>;
  ai: Partial<Record<RequirementId, AIValidationResult>>;
}

export function prefillFromUser(user: User): PersonalForm {
  if (user.role !== 'citizen') return { ...EMPTY_PERSONAL };
  return {
    name: user.name,
    dob: user.dateOfBirth,
    gender: user.gender,
    mobile: user.mobile,
    email: user.email,
    address: user.address,
    district: user.district,
    taluk: user.taluk,
    village: user.village,
  };
}

export function emptyDraft(user: User): Draft {
  return {
    step: 0,
    certificateType: '',
    personal: prefillFromUser(user),
    details: {},
    deliveryRequested: false,
    declared: false,
    uploads: {},
    ai: {},
  };
}

export function loadDraft(user: User): Draft {
  try {
    const raw = window.sessionStorage.getItem(DRAFT_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Draft & { userId?: string };
      if (parsed.userId === user.id) return { ...emptyDraft(user), ...parsed, personal: { ...prefillFromUser(user), ...parsed.personal } };
    }
  } catch {
    // ignore corrupt drafts
  }
  return emptyDraft(user);
}

export function saveDraft(user: User, draft: Draft): void {
  try {
    window.sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ ...draft, userId: user.id }));
  } catch {
    // storage full or unavailable; the draft lives in memory only
  }
}

export function clearDraft(): void {
  try {
    window.sessionStorage.removeItem(DRAFT_KEY);
  } catch {
    // ignore
  }
}

export function newDocumentId(): string {
  return `doc-u-${randomCode(10).toLowerCase()}`;
}
