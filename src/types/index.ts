// Central domain types for CertiTrack. Every module imports from here so that
// the data layer, store, services and UI share one vocabulary.

export type UserRole = 'citizen' | 'department_staff' | 'super_admin' | 'officer' | 'admin';

/** A department maps 1:1 to a certificate type in the prototype (extensible). */
export type DepartmentId = 'caste' | 'income' | 'domicile';
export type CertificateTypeId = 'caste' | 'income' | 'domicile';

export type RequirementId =
  | 'identity'
  | 'address'
  | 'caste_evidence'
  | 'income_proof'
  | 'residence_proof'
  | 'photo';

/** The six visible workflow stages. */
export type ApplicationStage = 'apply' | 'ai_check' | 'review' | 'esign' | 'issued' | 'delivered';

/** Fine-grained application status. Stage is derived from status + delivery. */
export type ApplicationStatus =
  | 'ai_checking'
  | 'in_review'
  | 'changes_requested'
  | 'rejected'
  | 'esign_pending'
  | 'issued'
  | 'delivered';

export type Priority = 'high' | 'normal' | 'low';
export type PriorityOverride = Priority | null;
export type AccountStatus = 'approved' | 'pending_approval' | 'rejected' | 'suspended';

export type DocumentStatus = 'verified' | 'needs_changes' | 'warning' | 'pending';
export type OfficerDecision = 'accepted' | 'flagged' | null;
export type MimeType = 'application/pdf' | 'image/jpeg' | 'image/png';

export type CheckKey =
  | 'document_type'
  | 'readability'
  | 'ocr'
  | 'name_match'
  | 'dob_match'
  | 'completeness'
  | 'duplicate'
  | 'tampering'
  | 'seal_date';

export type CheckStatus = 'pass' | 'warn' | 'fail' | 'na';

export interface AICheck {
  key: CheckKey;
  label: string;
  status: CheckStatus;
  detail: string;
}

export interface OcrField {
  label: string;
  value: string;
  confidence: number;
}

export type VerificationRecommendation = 'PASS' | 'NEEDS MANUAL REVIEW' | 'UPLOAD REJECTED';
export type FileValidity = 'valid' | 'invalid';
export type MatchResult = 'MATCHED' | 'PARTIAL' | 'MISMATCH';
export type ConsistencyResult = 'CONSISTENT' | 'REVIEW' | 'INCONSISTENT';

export interface AIIssue {
  severity: 'warning' | 'critical';
  checkKey: CheckKey;
  message: string;
  recommendation: string;
}

export interface VerificationStage {
  stage: string;
  status: CheckStatus;
  detail: string;
}

export interface AIValidationResult {
  documentId: string;
  engine: string;
  runAt: string;
  durationMs: number;
  /** 0..1 overall confidence of the automated checks. */
  confidence: number;
  verdict: DocumentStatus;
  detectedType: string;
  expectedType: string;
  fileValidity?: FileValidity;
  imageQualityScore?: number;
  documentType?: string;
  documentTypeConfidence?: number;
  ocrConfidence?: number;
  extractedFields?: OcrField[];
  fieldMatchingResult?: MatchResult;
  consistencyResult?: ConsistencyResult;
  forensicIndicators?: string[];
  overallAiVerificationConfidence?: number;
  finalRecommendation?: VerificationRecommendation;
  prototypeMode?: boolean;
  pipeline?: VerificationStage[];
  ocr: OcrField[];
  checks: AICheck[];
  issues: AIIssue[];
  recommendedAction: string;
  fingerprint: string;
}

export interface Document {
  id: string;
  applicationId: string;
  requirementId: RequirementId;
  label: string;
  fileName: string;
  fileSize: number;
  mimeType: MimeType;
  version: number;
  uploadedAt: string;
  uploadedBy: string;
  ai: AIValidationResult | null;
  officerDecision: OfficerDecision;
  officerRemark: string | null;
  /** Key of the file blob in the browser blob store. Null for seeded demo documents. */
  blobKey: string | null;
  fingerprint: string;
}

export interface TimelineEvent {
  id: string;
  at: string;
  stage: ApplicationStage;
  /** Machine key used for analytics (durations per stage). */
  key: string;
  action: string;
  description: string;
  department: string | null;
  actorName: string;
  actorRole: UserRole | 'system' | 'ai' | 'courier';
  tone: 'info' | 'success' | 'warning' | 'danger';
}

export interface Application {
  id: string;
  certificateType: CertificateTypeId;
  departmentId: DepartmentId;
  citizenId: string;
  applicantName: string;
  applicantEmail: string;
  applicantMobile: string;
  applicantDob: string;
  gender: string;
  address: string;
  district: string;
  taluk: string;
  village: string;
  details: Record<string, string>;
  status: ApplicationStatus;
  priorityOverride: PriorityOverride;
  submittedAt: string;
  updatedAt: string;
  expectedBy: string;
  deliveryRequested: boolean;
  reviewStartedAt: string | null;
  reviewerId: string | null;
  officerRemark: string | null;
  rejectionReason: string | null;
  esignAt: string | null;
  completedAt: string | null;
  certificateId: string | null;
  aiScore: number;
  timeline: TimelineEvent[];
}

