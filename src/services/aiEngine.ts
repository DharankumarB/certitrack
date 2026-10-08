import type { AICheck, AIIssue, AIValidationResult, CertificateTypeId, CheckKey, CheckStatus, DocumentStatus, MimeType, OcrField, RequirementId } from '../types';
import { REQUIREMENTS } from '../config/certificateTypes';
import { digits, fnv1a, mulberry32 } from '../utils/random';
import { formatDate } from '../utils/format';

/**
 * CertiTrack AI pre-verification engine (PROTOTYPE).
 *
 * This is a deterministic, rule-based simulation of the nine pre-checks a production OCR and
 * forensics service would run. It does NOT read pixels or perform real OCR. Results are
 * "decision support" only: the authorised department officer makes the final decision.
 * Production replacement: call an OCR/forensics service and map its output to AIValidationResult.
 */
export const AI_ENGINE_ID = 'certitrack-precheck-sim-1.0';

export const AI_CHECK_LABELS: Record<CheckKey, string> = {
  document_type: 'Document type',
  readability: 'Readability',
  ocr: 'OCR extraction',
  name_match: 'Name matching',
  dob_match: 'Date of birth matching',
  completeness: 'Document completeness',
  duplicate: 'Duplicate detection',
  tampering: 'Tampering / edit indicators',
  seal_date: 'Seal & date consistency',
};

export const AI_CHECK_ORDER: CheckKey[] = [
  'document_type',
  'readability',
  'ocr',
  'name_match',
  'dob_match',
  'completeness',
  'duplicate',
  'tampering',
  'seal_date',
];

/** Keywords used by the simulation. Real files are judged by content; this keeps demos predictable. */
const SIGNALS = {
  blurred: /blur|unreadable|too-?dark|out[-_ ]?of[-_ ]?focus|low[-_ ]?light/i,
  cropped: /crop|partial|cut-?off/i,
  edited: /edit|tamper|photoshop|overlay|pasted|forged/i,
  duplicate: /duplicate|copy-of/i,
  expired: /expired|old-?scan|2014|2015/i,
  dobMismatch: /dob-?mismatch|wrong-?dob/i,
  nameMismatch: /name-?mismatch|wrong-?name|different-?name/i,
};

const TYPE_HINTS: Array<[RegExp, RequirementId]> = [
  [/photo|selfie|passport[-_ ]?size|headshot/i, 'photo'],
  [/aadhaar|aadhar|voter|driving|licen[cs]e|pan[-_ ]?card|photo[-_ ]?id|identity|id[-_ ]?proof|passport(?![-_ ]?size)/i, 'identity'],
  [/electric|eb[-_ ]?bill|water|gas|utility|bank|address|rent/i, 'address'],
  [/caste|community|school|transfer[-_ ]?certificate/i, 'caste_evidence'],
  [/salary|payslip|pay[-_ ]?slip|income|itr|form[-_ ]?16|employer/i, 'income_proof'],
  [/ration|residence|residential|domicile|property|tax[-_ ]?receipt/i, 'residence_proof'],
];

const NAME_CHECK_REQUIRED: RequirementId[] = ['identity', 'address', 'caste_evidence', 'income_proof', 'residence_proof'];
const DATE_CHECK_REQUIRED: RequirementId[] = ['address', 'caste_evidence', 'income_proof', 'residence_proof'];

export interface AnalyzeInput {
  documentId: string;
  applicationId: string | null;
  requirementId: RequirementId;
  certificateType: CertificateTypeId;
  fileName: string;
  fileSize: number;
  mimeType: MimeType;
  applicantName: string;
  applicantDob: string | null;
  applicantAddress: string;
  details: Record<string, string>;
  /** Fingerprints of documents already on file, used for duplicate detection. */
  existingFingerprints: Array<{ fingerprint: string; applicationId: string; applicantName: string }>;
  runAt: string;
}

