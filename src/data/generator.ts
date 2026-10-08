import type {
  Application,
  ApplicationStatus,
  AuditLog,
  Certificate,
  CertificateTypeId,
  CitizenUser,
  Delivery,
  Document,
  MimeType,
  OfficerUser,
  OfficerDecision,
  RequirementId,
} from '../types';
import { CERTIFICATE_TYPES, CASTE_CATEGORIES, FINANCIAL_YEARS, INCOME_SOURCES } from '../config/certificateTypes';
import { DISTRICT_TALUKS, DISTRICTS, GENDER_OPTIONS } from '../config/geography';
import { DAY, DEVICE_LABELS, DocSpec, HOUR, MIN, buildApplication, buildCertificate, buildDelivery, buildDocuments, buildTimeline, makeAudit } from './factories';
import { mulberry32, pick, randInt, Rng } from '../utils/random';
import { AI_ENGINE_ID } from '../services/aiEngine';
import { mockDepartments } from './mockDepartments';

/** Number of synthetic applications generated on top of the curated story. */
export const SYNTHETIC_COUNT = 140;

const FIRST = ['Lakshmi', 'Revathi', 'Kavya', 'Priya', 'Divya', 'Sowmya', 'Harini', 'Nithya', 'Janani', 'Keerthana', 'Suresh', 'Ravi', 'Karthik', 'Arun', 'Vignesh', 'Mohan', 'Sanjay', 'Dinesh', 'Prakash', 'Ganesh', 'Ramesh', 'Senthil', 'Bala', 'Gopal', 'Madhan', 'Naveen', 'Rajesh', 'Sathya', 'Anitha', 'Chitra', 'Shalini'];
const LAST = ['Krishnan', 'Pillai', 'Babu', 'Rajan', 'Subramanian', 'Iyer', 'Nair', 'Murugan', 'Selvam', 'Kumar', 'Shankar', 'Raman', 'Natarajan', 'Velu', 'Chandran', 'Mani', 'Dorai', 'Thomas', 'Joseph', 'Menon'];
const STREETS = ['Gandhi Street', 'Nehru Nagar', 'Temple Road', 'Mill Road', 'Bharathi Street', 'Kamaraj Colony', 'Lake View Road', 'Market Street'];
const VILLAGES = ['Kinathukadavu', 'Anaimalai', 'Periyanaickenpalayam', 'Vadavalli', 'Sulur', 'Annur', 'Melur', 'Thirunagar', 'Chithode', 'Perundurai'];
const REJECT_REASONS = [
  'Identity document is not in the applicant’s name.',
  'A duplicate application already exists for this applicant.',
  'Supporting evidence could not be verified with the issuing office.',
];

const CLEAN_FILES: Record<RequirementId, Array<[string, MimeType, number]>> = {
  identity: [
    ['aadhaar-card.pdf', 'application/pdf', 210_000],
    ['voter-id-card.jpg', 'image/jpeg', 640_000],
    ['passport-scan.pdf', 'application/pdf', 233_000],
  ],
  address: [
    ['electricity-bill.pdf', 'application/pdf', 181_000],
    ['bank-statement.pdf', 'application/pdf', 201_000],
    ['water-bill.jpg', 'image/jpeg', 720_000],
  ],
  caste_evidence: [
    ['caste-certificate.pdf', 'application/pdf', 268_000],
    ['school-transfer-certificate.pdf', 'application/pdf', 259_000],
  ],
  income_proof: [
    ['salary-slip.pdf', 'application/pdf', 138_000],
    ['employer-letter.pdf', 'application/pdf', 152_000],
    ['itr-acknowledgement.pdf', 'application/pdf', 149_000],
  ],
  residence_proof: [
    ['ration-card.jpg', 'image/jpeg', 1_020_000],
    ['property-tax-receipt.pdf', 'application/pdf', 176_000],
  ],
  photo: [
    ['passport-photo.jpg', 'image/jpeg', 98_000],
    ['selfie-photo.png', 'image/png', 430_000],
  ],
};

const DEPT_FOR_TYPE: Record<CertificateTypeId, string> = { caste: 'caste', income: 'income', domicile: 'domicile' };
const TYPES: CertificateTypeId[] = ['caste', 'income', 'domicile'];

function clamp(value: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, value));
}

