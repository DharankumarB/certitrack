import type { CitizenUser, DepartmentId, User, UserRole } from '../types';
import { appStore } from '../store/appStore';
import { addAudit, updateUser } from '../store/mutations';
import { digestPassword, verifyPassword } from '../utils/digest';
import { normalizeMobile, isValidEmail, isValidMobile, validateName, validatePassword } from '../utils/validation';
import type { FieldErrors } from '../utils/validation';
import { ServiceError, nowIso, simulateLatency } from './api';
import { actorOf, PUBLIC_ACTOR } from './actors';
import { clearSession, readSession, writeSession } from './session';
import { ROLE_HOME } from '../config/navigation';
import { normalizeRole } from './access';
import { randomCode } from '../utils/random';

export function findUserByIdentifier(identifier: string): User | undefined {
  const raw = identifier.trim().toLowerCase();
  const digits = normalizeMobile(identifier);
  return appStore.getState().users.find((user) =>
    user.email.toLowerCase() === raw ||
    (digits.length === 10 && normalizeMobile(user.mobile) === digits) ||
    ('employeeId' in user && user.employeeId.toLowerCase() === raw),
  );
}

export function getCurrentUser(): User | null {
  const session = readSession();
  if (!session) return null;
  const user = appStore.getState().users.find((candidate) => candidate.id === session.userId);
  if (!user || !user.active || user.accountStatus === 'pending_approval' || user.accountStatus === 'rejected' || user.accountStatus === 'suspended') {
    clearSession();
    return null;
  }
  return user;
}

function startSession(user: User, remember: boolean): void {
  writeSession({ userId: user.id, role: normalizeRole(user.role) as UserRole, remember, startedAt: nowIso() });
}

function recordLogin(user: User, detail: string): void {
  const at = nowIso();
  appStore.commit((state) => {
    const next = updateUser(state, user.id, (current) => ({ ...current, lastLoginAt: at }));
    return addAudit(next, actorOf(user), at, { action: 'login', detail });
  });
}

function rejectSignIn(detail: string): never {
  appStore.commit((state) => addAudit(state, PUBLIC_ACTOR, nowIso(), { action: 'login_failed', result: 'failed', detail }));
  throw new ServiceError('INVALID_CREDENTIALS', 'The email, mobile number or password is incorrect.');
}

export interface LoginInput {
  identifier: string;
  password: string;
  remember: boolean;
  expectedRole?: 'citizen' | 'department_staff' | 'super_admin';
  expectedDepartment?: DepartmentId;
}

export async function login(input: LoginInput): Promise<User> {
  await simulateLatency();
  const errors: FieldErrors<'identifier' | 'password'> = {};
  if (!input.identifier.trim()) errors.identifier = 'Enter your registered email, mobile number, or employee ID.';
  if (!input.password) errors.password = 'Enter your password.';
  if (Object.keys(errors).length) throw new ServiceError('VALIDATION', 'Check the highlighted fields.', errors);

  const user = findUserByIdentifier(input.identifier);
  if (!user || !user.passwordDigest) rejectSignIn('Unknown account');
  let validPassword = false;
  try {
    validPassword = await verifyPassword(input.password, user.passwordDigest);
  } catch {
    throw new ServiceError('SECURE_CONTEXT_REQUIRED', 'Local sign-in needs HTTPS or localhost.');
  }
  if (!validPassword) rejectSignIn('Incorrect password for a registered account');

  const role = normalizeRole(user.role);
  if (input.expectedRole && role !== input.expectedRole) rejectSignIn('Account attempted sign-in through the wrong role portal');
  if (input.expectedDepartment && (!('departmentId' in user) || user.departmentId !== input.expectedDepartment)) {
    rejectSignIn('Staff account attempted sign-in through another department portal');
  }
  if (user.accountStatus === 'pending_approval') throw new ServiceError('PENDING_APPROVAL', 'Your staff registration is awaiting administrator approval.');
  if (user.accountStatus === 'rejected') throw new ServiceError('FORBIDDEN', `Staff access is unavailable. ${user.rejectionReason ?? 'Contact your administrator.'}`);
  if (user.accountStatus === 'suspended' || !user.active) throw new ServiceError('FORBIDDEN', 'This account is disabled. Contact your administrator.');

  recordLogin(user, 'Local-development sign-in');
  startSession(user, input.remember);
  return appStore.getState().users.find((candidate) => candidate.id === user.id) ?? user;
}