export function fingerprintFile(fileName: string, fileSize: number): string {
  return `fp-${fnv1a(`${fileName.toLowerCase()}|${fileSize}`).toString(16)}`;
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const curr = [i];
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(curr[j - 1]! + 1, prev[j]! + 1, prev[j - 1]! + cost);
    }
    prev = curr;
  }
  return prev[n]!;
}

/** 0..1 similarity between two names, case-insensitive. */
export function nameSimilarity(a: string, b: string): number {
  const x = a.trim().toLowerCase().replace(/\s+/g, ' ');
  const y = b.trim().toLowerCase().replace(/\s+/g, ' ');
  if (!x || !y) return 0;
  return 1 - levenshtein(x, y) / Math.max(x.length, y.length);
}

function variantName(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts.length > 1 ? `${parts[0]} Sundaram` : `${parts[0]} Kumar`;
}

function detectRequirement(fileName: string): RequirementId | null {
  for (const [re, id] of TYPE_HINTS) if (re.test(fileName)) return id;
  return null;
}

function maskedNumber(seed: number): string {
  const rng = mulberry32(seed);
  const d = digits(rng, 12);
  return `XXXX XXXX ${d.slice(-4)}`;
}

function scoreOf(status: CheckStatus): number {
  switch (status) {
    case 'pass':
      return 0.96;
    case 'warn':
      return 0.74;
    case 'fail':
      return 0.36;
    default:
      return NaN;
  }
}

function buildOcr(input: AnalyzeInput, unreadable: boolean, seed: number): OcrField[] {
  const rng = mulberry32(seed + 7);
  const conf = (base: number) => (unreadable ? Math.max(0.3, base - 0.45) : Math.min(0.99, base + (rng() * 0.05 - 0.02)));
  if (unreadable) {
    return [
      { label: 'Name', value: 'Partially readable', confidence: conf(0.9) },
      { label: 'Document number', value: 'Not readable', confidence: conf(0.9) },
      { label: 'Date', value: 'Not readable', confidence: conf(0.9) },
    ];
  }
  const fields: OcrField[] = [{ label: 'Name', value: input.applicantName, confidence: conf(0.97) }];
  switch (input.requirementId) {
    case 'identity':
      fields.push({ label: 'Date of birth', value: input.applicantDob ? formatDate(`${input.applicantDob}T00:00:00`) : '—', confidence: conf(0.95) });
      fields.push({ label: 'ID number', value: maskedNumber(seed), confidence: conf(0.93) });
      break;
    case 'address':
      fields.push({ label: 'Address', value: input.applicantAddress.slice(0, 64), confidence: conf(0.92) });
      fields.push({ label: 'Bill / statement date', value: formatDate(new Date(Date.parse(input.runAt) - 20 * 86_400_000)), confidence: conf(0.9) });
      break;
    case 'caste_evidence':
      fields.push({ label: 'Community', value: input.details.community ?? '—', confidence: conf(0.91) });
      fields.push({ label: 'Certificate number', value: maskedNumber(seed + 3), confidence: conf(0.9) });
      break;
    case 'income_proof':
      fields.push({ label: 'Declared income (INR)', value: input.details.annualIncome ? Number(input.details.annualIncome).toLocaleString('en-IN') : '—', confidence: conf(0.9) });
      fields.push({ label: 'Financial year', value: input.details.financialYear ?? '—', confidence: conf(0.91) });
      break;
    case 'residence_proof':
      fields.push({ label: 'Residing since', value: input.details.residingSince ? formatDate(`${input.details.residingSince}T00:00:00`) : '—', confidence: conf(0.9) });
      fields.push({ label: 'Address', value: input.applicantAddress.slice(0, 64), confidence: conf(0.9) });
      break;
    case 'photo':
      fields.push({ label: 'Face detected', value: 'Yes, single face', confidence: conf(0.97) });
      break;
  }
  return fields;
}

