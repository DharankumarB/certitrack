import type { CertificateTypeId, DepartmentId, RequirementId } from '../types';

/**
 * Certificate type registry. To add a new certificate type:
 *  1. add its id to CertificateTypeId in src/types/index.ts,
 *  2. add a department in data/mockDepartments.ts,
 *  3. add a definition below (documents + fields). Forms, uploads, AI checks,
 *     analytics and locker pick it up automatically.
 */

export interface RequirementDef {
  id: RequirementId;
  label: string;
  expectedType: string;
  hint: string;
}

export interface FieldDef {
  key: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'select';
  required: boolean;
  options?: string[];
  hint?: string;
  min?: number;
  max?: number;
  maxLength?: number;
}

export interface CertificateTypeDef {
  id: CertificateTypeId;
  label: string;
  shortLabel: string;
  departmentId: DepartmentId;
  description: string;
  eligibility: string;
  /** Service standard in calendar days from submission to decision. */
  slaDays: number;
  /** Null means the certificate does not expire. */
  validityMonths: number | null;
  requirements: RequirementId[];
  fields: FieldDef[];
  icon: 'ShieldCheck' | 'Wallet' | 'Home';
}

export const REQUIREMENTS: Record<RequirementId, RequirementDef> = {
  identity: {
    id: 'identity',
    label: 'Government photo ID',
    expectedType: 'Government photo ID',
    hint: 'Full card or page showing photo, name and date of birth.',
  },
  address: {
    id: 'address',
    label: 'Address proof',
    expectedType: 'Address proof',
    hint: 'Utility bill, bank statement or rent agreement from the last 3 months.',
  },
  caste_evidence: {
    id: 'caste_evidence',
    label: 'Caste evidence',
    expectedType: 'Caste evidence',
    hint: 'Existing caste certificate, or school record of the applicant or father.',
  },
  income_proof: {
    id: 'income_proof',
    label: 'Income proof',
    expectedType: 'Income proof',
    hint: 'Salary slip, employer letter or signed income declaration.',
  },
  residence_proof: {
    id: 'residence_proof',
    label: 'Residence proof',
    expectedType: 'Residence proof',
    hint: 'Ration card, school record or property document showing 3+ years of residence.',
  },
  photo: {
    id: 'photo',
    label: 'Passport-size photo',
    expectedType: 'Passport-size photo',
    hint: 'Recent colour photo, plain background, face clearly visible.',
  },
};

export const CASTE_CATEGORIES = ['SC', 'ST', 'OBC', 'SEBC', 'Other backward class'];
export const INCOME_SOURCES = ['Salaried employment', 'Self-employed', 'Agriculture', 'Daily wage', 'Pension', 'Other'];
export const FINANCIAL_YEARS = ['2025-26', '2026-27'];

export const CERTIFICATE_TYPES: Record<CertificateTypeId, CertificateTypeDef> = {
  caste: {
    id: 'caste',
    label: 'Caste Certificate',
    shortLabel: 'Caste',
    departmentId: 'caste',
    description: 'Confirms your community and category for welfare schemes, scholarships and reservations.',
    eligibility: 'Applicants whose community is recorded in state or central lists.',
    slaDays: 7,
    validityMonths: null,
    requirements: ['identity', 'address', 'caste_evidence', 'photo'],
    fields: [
      { key: 'community', label: 'Community / caste name', type: 'text', required: true, maxLength: 80 },
      { key: 'category', label: 'Category', type: 'select', required: true, options: CASTE_CATEGORIES },
      { key: 'fatherName', label: "Father's full name", type: 'text', required: true, maxLength: 80 },
    ],
    icon: 'ShieldCheck',
  },
  income: {
    id: 'income',
    label: 'Income Certificate',
    shortLabel: 'Income',
    departmentId: 'income',
    description: 'Certifies annual family income for fee concessions, subsidies and welfare eligibility.',
    eligibility: 'Any resident who can declare household income for the financial year.',
    slaDays: 5,
    validityMonths: 12,
    requirements: ['identity', 'address', 'income_proof', 'photo'],
    fields: [
      { key: 'annualIncome', label: 'Annual family income (INR)', type: 'number', required: true, min: 0, max: 100000000, hint: 'Total from all household members, last financial year.' },
      { key: 'incomeSource', label: 'Main source of income', type: 'select', required: true, options: INCOME_SOURCES },
      { key: 'familyMembers', label: 'Number of family members', type: 'number', required: true, min: 1, max: 30 },
      { key: 'financialYear', label: 'Financial year', type: 'select', required: true, options: FINANCIAL_YEARS },
    ],
    icon: 'Wallet',
  },
  domicile: {
    id: 'domicile',
    label: 'Domicile Certificate',
    shortLabel: 'Domicile',
    departmentId: 'domicile',
    description: 'Proves where you have lived, for admissions, local jobs and residence-based schemes.',
    eligibility: 'Applicants who have lived in the district for the required period.',
    slaDays: 7,
    validityMonths: null,
    requirements: ['identity', 'address', 'residence_proof', 'photo'],
    fields: [
      { key: 'yearsOfResidence', label: 'Years of continuous residence', type: 'number', required: true, min: 1, max: 100 },
      { key: 'residingSince', label: 'Residing here since', type: 'date', required: true },
      { key: 'parentOrSpouseName', label: "Father's or spouse's full name", type: 'text', required: true, maxLength: 80 },
    ],
    icon: 'Home',
  },
};

export const CERTIFICATE_TYPE_LIST: CertificateTypeDef[] = Object.values(CERTIFICATE_TYPES);

export function getCertificateType(id: string): CertificateTypeDef | undefined {
  return (CERTIFICATE_TYPES as Record<string, CertificateTypeDef | undefined>)[id];
}
