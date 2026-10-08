import type { CitizenUser, User } from '../types';
import { appStore } from '../store/appStore';
import { addAudit, updateUser } from '../store/mutations';
import { DEMO_ACCOUNTS } from '../config/demo';
import { digestPassword, verifyPassword } from '../utils/digest';
import { normalizeMobile, isValidEmail, isValidMobile, validateDob, validateName, validatePassword } from '../utils/validation';
import type { FieldErrors } from '../utils/validation';
import { ServiceError, nowIso, simulateLatency } from './api';
import { actorOf, PUBLIC_ACTOR } from './actors';
import { clearSession, readSession, writeSession } from './session';
import { DISTRICTS, DISTRICT_TALUKS, GENDER_OPTIONS } from '../config/geography';
import type { UserRole } from '../types';
import { ROLE_HOME } from '../config/navigation';
import { randomCode } from '../utils/random';

export function findUserByIdentifier(identifier: string): User | undefined {
  const raw = identifier.trim().toLowerCase();
  const digits = normalizeMobile(identifier);
  return appStore.getState().users.find((u) => u.email.toLowerCase() === raw || (digits.length === 10 && normalizeMobile(u.mobile) === digits));
}

/** The current signed-in user (synchronous). Returns null when signed out or the account no longer exists. */
export function getCurrentUser(): User | null {
  const session = readSession();
  if (!session) return null;
  const user = appStore.getState().users.find((u) => u.id === session.userId);
  if (!user || !user.active) {
    clearSession();
    return null;
  }
  return user;
}

function startSession(user: User, remember: boolean): void {
  writeSession({ userId: user.id, role: user.role as UserRole, remember, startedAt: nowIso() });
}

function recordLogin(user: User, detail: string): void {
  const at = nowIso();
  appStore.commit((s) => {
    const next = updateUser(s, user.id, (u) => ({ ...u, lastLoginAt: at }));
    return addAudit(next, actorOf(user), at, { action: 'login', detail });
  });
}

function rejectSignIn(detail: string): never {
  appStore.commit((s) => addAudit(s, PUBLIC_ACTOR, nowIso(), { action: 'login_failed', result: 'failed', detail }));
  throw new ServiceError('INVALID_CREDENTIALS', 'The email, mobile number or password is incorrect.');
}

export interface LoginInput {
  identifier: string;
  password: string;
  remember: boolean;
}

export async function login(input: LoginInput): Promise<User> {
  await simulateLatency();
  const errors: FieldErrors<'identifier' | 'password'> = {};
  if (!input.identifier.trim()) errors.identifier = 'Enter your email or mobile number.';
  if (!input.password) errors.password = 'Enter your password.';
  if (Object.keys(errors).length > 0) throw new ServiceError('VALIDATION', 'Check the highlighted fields.', errors);

  const user = findUserByIdentifier(input.identifier);
  if (!user) rejectSignIn('Unknown account');
  if (!user.active) throw new ServiceError('FORBIDDEN', 'This account is disabled. Contact your department administrator.');
  let ok = false;
  try {
    ok = await verifyPassword(input.password, user.passwordDigest);
  } catch {
    throw new ServiceError('SECURE_CONTEXT_REQUIRED', 'Password sign-in needs HTTPS or localhost. Use a demo sign-in button instead.');
  }
  if (!ok) rejectSignIn('Incorrect password for a known account');
  recordLogin(user, 'Signed in');
  startSession(user, input.remember);
  return appStore.getState().users.find((u) => u.id === user.id) ?? user;
}

/** One-click demo sign-in for the three prototype roles. No password is checked. */
export async function loginAsDemo(role: UserRole, remember = false): Promise<User> {
  await simulateLatency(120);
  const account = DEMO_ACCOUNTS.find((a) => a.role === role);
  const user = account ? appStore.getState().users.find((u) => u.id === account.userId) : undefined;
  if (!user) throw new ServiceError('NOT_FOUND', 'The demo account is not available. Reset demo data from Settings.');
  recordLogin(user, 'Demo sign-in (prototype account)');
  startSession(user, remember);
  return appStore.getState().users.find((u) => u.id === user.id) ?? user;
}