function iso(ms: number): string {
  return new Date(ms).toISOString();
}

function makeCitizen(i: number, rng: Rng, now: number): CitizenUser {
  const first = pick(rng, FIRST);
  const last = pick(rng, LAST);
  const district = pick(rng, DISTRICTS);
  const taluk = pick(rng, DISTRICT_TALUKS[district]!);
  const id = `usr-syn-cit-${String(i + 1).padStart(3, '0')}`;
  return {
    id,
    role: 'citizen',
    name: `${first} ${last}`,
    email: `${first.toLowerCase()}.${last.toLowerCase()}${i + 1}@mail.example`,
    mobile: `9${String(100_000_000 + Math.floor(rng() * 899_999_999)).slice(0, 9)}`,
    createdAt: iso(now - 200 * DAY),
    passwordDigest: '',
    active: false,
    lastLoginAt: null,
    dateOfBirth: `${randInt(rng, 1968, 2004)}-${String(randInt(rng, 1, 12)).padStart(2, '0')}-${String(randInt(rng, 1, 27)).padStart(2, '0')}`,
    gender: pick(rng, GENDER_OPTIONS),
    address: `${randInt(rng, 1, 180)}, ${pick(rng, STREETS)}, Ward ${randInt(rng, 1, 22)}`,
    district,
    taluk,
    village: pick(rng, VILLAGES),
    language: 'en',
    notificationPrefs: { whatsapp: rng() > 0.2, email: rng() > 0.4 },
  };
}

export interface SyntheticBundle {
  citizens: CitizenUser[];
  applications: Application[];
  documents: Document[];
  certificates: Certificate[];
  deliveries: Delivery[];
  auditLogs: AuditLog[];
  nextCertificateNumber: number;
}

/**
 * Generates a realistic, deterministic bulk dataset. Statuses are consistent with the age of each
 * application, so the dashboards, queues and analytics look like a live service that has been running.
 */