export interface Certificate {
  id: string;
  certificateNumber: string;
  certificateType: CertificateTypeId;
  applicationId: string;
  citizenId: string;
  applicantName: string;
  applicantDob: string;
  parentOrSpouseName: string;
  address: string;
  district: string;
  details: Record<string, string>;
  issuedAt: string;
  validUntil: string | null;
  authority: string;
  signatory: string;
  signatureAlgorithm: string;
  signedAt: string;
  verificationCode: string;
  deliveryRequested: boolean;
  status: 'active' | 'revoked';
}

export type DeliveryStatus = 'dispatched' | 'in_transit' | 'out_for_delivery' | 'delivered';

export interface DeliveryEvent {
  id: string;
  at: string;
  status: DeliveryStatus;
  location: string;
  description: string;
}

export interface Delivery {
  id: string;
  applicationId: string;
  certificateId: string;
  trackingId: string;
  carrier: string;
  status: DeliveryStatus;
  recipientName: string;
  recipientAddress: string;
  dispatchedAt: string;
  estimatedDelivery: string;
  currentLocation: string;
  deliveredAt: string | null;
  nextStepAt: string | null;
  events: DeliveryEvent[];
}

export type NotificationChannel = 'in_app' | 'whatsapp' | 'email';
export type NotificationKind =
  | 'application'
  | 'changes'
  | 'approval'
  | 'rejection'
  | 'certificate'
  | 'delivery'
  | 'officer'
  | 'system'
  | 'security';

export interface AppNotification {
  id: string;
  recipientId: string;
  recipientRole: UserRole;
  title: string;
  body: string;
  kind: NotificationKind;
  tone: 'info' | 'success' | 'warning' | 'danger';
  channels: NotificationChannel[];
  applicationId: string | null;
  createdAt: string;
  read: boolean;
}

export type AuditResult = 'success' | 'denied' | 'failed' | 'info';

export interface AuditLog {
  id: string;
  at: string;
  actorId: string | null;
  actorName: string;
  actorRole: UserRole | 'system' | 'public';
  action: string;
  applicationId: string | null;
  departmentId: DepartmentId | null;
  result: AuditResult;
  detail: string;
  ipMasked: string;
  device: string;
}

export type LanguageCode = 'en' | 'hi' | 'ta' | 'kn';

export interface NotificationPreferences {
  whatsapp: boolean;
  email: boolean;
}

interface UserBase {
  id: string;
  name: string;
  email: string;
  mobile: string;
  createdAt: string;
  /** Development-only password verifier. Never treat browser-stored credentials as production auth. */
  passwordDigest: string;
  active: boolean;
  lastLoginAt: string | null;
  accountStatus?: AccountStatus;
  approvalAt?: string | null;
  approvedBy?: string | null;
  rejectionReason?: string | null;
}

export interface CitizenUser extends UserBase {
  role: 'citizen';
  dateOfBirth: string;
  gender: string;
  address: string;
  district: string;
  taluk: string;
  village: string;
  language: LanguageCode;
  notificationPrefs: NotificationPreferences;
}

export interface OfficerUser extends UserBase {
  role: 'department_staff' | 'officer';
  employeeId: string;
  departmentId: DepartmentId;
  designation: string;
  staffReference?: string;
}

export interface AdminUser extends UserBase {
  role: 'super_admin' | 'admin';
  designation: string;
  systemAccess: string[];
}

export type User = CitizenUser | OfficerUser | AdminUser;

export interface Department {
  id: DepartmentId;
  name: string;
  shortName: string;
  description: string;
  headName: string;
  slaDays: number;
  status: 'operational' | 'degraded';
  certificateTypes: CertificateTypeId[];
}

export interface SystemSettings {
  simulationSpeed: 'normal' | 'fast';
  channels: { whatsapp: boolean; email: boolean };
}

export interface Counters {
  application: number;
  certificate: number;
  tracking: number;
  notification: number;
  audit: number;
  user: number;
  document: number;
  event: number;
}

/** The single, centralised, persisted application state. */
export interface AppData {
  schemaVersion: number;
  rev: number;
  seededAt: string;
  users: User[];
  departments: Department[];
  applications: Application[];
  documents: Document[];
  certificates: Certificate[];
  deliveries: Delivery[];
  notifications: AppNotification[];
  auditLogs: AuditLog[];
  settings: SystemSettings;
  counters: Counters;
}

/** Browser session (who is signed in on this tab). Not part of shared data. */
export interface Session {
  userId: string;
  role: UserRole;
  remember: boolean;
  startedAt: string;
}

/** Who is performing an action. Passed to services and transitions for audit trails. */
export interface ActorRef {
  id: string | null;
  name: string;
  role: UserRole | 'system' | 'public';
  departmentId?: DepartmentId | null;
}

export interface PublicTrackResult {
  applicationId: string;
  certificateLabel: string;
  stageLabel: string;
  statusLabel: string;
  departmentName: string;
  lastUpdated: string;
  submittedAt: string;
  expectedBy: string;
  stages: { label: string; state: 'complete' | 'current' | 'upcoming' | 'blocked' | 'skipped' }[];
}

export interface ApplicationFilters {
  q?: string;
  certificateType?: CertificateTypeId | 'all';
  status?: ApplicationStatus | 'all' | 'open';
  date?: 'today' | '7d' | '30d' | 'all';
  ai?: 'all' | 'high' | 'review' | 'issue' | 'unreadable';
  priority?: Priority | 'all';
}