export interface SignupInput {
  name: string;
  email: string;
  mobile: string;
  dob: string;
  gender: string;
  password: string;
  confirmPassword: string;
  address: string;
  district: string;
  taluk: string;
  village: string;
  acceptTerms: boolean;
}

export async function signup(input: SignupInput): Promise<User> {
  await simulateLatency();
  const errors: FieldErrors<keyof SignupInput> = {};
  const set = (key: keyof SignupInput, message: string | undefined) => {
    if (message) errors[key] = message;
  };
  set('name', validateName(input.name));
  set('email', isValidEmail(input.email) ? undefined : 'Enter an email address such as name@example.com.');
  set('mobile', isValidMobile(input.mobile) ? undefined : 'Enter a 10-digit Indian mobile number starting with 6 to 9.');
  set('dob', validateDob(input.dob));
  if (!GENDER_OPTIONS.includes(input.gender)) set('gender', 'Select a gender option.');
  set('password', validatePassword(input.password));
  if (input.confirmPassword !== input.password) set('confirmPassword', 'Passwords do not match.');
  if (input.address.trim().length < 10) set('address', 'Enter your full address (at least 10 characters).');
  if (!DISTRICTS.includes(input.district)) set('district', 'Select your district.');
  if (!(DISTRICT_TALUKS[input.district] ?? []).includes(input.taluk)) set('taluk', 'Select a taluk for this district.');
  if (!input.village.trim()) set('village', 'Village or town is required.');
  if (!input.acceptTerms) set('acceptTerms', 'Accept the prototype terms to continue.');
  if (Object.keys(errors).length > 0) throw new ServiceError('VALIDATION', 'Check the highlighted fields.', errors as Record<string, string>);

  const state = appStore.getState();
  const email = input.email.trim().toLowerCase();
  const digits = normalizeMobile(input.mobile);
  if (state.users.some((u) => u.email.toLowerCase() === email)) {
    throw new ServiceError('CONFLICT', 'An account with this email already exists. Sign in instead.', { email: 'This email is already registered.' });
  }
  if (state.users.some((u) => normalizeMobile(u.mobile) === digits)) {
    throw new ServiceError('CONFLICT', 'An account with this mobile number already exists.', { mobile: 'This mobile number is already registered.' });
  }
  let digest: string;
  try {
    digest = await digestPassword(input.password);
  } catch {
    throw new ServiceError('SECURE_CONTEXT_REQUIRED', 'Creating an account needs HTTPS or localhost in this prototype.');
  }
  const at = nowIso();
  const user: CitizenUser = {
    id: `usr-cit-${randomCode(8).toLowerCase()}`,
    role: 'citizen',
    name: input.name.trim(),
    email,
    mobile: digits,
    createdAt: at,
    passwordDigest: digest,
    active: true,
    lastLoginAt: at,
    dateOfBirth: input.dob,
    gender: input.gender,
    address: input.address.trim(),
    district: input.district,
    taluk: input.taluk,
    village: input.village.trim(),
    language: 'en',
    notificationPrefs: { whatsapp: true, email: true },
  };
  appStore.commit((s) => {
    const withUser = { ...s, users: [...s.users, user], counters: { ...s.counters, user: s.counters.user + 1 } };
    return addAudit(withUser, actorOf(user), at, { action: 'signup', detail: 'Citizen account created (prototype)' });
  });
  startSession(user, false);
  return user;
}

export async function requestPasswordReset(email: string): Promise<void> {
  await simulateLatency(220);
  if (!isValidEmail(email)) throw new ServiceError('VALIDATION', 'Enter a valid email address.', { email: 'Enter an email address such as name@example.com.' });
  const user = findUserByIdentifier(email);
  appStore.commit((s) => addAudit(s, PUBLIC_ACTOR, nowIso(), { action: 'password_reset_requested', detail: user ? 'Reset requested for a registered account' : 'Reset requested for an unregistered address' }));
}

export async function logout(user: User | null): Promise<void> {
  if (user) {
    const at = nowIso();
    appStore.commit((s) => addAudit(s, actorOf(user), at, { action: 'logout', detail: 'Signed out' }));
  }
  clearSession();
}

export function homeFor(user: User): string {
  return ROLE_HOME[user.role];
}