export function generateSynthetic(now: number, curatedNumbers: Set<number>, officers: OfficerUser[]): SyntheticBundle {
  const rng = mulberry32(20261008);
  const citizens = Array.from({ length: 46 }, (_, i) => makeCitizen(i, rng, now));

  const idPool: number[] = [];
  for (let n = 10010; idPool.length < SYNTHETIC_COUNT; n++) if (!curatedNumbers.has(n)) idPool.push(n);

  const plans = Array.from({ length: SYNTHETIC_COUNT }, () => {
    const ageDays = rng() < 0.35 ? 0.5 + rng() * 13.5 : 14 + rng() * 76;
    const r = rng();
    return {
      ageMs: ageDays * DAY,
      type: pick(rng, TYPES),
      citizen: pick(rng, citizens),
      scenario: r < 0.82 ? ('clean' as const) : r < 0.92 ? ('warning' as const) : ('needs' as const),
    };
  });
  plans.sort((a, b) => b.ageMs - a.ageMs);

  const applications: Application[] = [];
  const documents: Document[] = [];
  const certificates: Certificate[] = [];
  const deliveries: Delivery[] = [];
  const auditLogs: AuditLog[] = [];
  let certNumber = 400;
  let deliveryNumber = 512_000_000;

  plans.forEach((plan, idx) => {
    const num = idPool[idx]!;
    const appId = `APP-${num}`;
    const type = plan.type;
    const dept = mockDepartments.find((d) => d.id === DEPT_FOR_TYPE[type])!;
    const deptOfficers = officers.filter((o) => o.departmentId === dept.id);
    const reviewer = pick(rng, deptOfficers);
    const submittedMs = now - plan.ageMs;
    const ageDays = plan.ageMs / DAY;
    const citizen = plan.citizen;
    const applicant = { id: citizen.id, name: citizen.name, email: citizen.email, mobile: citizen.mobile, dob: citizen.dateOfBirth, gender: citizen.gender, address: citizen.address, district: citizen.district, taluk: citizen.taluk, village: citizen.village };

    // Outcome selection keeps statuses consistent with the age of the file.
    let outcome: ApplicationStatus;
    if (plan.scenario === 'needs') outcome = 'changes_requested';
    else if (ageDays > 12) outcome = rng() < 0.46 ? 'delivered' : rng() < 0.85 ? 'issued' : 'rejected';
    else if (ageDays > 4) outcome = rng() < 0.3 ? 'delivered' : rng() < 0.6 ? 'issued' : rng() < 0.75 ? 'in_review' : rng() < 0.87 ? 'rejected' : 'changes_requested';
    else outcome = rng() < 0.7 ? 'in_review' : ageDays > 1.5 ? 'changes_requested' : 'in_review';
    if (ageDays < 1.5 && (outcome === 'rejected' || outcome === 'issued' || outcome === 'delivered')) outcome = 'in_review';

    // Documents
    const requirements = CERTIFICATE_TYPES[type].requirements;
    const specs: DocSpec[] = requirements.map((req) => {
      const [name, mime, size] = pick(rng, CLEAN_FILES[req]);
      return { requirementId: req, fileName: name, fileSize: size + randInt(rng, 0, 40_000), mimeType: mime };
    });
    if (plan.scenario === 'warning') {
      const target = specs.find((s) => s.requirementId === 'address') ?? specs[0]!;
      if (target.requirementId === 'address') {
        target.fileName = 'address-proof-lowres.jpg';
        target.mimeType = 'image/jpeg';
        target.fileSize = 19_000 + randInt(rng, 0, 3000);
      } else {
        target.fileName = 'caste-certificate-edited.pdf';
        target.mimeType = 'application/pdf';
      }
    }
    if (plan.scenario === 'needs') {
      const target = specs.find((s) => s.requirementId === 'address') ?? specs[0]!;
      target.fileName = 'address-proof-blurred.jpg';
      target.mimeType = 'image/jpeg';
      target.fileSize = 16_000 + randInt(rng, 0, 2000);
    }

    const details: Record<string, string> = {};
    if (type === 'caste') {
      details.community = `Demo Community ${String.fromCharCode(65 + randInt(rng, 0, 4))}`;
      details.category = pick(rng, CASTE_CATEGORIES);
      details.fatherName = `${pick(rng, FIRST)} ${pick(rng, LAST)}`;
    } else if (type === 'income') {
      details.annualIncome = String(randInt(rng, 60, 450) * 1000);
      details.incomeSource = pick(rng, INCOME_SOURCES);
      details.familyMembers = String(randInt(rng, 2, 7));
      details.financialYear = pick(rng, FINANCIAL_YEARS);
    } else {
      const years = randInt(rng, 3, 30);
      details.yearsOfResidence = String(years);
      details.residingSince = new Date(now - years * 365 * DAY).toISOString().slice(0, 10);
      details.parentOrSpouseName = `${pick(rng, FIRST)} ${pick(rng, LAST)}`;
    }

    const submittedAt = iso(submittedMs);
    const docs = buildDocuments(
      {
        appId,
        certificateType: type,
        submittedAt,
        applicantName: citizen.name,
        applicantDob: citizen.dateOfBirth,
        applicantAddress: citizen.address,
        details,
        uploadedBy: citizen.name,
        existingFingerprints: [],
      },
      specs,
      `doc-${num}`,
    );

    // Officer decisions and remarks
    const needs = docs.filter((d) => d.ai?.verdict === 'needs_changes');
    const decided = ['issued', 'delivered', 'rejected'].includes(outcome) || outcome === 'changes_requested';
    const flaggedIds = new Set<string>();
    if (outcome === 'changes_requested') {
      (needs.length ? needs : [docs.find((d) => d.requirementId === 'address') ?? docs[0]!]).forEach((d) => flaggedIds.add(d.id));
    } else if (outcome === 'rejected') {
      flaggedIds.add(docs[docs.length - 1]!.id);
    }
    docs.forEach((d) => {
      if (flaggedIds.has(d.id)) {
        d.officerDecision = 'flagged';
        d.officerRemark = d.ai?.verdict === 'needs_changes' ? 'Not readable in the scan. Clear full-page copy needed.' : 'Does not match the required document.';
      } else if (decided) {
        d.officerDecision = 'accepted' as OfficerDecision;
      }
    });

    // Timeline clock
    const reviewAtMs = clamp(submittedMs + 6 * HOUR + rng() * Math.min(plan.ageMs * 0.4, 2 * DAY), submittedMs + 6 * HOUR, now - HOUR);
    const decisionAtMs = clamp(reviewAtMs + (2 + rng() * 18) * HOUR, reviewAtMs + HOUR, now - 10 * MIN);
    const issuedMs = decisionAtMs + 3 * MIN;
    const wantsReview = outcome !== 'in_review' ? true : ageDays > 1 && rng() < 0.6;
    const aiSummaryNeeds = needs.length > 0 || plan.scenario === 'needs';
    const warnings = docs.filter((d) => d.ai?.verdict === 'warning');
    const aiSummary = aiSummaryNeeds
      ? `${Math.max(1, needs.length)} document needs changes: ${(needs[0]?.label ?? 'address proof').toLowerCase()}.`
      : warnings.length > 0
        ? `${warnings.length} warning${warnings.length > 1 ? 's' : ''}: ${warnings.map((w) => w.label.toLowerCase()).join(', ')} need officer review.`
        : `All ${docs.length} documents verified. No warnings.`;
    const aiTone = aiSummaryNeeds ? 'danger' : warnings.length ? 'warning' : 'success';
    const changedLabel = [...flaggedIds].map((id) => docs.find((d) => d.id === id)?.label ?? 'document').join(', ').toLowerCase();

    // Delivery
    let deliveryRequested = false;
    let delivery: Delivery | null = null;
    let finalStatus: ApplicationStatus = outcome;
    let deliveryTimes: { dispatchedAt: string; inTransitAt?: string | null; outForDeliveryAt?: string | null; deliveredAt?: string | null; location: string } | null = null;
    if (outcome === 'delivered' || (outcome === 'issued' && rng() < 0.12)) {
      const dispatchedMs = clamp(issuedMs + 2 * HOUR, issuedMs, now - 5 * MIN);
      const inTransitMs = dispatchedMs + 6 * HOUR;
      const outMs = dispatchedMs + 30 * HOUR;
      const deliveredMs = dispatchedMs + 48 * HOUR;
      const location = `${citizen.district} Sorting Hub`;
      deliveryNumber += 1;
      if (deliveredMs < now) {
        deliveryTimes = { dispatchedAt: iso(dispatchedMs), inTransitAt: iso(inTransitMs), outForDeliveryAt: iso(outMs), deliveredAt: iso(deliveredMs), location };
        finalStatus = 'delivered';
      } else {
        deliveryTimes = { dispatchedAt: iso(dispatchedMs), inTransitAt: inTransitMs < now ? iso(inTransitMs) : null, location };
        finalStatus = 'issued';
      }
    }
    deliveryRequested = deliveryTimes !== null;

    const issuedAtIso = ['issued', 'delivered'].includes(finalStatus) ? iso(issuedMs) : null;
    const timeline = buildTimeline(appId, {
      submittedAt,
      applicantName: citizen.name,
      deptName: dept.name,
      certLabel: CERTIFICATE_TYPES[type].label,
      ai: { at: iso(submittedMs + 3 * MIN), summary: aiSummary, tone: aiTone },
      queuedAt: iso(submittedMs + 4 * MIN),
      reviewStart: wantsReview ? { at: iso(reviewAtMs), officer: reviewer.name } : null,
      changes: outcome === 'changes_requested' ? { at: iso(decisionAtMs), detail: `Changes requested: ${changedLabel || 'document'} must be re-uploaded.`, officer: reviewer.name } : null,
      rejected: outcome === 'rejected' ? { at: iso(decisionAtMs), reason: pick(rng, REJECT_REASONS), officer: reviewer.name } : null,
      approved: ['issued', 'delivered'].includes(outcome) ? { at: iso(decisionAtMs), officer: reviewer.name } : null,
      esignQueuedAt: issuedAtIso ? iso(decisionAtMs + MIN) : null,
      signedAt: issuedAtIso ? iso(decisionAtMs + 2 * MIN) : null,
      issuedAt: issuedAtIso,
      delivery: deliveryTimes,
    });

    const rejectionReason = outcome === 'rejected' ? timeline.find((e) => e.key === 'rejected')?.description ?? null : null;
    const officerRemark = outcome === 'changes_requested' ? timeline.find((e) => e.key === 'changes_requested')?.description ?? null : null;
    const completedAt = finalStatus === 'delivered' && deliveryTimes?.deliveredAt ? deliveryTimes.deliveredAt : issuedAtIso;
    const certId = issuedAtIso ? `cert-syn-${num}` : null;

    const application = buildApplication({
      id: appId,
      certificateType: type,
      departmentId: dept.id,
      citizen: applicant,
      details,
      status: finalStatus,
      submittedAt,
      deptSlaDays: dept.slaDays,
      deliveryRequested,
      timeline,
      documents: docs,
      reviewStartedAt: wantsReview ? iso(reviewAtMs) : null,
      reviewerId: wantsReview ? reviewer.id : null,
      officerRemark,
      rejectionReason,
      esignAt: null,
      completedAt: completedAt,
      certificateId: certId,
    });
    applications.push(application);
    documents.push(...docs);

    if (certId && issuedAtIso) {
      const number = certNumber++;
      certificates.push(
        buildCertificate({
          id: certId,
          number,
          year: 2026,
          type,
          applicationId: appId,
          citizen: { id: citizen.id, name: citizen.name, dob: citizen.dateOfBirth, address: citizen.address, district: citizen.district },
          parentOrSpouseName: details.fatherName ?? details.parentOrSpouseName ?? '—',
          details,
          issuedAt: issuedAtIso,
          deliveryRequested,
          taluk: citizen.taluk,
        }),
      );
    }

    if (deliveryTimes && certId) {
      delivery = buildDelivery({
        id: `dlv-syn-${num}`,
        number: deliveryNumber,
        applicationId: appId,
        certificateId: certId,
        recipientName: citizen.name,
        recipientAddress: citizen.address,
        location: deliveryTimes.location,
        dispatchedAt: deliveryTimes.dispatchedAt,
        status: finalStatus === 'delivered' ? 'delivered' : deliveryTimes.inTransitAt ? 'in_transit' : 'dispatched',
        nextStepAt: finalStatus === 'delivered' ? null : iso(now + (5 + Math.floor(rng() * 35)) * MIN),
        inTransitAt: deliveryTimes.inTransitAt ?? null,
        outForDeliveryAt: deliveryTimes.outForDeliveryAt ?? null,
        deliveredAt: deliveryTimes.deliveredAt ?? null,
      });
      deliveries.push(delivery);
    }

    // Audit trail for the synthetic application
    const audit = (at: string, actor: { id: string | null; name: string; role: AuditLog['actorRole'] }, action: string, extra: { result?: AuditLog['result']; detail?: string } = {}) =>
      auditLogs.push(makeAudit(`aud-syn-${num}-${auditLogs.length}`, at, actor, action, { applicationId: appId, departmentId: dept.id, device: DEVICE_LABELS[(num + auditLogs.length) % DEVICE_LABELS.length], ...extra }));
    const officerActor = { id: reviewer.id, name: reviewer.name, role: 'officer' as const };
    audit(submittedAt, { id: citizen.id, name: citizen.name, role: 'citizen' }, 'application_submitted', { detail: `${CERTIFICATE_TYPES[type].label} submitted with ${docs.length} documents` });
    audit(iso(submittedMs + 3 * MIN), { id: null, name: AI_ENGINE_ID, role: 'system' }, 'ai_check_run', { detail: aiSummary });
    if (wantsReview) audit(iso(reviewAtMs), officerActor, 'review_started');
    if (outcome === 'changes_requested') audit(iso(decisionAtMs), officerActor, 'changes_requested', { detail: changedLabel || 'document' });
    if (outcome === 'rejected') audit(iso(decisionAtMs), officerActor, 'application_rejected', { result: 'success', detail: rejectionReason ?? '' });
    if (['issued', 'delivered'].includes(outcome)) {
      audit(iso(decisionAtMs), officerActor, 'application_approved');
      audit(iso(issuedMs), { id: null, name: 'CertiTrack system', role: 'system' }, 'certificate_issued', { detail: `Certificate ${certId}` });
    }
    if (deliveryTimes) audit(deliveryTimes.dispatchedAt, { id: null, name: 'Partner courier (simulated)', role: 'system' }, 'delivery_dispatched');
  });

  // Ensure certificate counter follows the last synthetic number.
  return {
    citizens,
    applications,
    documents,
    certificates,
    deliveries,
    auditLogs,
    nextCertificateNumber: certNumber,
  };
}