export interface SignupInput {
  name: string;
  email: string;
  mobile: string;
  password: string;
  confirmPassword: string;
  acceptTerms: boolean;
}

export async function signup(input: SignupInput): Promise<User> {
  await simulateLatency();
  const errors: FieldErrors<keyof SignupInput> = {};
  const set = (key: keyof SignupInput, message: string | undefined) => {
    if (message) errors[key] = message;
  };
  set('name', validateName(input.name));
  set('email', isValidEmail(input.email) ? undefined : 'Enter a valid email address.');
  set('mobile', isValidMobile(input.mobile) ? undefined : 'Enter a 10-digit Indian mobile number starting with 6 to 9.');
  set('password', validatePassword(input.password));
  if (input.confirmPassword !== input.password) set('confirmPassword', 'Passwords do not match.');
  if (!input.acceptTerms) set('acceptTerms', 'Accept the terms and privacy acknowledgement to continue.');
  if (Object.keys(errors).length) throw new ServiceError('VALIDATION', 'Check the highlighted fields.', errors);

  const state = appStore.getState();
  const email = input.email.trim().toLowerCase();
  const mobile = normalizeMobile(input.mobile);
  if (state.users.some((user) => user.email.toLowerCase() === email)) {
    throw new ServiceError('CONFLICT', 'An account with this email already exists.', { email: 'This email is already registered.' });
  }
  if (state.users.some((user) => normalizeMobile(user.mobile) === mobile)) {
    throw new ServiceError('CONFLICT', 'An account with this mobile number already exists.', { mobile: 'This mobile number is already registered.' });
  }
  let passwordDigest: string;
  try {
    passwordDigest = await digestPassword(input.password);
  } catch {
    throw new ServiceError('SECURE_CONTEXT_REQUIRED', 'Account creation needs HTTPS or localhost.');
  }

  const at = nowIso();
  const user: CitizenUser = {
    id: `usr-cit-${randomCode(8).toLowerCase()}`,
    role: 'citizen',
    name: input.name.trim(),
    email,
    mobile,
    createdAt: at,
    passwordDigest,
    active: true,
    lastLoginAt: at,
    accountStatus: 'approved',
    dateOfBirth: '',
    gender: '',
    address: '',
    district: '',
    taluk: '',
    village: '',
    language: 'en',
    notificationPrefs: { whatsapp: true, email: true },
  };
  appStore.commit((current) => {
    const next = { ...current, users: [...current.users, user], counters: { ...current.counters, user: current.counters.user + 1 } };
    return addAudit(next, actorOf(user), at, { action: 'signup', detail: 'Local-development citizen registration' });
  });
  startSession(user, false);
  return user;
}

export async function requestPasswordReset(email: string): Promise<void> {
  await simulateLatency(220);
  if (!isValidEmail(email)) throw new ServiceError('VALIDATION', 'Enter a valid email address.', { email: 'Enter a valid email address.' });
  const user = findUserByIdentifier(email);
  appStore.commit((state) => addAudit(state, PUBLIC_ACTOR, nowIso(), { action: 'password_reset_requested', detail: user ? 'Local development reset requested' : 'Reset requested for an unregistered address' }));
}

export async function logout(user: User | null): Promise<void> {
  if (user) {
    const at = nowIso();
    appStore.commit((state) => addAudit(state, actorOf(user), at, { action: 'logout', detail: 'Local-development session ended' }));
  }
  clearSession();
}

export function homeFor(user: User): string {
  if ('departmentId' in user) return `/staff/${user.departmentId}/dashboard`;
  return ROLE_HOME[normalizeRole(user.role)];
}
