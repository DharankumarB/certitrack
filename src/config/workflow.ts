import type { ApplicationStage, ApplicationStatus, DeliveryStatus } from '../types';

export interface StageDef {
  id: ApplicationStage;
  label: string;
  description: string;
}

/** The six-stage workflow shown everywhere a citizen or officer tracks an application. */
export const WORKFLOW_STAGES: StageDef[] = [
  { id: 'apply', label: 'Apply', description: 'Application form and documents submitted.' },
  { id: 'ai_check', label: 'AI Check', description: 'AI-assisted pre-verification of documents.' },
  { id: 'review', label: 'Review', description: 'Department officer reviews and decides.' },
  { id: 'esign', label: 'e-Sign', description: 'Certificate digitally signed by the authority.' },
  { id: 'issued', label: 'Issued', description: 'Certificate stored in the Certificate Locker.' },
  { id: 'delivered', label: 'Delivered', description: 'Physical copy delivery tracked to doorstep.' },
];

export const STAGE_INDEX: Record<ApplicationStage, number> = {
  apply: 0,
  ai_check: 1,
  review: 2,
  esign: 3,
  issued: 4,
  delivered: 5,
};

export interface StatusMeta {
  label: string;
  tone: 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'progress';
  /** Icon name from lucide-react; resolved by the StatusBadge component. */
  icon: 'Loader' | 'Eye' | 'TriangleAlert' | 'CircleX' | 'PenLine' | 'BadgeCheck' | 'PackageCheck' | 'Clock';
  /** One-line plain-language explanation for citizens. */
  plain: string;
}

export const APPLICATION_STATUS_META: Record<ApplicationStatus, StatusMeta> = {
  ai_checking: {
    label: 'AI re-check running',
    tone: 'progress',
    icon: 'Loader',
    plain: 'AI is re-checking the document you uploaded.',
  },
  in_review: {
    label: 'Under officer review',
    tone: 'info',
    icon: 'Eye',
    plain: 'A department officer is reviewing your application.',
  },
  changes_requested: {
    label: 'Needs changes',
    tone: 'warning',
    icon: 'TriangleAlert',
    plain: 'Action needed: a document must be corrected and resubmitted.',
  },
  rejected: {
    label: 'Rejected',
    tone: 'danger',
    icon: 'CircleX',
    plain: 'The application was closed. See the reason below.',
  },
  esign_pending: {
    label: 'Approved · awaiting e-sign',
    tone: 'info',
    icon: 'PenLine',
    plain: 'Approved. The authority is digitally signing your certificate.',
  },
  issued: {
    label: 'Issued',
    tone: 'success',
    icon: 'BadgeCheck',
    plain: 'Your certificate has been issued to your Certificate Locker.',
  },
  delivered: {
    label: 'Delivered',
    tone: 'success',
    icon: 'PackageCheck',
    plain: 'Your physical copy has been delivered.',
  },
};

export const DELIVERY_STATUS_META: Record<DeliveryStatus, { label: string; tone: StatusMeta['tone'] }> = {
  dispatched: { label: 'Dispatched', tone: 'info' },
  in_transit: { label: 'In transit', tone: 'info' },
  out_for_delivery: { label: 'Out for delivery', tone: 'progress' },
  delivered: { label: 'Delivered', tone: 'success' },
};

export const DELIVERY_STEPS: DeliveryStatus[] = ['dispatched', 'in_transit', 'out_for_delivery', 'delivered'];

export const OPEN_STATUSES: ApplicationStatus[] = ['ai_checking', 'in_review', 'changes_requested', 'esign_pending'];
export const APPROVED_STATUSES: ApplicationStatus[] = ['esign_pending', 'issued', 'delivered'];
export const DECIDED_STATUSES: ApplicationStatus[] = ['changes_requested', 'rejected', 'esign_pending', 'issued', 'delivered'];
