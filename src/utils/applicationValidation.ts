import type { CertificateTypeId, RequirementId, AIValidationResult } from '../types';
import { CERTIFICATE_TYPES } from '../config/certificateTypes';
import { DISTRICTS, DISTRICT_TALUKS, GENDER_OPTIONS } from '../config/geography';
import type { FieldErrors } from './validation';
import { isValidEmail, isValidMobile, validateDob, validateName, validateNumber, validatePastDate } from './validation';

export interface PersonalForm {
  name: string;
  dob: string;
  gender: string;
  mobile: string;
  email: string;
  address: string;
  district: string;
  taluk: string;
  village: string;
}

export const EMPTY_PERSONAL: PersonalForm = { name: '', dob: '', gender: '', mobile: '', email: '', address: '', district: '', taluk: '', village: '' };

export function validatePersonal(form: PersonalForm, now: number = Date.now()): FieldErrors<keyof PersonalForm> {
  const errors: FieldErrors<keyof PersonalForm> = {};
  const nameError = validateName(form.name);
  if (nameError) errors.name = nameError;
  const dobError = validateDob(form.dob, now);
  if (dobError) errors.dob = dobError;
  if (!form.gender) errors.gender = 'Select a gender option.';
  else if (!GENDER_OPTIONS.includes(form.gender)) errors.gender = 'Select a valid option.';
  if (!form.mobile.trim()) errors.mobile = 'Mobile number is required.';
  else if (!isValidMobile(form.mobile)) errors.mobile = 'Enter a 10-digit Indian mobile number starting with 6 to 9.';
  if (!form.email.trim()) errors.email = 'Email is required.';
  else if (!isValidEmail(form.email)) errors.email = 'Enter an email address such as name@example.com.';
  if (form.address.trim().length < 10) errors.address = 'Enter your full address (at least 10 characters).';
  if (!form.district) errors.district = 'Select your district.';
  else if (!DISTRICTS.includes(form.district)) errors.district = 'Select a district from the list.';
  if (!form.taluk) errors.taluk = 'Select your taluk.';
  else if (!(DISTRICT_TALUKS[form.district] ?? []).includes(form.taluk)) errors.taluk = 'Select a taluk for this district.';
  if (!form.village.trim()) errors.village = 'Village or town is required.';
  return errors;
}

export function validateDetails(type: CertificateTypeId, details: Record<string, string>, now: number = Date.now()): FieldErrors<string> {
  const errors: FieldErrors<string> = {};
  for (const field of CERTIFICATE_TYPES[type].fields) {
    const value = details[field.key] ?? '';
    if (field.required && !value.trim()) {
      errors[field.key] = `${field.label} is required.`;
      continue;
    }
    if (!value.trim()) continue;
    if (field.type === 'number') {
      const err = validateNumber(value, field.label, field.min ?? 0, field.max ?? Number.MAX_SAFE_INTEGER);
      if (err) errors[field.key] = err;
    } else if (field.type === 'select') {
      if (field.options && !field.options.includes(value)) errors[field.key] = 'Select a valid option.';
    } else if (field.type === 'date') {
      const err = validatePastDate(value, field.label, now);
      if (err) errors[field.key] = err;
    } else if (field.maxLength && value.length > field.maxLength) {
      errors[field.key] = `Use ${field.maxLength} characters or fewer.`;
    }
  }
  return errors;
}

export interface DocumentCheckInput {
  requirementId: RequirementId;
  ai: AIValidationResult | null;
}

/** Returns human-readable blocking problems for the upload step. Empty array means ready. */
export function documentBlockers(type: CertificateTypeId, docs: DocumentCheckInput[]): string[] {
  const problems: string[] = [];
  for (const req of CERTIFICATE_TYPES[type].requirements) {
    const doc = docs.find((d) => d.requirementId === req);
    const label = req.replace(/_/g, ' ');
    if (!doc) problems.push(`Upload the ${label}.`);
    else if (!doc.ai) problems.push(`The ${label} has not been checked by AI yet.`);
    else if (doc.ai.verdict === 'needs_changes') problems.push(`The ${label} needs changes before you can submit.`);
  }
  return problems;
}
