import type { Application, Certificate, Delivery, Department, Document, User } from '../types';
import { SAMPLE_CITIZEN_ID, SAMPLE_CASTE_STAFF_ID } from './mockUsers';
import { mockDepartments } from './mockDepartments';
import { ago, buildApplication, buildCertificate, buildDelivery, buildDocuments, buildTimeline, MIN, plus } from './factories';
import type { DocSpec } from './factories';

/**
 * Curated demo story. Each record is hand-authored so judges can follow a clear narrative:
 * issued & delivered (domicile), issued (income), rejected (caste), issued with live courier (caste),
 * in review with a warning (income), needs changes (domicile), awaiting e-sign (caste, completes live),
 * AI-flagged caste file (other citizen), pending caste files, and an income file from another department
 * to demonstrate department isolation.
 */

export interface CuratedBundle {
  applications: Application[];
  documents: Document[];
  certificates: Certificate[];
  deliveries: Delivery[];
  citizens: User[];
}

const DEPT: Record<string, Department> = Object.fromEntries(mockDepartments.map((d) => [d.id, d]));

const STD = {
  identity: (size = 214_000): DocSpec => ({ requirementId: 'identity', fileName: 'aadhaar-card.pdf', fileSize: size, mimeType: 'application/pdf' }),
  address: (): DocSpec => ({ requirementId: 'address', fileName: 'electricity-bill.pdf', fileSize: 188_000, mimeType: 'application/pdf' }),
  photo: (): DocSpec => ({ requirementId: 'photo', fileName: 'passport-photo.jpg', fileSize: 96_000, mimeType: 'image/jpeg' }),
};

const accepted = (spec: DocSpec): DocSpec => ({ ...spec, officerDecision: 'accepted' });