/** Runs the nine checks and summarises them into a verdict. Pure and deterministic. */
export function analyzeDocument(input: AnalyzeInput): AIValidationResult {
  const seed = fnv1a(`${input.documentId}|${input.fileName}|${input.fileSize}`);
  const fileName = input.fileName;
  const expected = REQUIREMENTS[input.requirementId];
  const detected = detectRequirement(fileName);
  const isImage = input.mimeType !== 'application/pdf';
  const blurred = SIGNALS.blurred.test(fileName);
  const lowRes = isImage && input.fileSize < 25_000;

  const checks: AICheck[] = [];
  const add = (key: CheckKey, status: CheckStatus, detail: string) => checks.push({ key, label: AI_CHECK_LABELS[key], status, detail });

  // 1. Document type
  if (detected && detected !== input.requirementId) {
    add('document_type', 'fail', `Looks like a ${REQUIREMENTS[detected].expectedType}, but a ${expected.expectedType} is required.`);
  } else {
    add('document_type', 'pass', `Matches the required ${expected.expectedType.toLowerCase()}.`);
  }

  // 2. Readability
  if (blurred) add('readability', 'fail', 'Text is blurred or too dark to read reliably.');
  else if (lowRes) add('readability', 'warn', 'Low-resolution image (under 25 KB). Text may be hard to read.');
  else add('readability', 'pass', 'Text is legible across the page.');
  const unreadable = blurred;

  // 3. OCR extraction
  const ocr = buildOcr(input, unreadable, seed);
  const avgOcr = ocr.reduce((s, f) => s + f.confidence, 0) / ocr.length;
  if (unreadable) add('ocr', 'fail', 'Only partial text could be extracted. Fields need a clearer scan.');
  else add('ocr', 'pass', `${ocr.length} field${ocr.length === 1 ? '' : 's'} extracted with high confidence.`);

  // 4. Name matching
  const nameRequired = NAME_CHECK_REQUIRED.includes(input.requirementId);
  if (!nameRequired) {
    add('name_match', 'na', 'No applicant name is printed on this document type.');
  } else if (unreadable) {
    add('name_match', 'warn', 'Name could not be reliably extracted, so it was not matched.');
  } else {
    const extracted = SIGNALS.nameMismatch.test(fileName) ? variantName(input.applicantName) : input.applicantName;
    const sim = nameSimilarity(extracted, input.applicantName);
    if (sim >= 0.92) add('name_match', 'pass', `Name matched (${Math.round(sim * 100)}% similarity).`);
    else if (sim >= 0.75) add('name_match', 'warn', `Name partly matches (${Math.round(sim * 100)}%). Spelling should be reviewed.`);
    else add('name_match', 'fail', `Name on document "${extracted}" does not match the application.`);
  }

  // 5. Date of birth matching
  if (input.requirementId !== 'identity' || !input.applicantDob) {
    add('dob_match', 'na', 'Date of birth is not applicable to this document.');
  } else if (SIGNALS.dobMismatch.test(fileName)) {
    add('dob_match', 'fail', 'Date of birth on the document differs from the application.');
  } else {
    add('dob_match', 'pass', 'Date of birth matches the application.');
  }

  // 6. Completeness
  if (SIGNALS.cropped.test(fileName)) add('completeness', 'fail', 'Page appears cropped. Part of the document is not visible.');
  else add('completeness', 'pass', 'Full page captured with all corners visible.');

  // 7. Duplicate detection
  const fingerprint = fingerprintFile(fileName, input.fileSize);
  const clash = input.existingFingerprints.find(
    (f) => f.fingerprint === fingerprint && f.applicationId !== input.applicationId && f.applicantName !== input.applicantName,
  );
  if (clash) {
    add('duplicate', 'warn', `Matches a document already used in ${clash.applicationId} for another applicant.`);
  } else if (SIGNALS.duplicate.test(fileName)) {
    add('duplicate', 'warn', 'Possible duplicate of a document submitted earlier. Officer should compare originals.');
  } else {
    add('duplicate', 'pass', 'No matching document found in other applications.');
  }

  // 8. Tampering / edit indicators (heuristic)
  if (SIGNALS.edited.test(fileName)) {
    add('tampering', 'warn', 'Font or kerning inconsistencies near a printed field (heuristic). Verify the original.');
  } else {
    add('tampering', 'pass', 'No editing artefacts detected in metadata or compression pattern (heuristic).');
  }

  // 9. Seal and date consistency
  if (!DATE_CHECK_REQUIRED.includes(input.requirementId)) {
    add('seal_date', 'na', 'Seal and issue-date check is not applicable to this document.');
  } else if (SIGNALS.expired.test(fileName)) {
    add('seal_date', 'warn', 'Issue date is more than three years old. Confirm it is still acceptable.');
  } else {
    add('seal_date', 'pass', 'Issue date and seal region are consistent with other fields (heuristic).');
  }

  const failing = checks.filter((c) => c.status === 'fail');
  const warnings = checks.filter((c) => c.status === 'warn');
  const hardKeys: CheckKey[] = ['document_type', 'readability', 'completeness', 'name_match', 'dob_match'];
  const needsChanges = checks.some((c) => c.status === 'fail' && hardKeys.includes(c.key));

  const verdict: DocumentStatus = needsChanges ? 'needs_changes' : warnings.length > 0 ? 'warning' : 'verified';

  const scored = checks.map((c) => scoreOf(c.status)).filter((s) => !Number.isNaN(s));
  const mean = scored.reduce((s, v) => s + v, 0) / scored.length;
  const jitter = ((seed % 31) - 15) / 1000;
  const confidence = Math.min(0.99, Math.max(0.05, mean * 0.7 + avgOcr * 0.3 + jitter));

  const issues: AIIssue[] = [...failing, ...warnings].map((c) => ({
    severity: c.status === 'fail' ? 'critical' : 'warning',
    checkKey: c.key,
    message: c.detail,
    recommendation: recommendationFor(c.key, c.status, expected.expectedType),
  }));

  let recommendedAction: string;
  if (verdict === 'needs_changes') {
    recommendedAction = `Ask the citizen to upload a corrected ${expected.expectedType.toLowerCase()}. Other documents are accepted.`;
  } else if (verdict === 'warning') {
    recommendedAction = `Officer to compare the ${expected.expectedType.toLowerCase()} with the original before deciding.`;
  } else {
    recommendedAction = 'No action needed. Officer confirmation is still required before approval.';
  }

  return {
    documentId: input.documentId,
    engine: AI_ENGINE_ID,
    runAt: input.runAt,
    durationMs: 900 + (seed % 500),
    confidence: Math.round(confidence * 1000) / 1000,
    verdict,
    detectedType: detected ? REQUIREMENTS[detected].expectedType : expected.expectedType,
    expectedType: expected.expectedType,
    ocr,
    checks,
    issues,
    recommendedAction,
    fingerprint,
  };
}

function recommendationFor(key: CheckKey, status: CheckStatus, expectedType: string): string {
  const doc = expectedType.toLowerCase();
  switch (key) {
    case 'document_type':
      return `Upload the correct ${doc}.`;
    case 'readability':
      return `Upload a clear, full-page scan of the ${doc}.`;
    case 'ocr':
      return 'Re-scan the document in good light so fields can be read.';
    case 'name_match':
      return status === 'fail' ? 'Verify the applicant name against the original ID.' : 'Confirm the spelling against the original.';
    case 'dob_match':
      return 'Check the date of birth against the applicant’s ID.';
    case 'completeness':
      return 'Scan the full page including all four edges.';
    case 'duplicate':
      return 'Compare with the earlier submission and confirm it belongs to this applicant.';
    case 'tampering':
      return 'Request the original from the issuing office for comparison.';
    case 'seal_date':
      return 'Confirm the issue date is acceptable under the current rules.';
  }
}
