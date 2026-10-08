import type { CitizenUser, LanguageCode, NotificationPreferences, User } from '../types';
import { appStore } from '../store/appStore';
import { addAudit, updateUser } from '../store/mutations';
import { digestPassword, verifyPassword } from '../utils/digest';
import { isValidEmail, isValidMobile, normalizeMobile, validateName, validatePassword } from '../utils/validation';
import type { FieldErrors } from '../utils/validation';
import { DISTRICTS, DISTRICT_TALUKS, GENDER_OPTIONS } from '../config/geography';
import { ServiceError, nowIso, simulateLatency } from './api';
import { actorOf } from './actors';
import { isCitizen } from './access';

export interface ProfilePatch {
  name: string;
  email: string;
  mobile: string;
  address: string;
  district: string;
  taluk: string;
  village: string;
  gender: string;
  dob: string;
  language: LanguageCode;
}

export async function updateProfile(user: User, patch: ProfilePatch): Promise<User> {
  await simulateLatency();
  const errors: FieldErrors<keyof ProfilePatch> = {};
  const nameError = validateName(patch.name);
  if (nameError) errors.name = nameError;
  if (!isValidEmail(patch.email)) errors.email = 'Enter a valid email address.';
  if (!isValidMobile(patch.mobile)) errors.mobile = 'Enter a 10-digit Indian mobile number starting with 6 to 9.';
  if (patch.address.trim().length < 10) errors.address = 'Enter your full address (at least 10 characters).';
  if (!DISTRICTS.includes(patch.district)) errors.district = 'Select a district from the list.';
  if (!(DISTRICT_TALUKS[patch.district] ?? []).includes(patch.taluk)) errors.taluk = 'Select a taluk for this district.';
  if (!patch.village.trim()) errors.village = 'Village or town is required.';
  if (isCitizen(user) && !GENDER_OPTIONS.includes(patch.gender)) errors.gender = 'Select a gender option.';
  if (Object.keys(errors).length > 0) throw new ServiceError('VALIDATION', 'Check the highlighted fields.', errors);

  const email = patch.email.trim().toLowerCase();
  const digits = normalizeMobile(patch.mobile);
  const state = appStore.getState();
  if (state.users.some((u) => u.id !== user.id && u.email.toLowerCase() === email)) {
    throw new ServiceError('CONFLICT', 'That email is already used by another account.', { email: 'Already in use.' });
  }
  const at = nowIso();
  appStore.commit((s) => {
    const next = updateUser(s, user.id, (u) => {
      const base = { ...u, name: patch.name.trim(), email, mobile: digits };
      if (u.role === 'citizen') {
        return { ...base, address: patch.address.trim(), district: patch.district, taluk: patch.taluk, village: patch.village.trim(), gender: patch.gender, dateOfBirth: patch.dob || u.dateOfBirth, language: patch.language } as CitizenUser;
      }
      return base as User;
    });
    return addAudit(next, actorOf(user), at, { action: 'profile_updated', detail: 'Contact and address details updated' });
  });
  return appStore.getState().users.find((u) => u.id === user.id) ?? user;
}

export async function updateNotificationPreferences(user: User, prefs: NotificationPreferences): Promise<void> {
  await simulateLatency(120);
  if (!isCitizen(user)) throw new ServiceError('FORBIDDEN', 'Only citizens manage these channels.');
  const at = nowIso();
  appStore.commit((s) => {
    const next = updateUser(s, user.id, (u) => ({ ...(u as CitizenUser), notificationPrefs: prefs }));
    return addAudit(next, actorOf(user), at, { action: 'preferences_updated', detail: `WhatsApp ${prefs.whatsapp ? 'on' : 'off'}, e-mail ${prefs.email ? 'on' : 'off'}` });
  });
}

export async function changePassword(user: User, current: string, next: string, confirm: string): Promise<void> {
  await simulateLatency();
  const errors: FieldErrors<'current' | 'next' | 'confirm'> = {};
  if (!current) errors.current = 'Enter your current password.';
  const pwError = validatePassword(next);
  if (pwError) errors.next = pwError;
  if (next !== confirm) errors.confirm = 'Passwords do not match.';
  if (Object.keys(errors).length > 0) throw new ServiceError('VALIDATION', 'Check the highlighted fields.', errors);
  let ok = false;
  try {
    ok = await verifyPassword(current, user.passwordDigest);
  } catch {
    throw new ServiceError('SECURE_CONTEXT_REQUIRED', 'Changing a password needs HTTPS or localhost in this prototype.');
  }
  if (!ok) throw new ServiceError('VALIDATION', 'The current password is incorrect.', { current: 'Incorrect password.' });
  const digest = await digestPassword(next);
  const at = nowIso();
  appStore.commit((s) => {
    const updated = updateUser(s, user.id, (u) => ({ ...u, passwordDigest: digest }));
    return addAudit(updated, actorOf(user), at, { action: 'profile_updated', detail: 'Password changed' });
  });
}

export function sameDigits(a: string, b: string): boolean {
  return normalizeMobile(a) === normalizeMobile(b);
}