export function curatedBundle(now: number): CuratedBundle {
  const meera = {
    id: SAMPLE_CITIZEN_ID,
    name: 'Meera Krishnan',
    email: 'meera.krishnan@sample.invalid',
    mobile: '9000000001',
    dob: '1994-03-18',
    gender: 'Female',
    address: '14, Gandhi Street, Ward 7, near the Panchayat Office',
    district: 'Coimbatore',
    taluk: 'Pollachi',
    village: 'Kinathukadavu',
  };
  const suresh = { id: 'usr-cit-suresh', name: 'Suresh Babu', email: 'suresh.babu@mail.example', mobile: '9876501234', dob: '1989-11-02', gender: 'Male', address: '22, Bharathi Street, Kamaraj Colony', district: 'Madurai', taluk: 'Madurai South', village: 'Thirunagar' };
  const anjali = { id: 'usr-cit-anjali', name: 'Anjali Pillai', email: 'anjali.pillai@mail.example', mobile: '9845012377', dob: '1997-06-21', gender: 'Female', address: '7, Temple Road, Gandhipuram', district: 'Coimbatore', taluk: 'Coimbatore North', village: 'Peelamedu' };
  const ravi = { id: 'usr-cit-ravi', name: 'Ravi Shankar', email: 'ravi.shankar@mail.example', mobile: '9712345680', dob: '1985-01-09', gender: 'Male', address: '3/45, Mill Road, Erode', district: 'Erode', taluk: 'Erode', village: 'Chithode' };
  const sub = (days: number, hours = 0, minutes = 0) => ago(now, days, hours, minutes);
  const apps: Application[] = [];
  const docs: Document[] = [];
  const certs: Certificate[] = [];
  const deliveries: Delivery[] = [];
  const MEERA_ADDR = meera.address;

  // 1. APP-10102 · Domicile · issued and delivered
  {
    const submittedAt = sub(40, 3);
    const timeline = buildTimeline('APP-10102', {
      submittedAt,
      applicantName: meera.name,
      deptName: DEPT.domicile!.name,
      certLabel: 'Domicile Certificate',
      ai: { at: plus(submittedAt, 4), summary: 'All 4 documents verified. No warnings.', tone: 'success' },
      queuedAt: plus(submittedAt, 5),
      reviewStart: { at: sub(39, 2), officer: 'Geetha Lakshmi' },
      approved: { at: sub(37, 4), officer: 'Geetha Lakshmi' },
      esignQueuedAt: plus(sub(37, 4), 1),
      signedAt: plus(sub(37, 4), 2),
      issuedAt: plus(sub(37, 4), 3),
      delivery: { dispatchedAt: sub(36, 20), inTransitAt: sub(35, 6), outForDeliveryAt: sub(34, 5), deliveredAt: sub(34, 1), location: 'Coimbatore Sorting Hub' },
    });
    const specs: DocSpec[] = [accepted(STD.identity()), accepted(STD.address()), accepted({ requirementId: 'residence_proof', fileName: 'ration-card.jpg', fileSize: 1_150_000, mimeType: 'image/jpeg' }), accepted(STD.photo())];
    const documents = buildDocuments({ appId: 'APP-10102', certificateType: 'domicile', submittedAt, applicantName: meera.name, applicantDob: meera.dob, applicantAddress: MEERA_ADDR, details: { yearsOfResidence: '12', residingSince: '2014-06-01', parentOrSpouseName: 'Murugesan Krishnan' }, uploadedBy: meera.name, existingFingerprints: [] }, specs, 'doc-10102');
    docs.push(...documents);
    certs.push(buildCertificate({ id: 'cert-10102', number: 118, year: 2026, type: 'domicile', applicationId: 'APP-10102', citizen: meera, parentOrSpouseName: 'Murugesan Krishnan', details: { yearsOfResidence: '12', residingSince: '2014-06-01' }, issuedAt: plus(sub(37, 4), 3), deliveryRequested: true, taluk: meera.taluk }));
    deliveries.push(buildDelivery({ id: 'dlv-10102', number: 418302, applicationId: 'APP-10102', certificateId: 'cert-10102', recipientName: meera.name, recipientAddress: MEERA_ADDR, location: 'Coimbatore Sorting Hub', dispatchedAt: sub(36, 20), status: 'delivered', nextStepAt: null, inTransitAt: sub(35, 6), outForDeliveryAt: sub(34, 5), deliveredAt: sub(34, 1) }));
    apps.push(buildApplication({ id: 'APP-10102', certificateType: 'domicile', departmentId: 'domicile', citizen: meera, details: { yearsOfResidence: '12', residingSince: '2014-06-01', parentOrSpouseName: 'Murugesan Krishnan' }, status: 'delivered', submittedAt, deptSlaDays: DEPT.domicile!.slaDays, deliveryRequested: true, timeline, documents, reviewStartedAt: sub(39, 2), reviewerId: 'usr-officer-domicile-1', officerRemark: null, rejectionReason: null, esignAt: null, completedAt: sub(34, 1), certificateId: 'cert-10102' }));
  }

  // 2. APP-10158 · Income · issued (digital only)
  {
    const submittedAt = sub(21, 2);
    const issued = plus(sub(17, 6), 3);
    const timeline = buildTimeline('APP-10158', {
      submittedAt,
      applicantName: meera.name,
      deptName: DEPT.income!.name,
      certLabel: 'Income Certificate',
      ai: { at: plus(submittedAt, 4), summary: 'All 4 documents verified. No warnings.', tone: 'success' },
      queuedAt: plus(submittedAt, 5),
      reviewStart: { at: sub(20, 1), officer: 'Sathish Kumar' },
      approved: { at: sub(17, 6), officer: 'Sathish Kumar' },
      esignQueuedAt: plus(sub(17, 6), 1),
      signedAt: plus(sub(17, 6), 2),
      issuedAt: issued,
    });
    const specs: DocSpec[] = [accepted(STD.identity()), accepted(STD.address()), accepted({ requirementId: 'income_proof', fileName: 'salary-slip-march-2026.pdf', fileSize: 142_000, mimeType: 'application/pdf' }), accepted(STD.photo())];
    const details = { annualIncome: '324000', incomeSource: 'Salaried employment', familyMembers: '4', financialYear: '2025-26' };
    docs.push(...buildDocuments({ appId: 'APP-10158', certificateType: 'income', submittedAt, applicantName: meera.name, applicantDob: meera.dob, applicantAddress: MEERA_ADDR, details, uploadedBy: meera.name, existingFingerprints: [] }, specs, 'doc-10158'));
    certs.push(buildCertificate({ id: 'cert-10158', number: 241, year: 2026, type: 'income', applicationId: 'APP-10158', citizen: meera, parentOrSpouseName: 'Murugesan Krishnan', details, issuedAt: issued, deliveryRequested: false, taluk: meera.taluk }));
    apps.push(buildApplication({ id: 'APP-10158', certificateType: 'income', departmentId: 'income', citizen: meera, details, status: 'issued', submittedAt, deptSlaDays: DEPT.income!.slaDays, deliveryRequested: false, timeline, documents: docs.filter((d) => d.applicationId === 'APP-10158'), reviewStartedAt: sub(20, 1), reviewerId: 'usr-officer-income-1', officerRemark: null, rejectionReason: null, esignAt: null, completedAt: issued, certificateId: 'cert-10158' }));
  }

  // 3. APP-10203 · Caste · rejected after review
  {
    const submittedAt = sub(14, 5);
    const rejectedAt = sub(10, 4);
    const timeline = buildTimeline('APP-10203', {
      submittedAt,
      applicantName: meera.name,
      deptName: DEPT.caste!.name,
      certLabel: 'Caste Certificate',
      ai: { at: plus(submittedAt, 4), summary: '1 warning: the caste evidence is an older scan and its date needs review.', tone: 'warning' },
      queuedAt: plus(submittedAt, 5),
      reviewStart: { at: sub(13, 2), officer: 'Deepa Srinivasan' },
      rejected: { at: rejectedAt, reason: 'The caste evidence was issued to a different applicant. The name on the original record does not match. The application is closed; you may apply again with the correct evidence.', officer: 'Deepa Srinivasan' },
    });
    const specs: DocSpec[] = [
      accepted(STD.identity()),
      accepted(STD.address()),
      { requirementId: 'caste_evidence', fileName: 'caste-certificate-old-scan-2015.pdf', fileSize: 232_000, mimeType: 'application/pdf', officerDecision: 'flagged', officerRemark: 'Name on the original record differs from the applicant.' },
      accepted(STD.photo()),
    ];
    const details = { community: 'Demo Community A', category: 'SC', fatherName: 'Murugesan Krishnan' };
    docs.push(...buildDocuments({ appId: 'APP-10203', certificateType: 'caste', submittedAt, applicantName: meera.name, applicantDob: meera.dob, applicantAddress: MEERA_ADDR, details, uploadedBy: meera.name, existingFingerprints: [] }, specs, 'doc-10203'));
    apps.push(buildApplication({ id: 'APP-10203', certificateType: 'caste', departmentId: 'caste', citizen: meera, details, status: 'rejected', submittedAt, deptSlaDays: DEPT.caste!.slaDays, deliveryRequested: false, timeline, documents: docs.filter((d) => d.applicationId === 'APP-10203'), reviewStartedAt: sub(13, 2), reviewerId: SAMPLE_CASTE_STAFF_ID, officerRemark: null, rejectionReason: 'Caste evidence issued to a different applicant.', esignAt: null, completedAt: rejectedAt, certificateId: null }));
  }

  // 4. APP-10294 · Caste · issued, courier in transit (live)
  {
    const submittedAt = sub(6, 1);
    const approvedAt = sub(4, 2);
    const issuedAt = plus(approvedAt, 3);
    const timeline = buildTimeline('APP-10294', {
      submittedAt,
      applicantName: meera.name,
      deptName: DEPT.caste!.name,
      certLabel: 'Caste Certificate',
      ai: { at: plus(submittedAt, 3), summary: 'All 4 documents verified. No warnings.', tone: 'success' },
      queuedAt: plus(submittedAt, 4),
      reviewStart: { at: sub(5, 2), officer: 'Deepa Srinivasan' },
      approved: { at: approvedAt, officer: 'Deepa Srinivasan' },
      esignQueuedAt: plus(approvedAt, 1),
      signedAt: plus(approvedAt, 2),
      issuedAt,
      delivery: { dispatchedAt: sub(4, 1), inTransitAt: sub(2, 3), location: 'Coimbatore Sorting Hub' },
    });
    const specs: DocSpec[] = [accepted(STD.identity()), accepted(STD.address()), accepted({ requirementId: 'caste_evidence', fileName: 'school-transfer-certificate.pdf', fileSize: 265_000, mimeType: 'application/pdf' }), accepted(STD.photo())];
    const details = { community: 'Demo Community A', category: 'SC', fatherName: 'Murugesan Krishnan' };
    docs.push(...buildDocuments({ appId: 'APP-10294', certificateType: 'caste', submittedAt, applicantName: meera.name, applicantDob: meera.dob, applicantAddress: MEERA_ADDR, details, uploadedBy: meera.name, existingFingerprints: [] }, specs, 'doc-10294'));
    certs.push(buildCertificate({ id: 'cert-10294', number: 309, year: 2026, type: 'caste', applicationId: 'APP-10294', citizen: meera, parentOrSpouseName: 'Murugesan Krishnan', details, issuedAt, deliveryRequested: true, taluk: meera.taluk }));
    deliveries.push(buildDelivery({ id: 'dlv-10294', number: 908172364, applicationId: 'APP-10294', certificateId: 'cert-10294', recipientName: meera.name, recipientAddress: MEERA_ADDR, location: 'Coimbatore Sorting Hub', dispatchedAt: sub(4, 1), status: 'in_transit', nextStepAt: new Date(now + 3 * MIN).toISOString(), inTransitAt: sub(2, 3) }));
    apps.push(buildApplication({ id: 'APP-10294', certificateType: 'caste', departmentId: 'caste', citizen: meera, details, status: 'issued', submittedAt, deptSlaDays: DEPT.caste!.slaDays, deliveryRequested: true, timeline, documents: docs.filter((d) => d.applicationId === 'APP-10294'), reviewStartedAt: sub(5, 2), reviewerId: SAMPLE_CASTE_STAFF_ID, officerRemark: null, rejectionReason: null, esignAt: null, completedAt: issuedAt, certificateId: 'cert-10294' }));
  }

  // 5. APP-10311 · Income · in review with a warning (not yet picked up)
  {
    const submittedAt = sub(3, 3);
    const timeline = buildTimeline('APP-10311', {
      submittedAt,
      applicantName: meera.name,
      deptName: DEPT.income!.name,
      certLabel: 'Income Certificate',
      ai: { at: plus(submittedAt, 3), summary: '1 warning: the income proof is an older statement and its date needs review.', tone: 'warning' },
      queuedAt: plus(submittedAt, 4),
    });
    const specs: DocSpec[] = [STD.identity(), STD.address(), { requirementId: 'income_proof', fileName: 'salary-slip-2014-scan.pdf', fileSize: 118_000, mimeType: 'application/pdf' }, STD.photo()];
    const details = { annualIncome: '298000', incomeSource: 'Salaried employment', familyMembers: '4', financialYear: '2026-27' };
    docs.push(...buildDocuments({ appId: 'APP-10311', certificateType: 'income', submittedAt, applicantName: meera.name, applicantDob: meera.dob, applicantAddress: MEERA_ADDR, details, uploadedBy: meera.name, existingFingerprints: [] }, specs, 'doc-10311'));
    apps.push(buildApplication({ id: 'APP-10311', certificateType: 'income', departmentId: 'income', citizen: meera, details, status: 'in_review', submittedAt, deptSlaDays: DEPT.income!.slaDays, deliveryRequested: false, timeline, documents: docs.filter((d) => d.applicationId === 'APP-10311'), reviewStartedAt: null, reviewerId: null, officerRemark: null, rejectionReason: null, esignAt: null, completedAt: null, certificateId: null }));
  }

  // 6. APP-10329 · Domicile · changes requested (address proof not readable)
  {
    const submittedAt = sub(4, 2);
    const changesAt = sub(2, 2);
    const remark = 'Address proof is not readable. Upload a clear scan of the full page and resubmit. Your other documents are accepted.';
    const timeline = buildTimeline('APP-10329', {
      submittedAt,
      applicantName: meera.name,
      deptName: DEPT.domicile!.name,
      certLabel: 'Domicile Certificate',
      ai: { at: plus(submittedAt, 3), summary: '1 warning: address proof image is low resolution.', tone: 'warning' },
      queuedAt: plus(submittedAt, 4),
      reviewStart: { at: sub(3, 1), officer: 'Geetha Lakshmi' },
      changes: { at: changesAt, detail: remark, officer: 'Geetha Lakshmi' },
    });
    const specs: DocSpec[] = [
      STD.identity(),
      { requirementId: 'address', fileName: 'address-proof-lowres.jpg', fileSize: 19_400, mimeType: 'image/jpeg', officerDecision: 'flagged', officerRemark: 'Not readable in the scan.' },
      { requirementId: 'residence_proof', fileName: 'ration-card.jpg', fileSize: 1_150_000, mimeType: 'image/jpeg', officerDecision: 'accepted' },
      accepted(STD.photo()),
    ];
    const details = { yearsOfResidence: '12', residingSince: '2014-06-01', parentOrSpouseName: 'Murugesan Krishnan' };
    docs.push(...buildDocuments({ appId: 'APP-10329', certificateType: 'domicile', submittedAt, applicantName: meera.name, applicantDob: meera.dob, applicantAddress: MEERA_ADDR, details, uploadedBy: meera.name, existingFingerprints: [] }, specs, 'doc-10329'));
    apps.push(buildApplication({ id: 'APP-10329', certificateType: 'domicile', departmentId: 'domicile', citizen: meera, details, status: 'changes_requested', submittedAt, deptSlaDays: DEPT.domicile!.slaDays, deliveryRequested: false, timeline, documents: docs.filter((d) => d.applicationId === 'APP-10329'), reviewStartedAt: sub(3, 1), reviewerId: 'usr-officer-domicile-1', officerRemark: remark, rejectionReason: null, esignAt: null, completedAt: null, certificateId: null }));
  }

  // 7. APP-10347 · Caste · approved, e-sign completes shortly (live)
  {
    const submittedAt = sub(2, 4);
    const approvedAt = ago(now, 0, 0, 4);
    const esignAt = new Date(now + 2 * MIN).toISOString();
    const timeline = buildTimeline('APP-10347', {
      submittedAt,
      applicantName: meera.name,
      deptName: DEPT.caste!.name,
      certLabel: 'Caste Certificate',
      ai: { at: plus(submittedAt, 3), summary: 'All 4 documents verified. No warnings.', tone: 'success' },
      queuedAt: plus(submittedAt, 4),
      reviewStart: { at: sub(2, 1), officer: 'Deepa Srinivasan' },
      approved: { at: approvedAt, officer: 'Deepa Srinivasan' },
      esignQueuedAt: plus(approvedAt, 0.5),
    });
    const specs: DocSpec[] = [accepted(STD.identity()), accepted(STD.address()), accepted({ requirementId: 'caste_evidence', fileName: 'caste-evidence-father.pdf', fileSize: 301_000, mimeType: 'application/pdf' }), accepted(STD.photo())];
    const details = { community: 'Demo Community A', category: 'SC', fatherName: 'Murugesan Krishnan' };
    docs.push(...buildDocuments({ appId: 'APP-10347', certificateType: 'caste', submittedAt, applicantName: meera.name, applicantDob: meera.dob, applicantAddress: MEERA_ADDR, details, uploadedBy: meera.name, existingFingerprints: [] }, specs, 'doc-10347'));
    apps.push(buildApplication({ id: 'APP-10347', certificateType: 'caste', departmentId: 'caste', citizen: meera, details, status: 'esign_pending', submittedAt, deptSlaDays: DEPT.caste!.slaDays, deliveryRequested: false, timeline, documents: docs.filter((d) => d.applicationId === 'APP-10347'), reviewStartedAt: sub(2, 1), reviewerId: SAMPLE_CASTE_STAFF_ID, officerRemark: null, rejectionReason: null, esignAt, completedAt: null, certificateId: null }));
  }

  // 8. APP-10388 · Caste · another citizen · AI flagged duplicate and edit indicators
  {
    const submittedAt = sub(1, 5);
    const timeline = buildTimeline('APP-10388', {
      submittedAt,
      applicantName: suresh.name,
      deptName: DEPT.caste!.name,
      certLabel: 'Caste Certificate',
      ai: { at: plus(submittedAt, 3), summary: '2 warnings: a possible duplicate identity file and edit indicators on caste evidence.', tone: 'warning' },
      queuedAt: plus(submittedAt, 4),
    });
    const specs: DocSpec[] = [
      { requirementId: 'identity', fileName: 'voter-id-duplicate-copy.pdf', fileSize: 201_000, mimeType: 'application/pdf' },
      { requirementId: 'address', fileName: 'electricity-bill.pdf', fileSize: 176_000, mimeType: 'application/pdf' },
      { requirementId: 'caste_evidence', fileName: 'caste-certificate-edited.pdf', fileSize: 244_000, mimeType: 'application/pdf' },
      { requirementId: 'photo', fileName: 'passport-photo.jpg', fileSize: 102_000, mimeType: 'image/jpeg' },
    ];
    const details = { community: 'Demo Community B', category: 'OBC', fatherName: 'Selvam Babu' };
    docs.push(...buildDocuments({ appId: 'APP-10388', certificateType: 'caste', submittedAt, applicantName: suresh.name, applicantDob: suresh.dob, applicantAddress: suresh.address, details, uploadedBy: suresh.name, existingFingerprints: [] }, specs, 'doc-10388'));
    apps.push(buildApplication({ id: 'APP-10388', certificateType: 'caste', departmentId: 'caste', citizen: suresh, details, status: 'in_review', submittedAt, deptSlaDays: DEPT.caste!.slaDays, deliveryRequested: false, timeline, documents: docs.filter((d) => d.applicationId === 'APP-10388'), reviewStartedAt: null, reviewerId: null, officerRemark: null, rejectionReason: null, esignAt: null, completedAt: null, certificateId: null }));
  }

  // 9. APP-10415 · Caste · Anjali · clean file waiting for pickup
  {
    const submittedAt = sub(0, 22);
    const timeline = buildTimeline('APP-10415', {
      submittedAt,
      applicantName: anjali.name,
      deptName: DEPT.caste!.name,
      certLabel: 'Caste Certificate',
      ai: { at: plus(submittedAt, 3), summary: 'All 4 documents verified. No warnings.', tone: 'success' },
      queuedAt: plus(submittedAt, 4),
    });
    const specs: DocSpec[] = [STD.identity(), STD.address(), { requirementId: 'caste_evidence', fileName: 'school-transfer-certificate.pdf', fileSize: 258_000, mimeType: 'application/pdf' }, STD.photo()];
    const details = { community: 'Demo Community C', category: 'SEBC', fatherName: 'Ganesh Pillai' };
    docs.push(...buildDocuments({ appId: 'APP-10415', certificateType: 'caste', submittedAt, applicantName: anjali.name, applicantDob: anjali.dob, applicantAddress: anjali.address, details, uploadedBy: anjali.name, existingFingerprints: [] }, specs, 'doc-10415'));
    apps.push(buildApplication({ id: 'APP-10415', certificateType: 'caste', departmentId: 'caste', citizen: anjali, details, status: 'in_review', submittedAt, deptSlaDays: DEPT.caste!.slaDays, deliveryRequested: false, timeline, documents: docs.filter((d) => d.applicationId === 'APP-10415'), reviewStartedAt: null, reviewerId: null, officerRemark: null, rejectionReason: null, esignAt: null, completedAt: null, certificateId: null }));
  }

  // 10. APP-10421 · Income · Ravi · belongs to the Income department (isolation demo for caste officers)
  {
    const submittedAt = sub(0, 15);
    const timeline = buildTimeline('APP-10421', {
      submittedAt,
      applicantName: ravi.name,
      deptName: DEPT.income!.name,
      certLabel: 'Income Certificate',
      ai: { at: plus(submittedAt, 3), summary: 'All 4 documents verified. No warnings.', tone: 'success' },
      queuedAt: plus(submittedAt, 4),
    });
    const specs: DocSpec[] = [
      { requirementId: 'identity', fileName: 'passport-scan.pdf', fileSize: 230_000, mimeType: 'application/pdf' },
      { requirementId: 'address', fileName: 'bank-statement-may.pdf', fileSize: 190_000, mimeType: 'application/pdf' },
      { requirementId: 'income_proof', fileName: 'itr-acknowledgement-2025.pdf', fileSize: 152_000, mimeType: 'application/pdf' },
      { requirementId: 'photo', fileName: 'passport-photo.jpg', fileSize: 99_000, mimeType: 'image/jpeg' },
    ];
    const details = { annualIncome: '412000', incomeSource: 'Self-employed', familyMembers: '3', financialYear: '2025-26' };
    docs.push(...buildDocuments({ appId: 'APP-10421', certificateType: 'income', submittedAt, applicantName: ravi.name, applicantDob: ravi.dob, applicantAddress: ravi.address, details, uploadedBy: ravi.name, existingFingerprints: [] }, specs, 'doc-10421'));
    apps.push(buildApplication({ id: 'APP-10421', certificateType: 'income', departmentId: 'income', citizen: ravi, details, status: 'in_review', submittedAt, deptSlaDays: DEPT.income!.slaDays, deliveryRequested: false, timeline, documents: docs.filter((d) => d.applicationId === 'APP-10421'), reviewStartedAt: null, reviewerId: null, officerRemark: null, rejectionReason: null, esignAt: null, completedAt: null, certificateId: null }));
  }

  return { applications: apps, documents: docs, certificates: certs, deliveries, citizens: [] };
}
