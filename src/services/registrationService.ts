import type { AdminUser, DepartmentId, OfficerUser, User } from '../types';
import { appStore } from '../store/appStore';
import { addAudit, updateUser } from '../store/mutations';
import { normalizeRole, isAdmin } from './access';
import { actorOf } from './actors';
import { ServiceError, nowIso, simulateLatency } from './api';
import { digestPassword } from '../utils/digest';
import { isValidEmail, validateName, validatePassword } from '../utils/validation';
import type { FieldErrors } from '../utils/validation';
import { randomCode } from '../utils/random';

export interface StaffRegistrationInput {
  name: string;
  email: string;
  employeeId: string;
  departmentId: DepartmentId;
  designation: string;
  password: string;
  confirmPassword: string;
  staffReference: string;
}

export async function registerStaff(input: StaffRegistrationInput): Promise<OfficerUser> {
  await simulateLatency();
  const errors: FieldErrors<keyof StaffRegistrationInput> = {};
  if (validateName(input.name)) errors.name = validateName(input.name);
  if (!isValidEmail(input.email)) errors.email = 'Enter a valid official email address.';
  if (!input.employeeId.trim()) errors.employeeId = 'Employee ID is required.';
  if (!input.designation.trim()) errors.designation = 'Designation is required.';
  if (!appStore.getState().departments.some((department) => department.id === input.departmentId)) errors.departmentId = 'Choose a valid department.';
  const passwordError = validatePassword(input.password);
  if (passwordError) errors.password = passwordError;
  if (input.password !== input.confirmPassword) errors.confirmPassword = 'Passwords do not match.';
  if (Object.keys(errors).length) throw new ServiceError('VALIDATION', 'Check the highlighted fields.', errors);

  const state = appStore.getState();
  const email = input.email.trim().toLowerCase();
  const employeeId = input.employeeId.trim().toUpperCase();
  if (state.users.some((user) => user.email.toLowerCase() === email)) throw new ServiceError('CONFLICT', 'That email is already registered.', { email: 'Email already in use.' });
  if (state.users.some((user) => 'employeeId' in user && user.employeeId.toLowerCase() === employeeId.toLowerCase())) throw new ServiceError('CONFLICT', 'That employee ID is already registered.', { employeeId: 'Employee ID already in use.' });

  let passwordDigest: string;
  try {
    passwordDigest = await digestPassword(input.password);
  } catch {
    throw new ServiceError('SECURE_CONTEXT_REQUIRED', 'Registration needs HTTPS or localhost.');
  }
  const at = nowIso();
  const user: OfficerUser = {
    id: `usr-staff-${randomCode(10).toLowerCase()}`,
    role: 'department_staff',
    name: input.name.trim(),
    email,
    mobile: '',
    createdAt: at,
    passwordDigest,
    active: false,
    lastLoginAt: null,
    accountStatus: 'pending_approval',
    approvalAt: null,
    approvedBy: null,
    rejectionReason: null,
    employeeId,
    departmentId: input.departmentId,
    designation: input.designation.trim(),
    staffReference: input.staffReference.trim() || undefined,
  };
  appStore.commit((current) => {
    const next = { ...current, users: [...current.users, user], counters: { ...current.counters, user: current.counters.user + 1 } };
    return addAudit(next, actorOf(user), at, { action: 'staff_registration_submitted', departmentId: user.departmentId, detail: 'Staff registration awaiting administrator approval' });
  });
  return user;
}

export interface FirstAdminInput {
  name: string;
  email: string;
  setupSecret: string;
  password: string;
  confirmPassword: string;
}

export function firstAdminSetupAvailable(): boolean {
  return !appStore.getState().users.some((user) => normalizeRole(user.role) === 'super_admin');
}

export async function setupFirstAdmin(input: FirstAdminInput): Promise<AdminUser> {
  await simulateLatency();
  const errors: FieldErrors<keyof FirstAdminInput> = {};
  const nameError = validateName(input.name);
  if (nameError) errors.name = nameError;
  if (!isValidEmail(input.email)) errors.email = 'Enter a valid email address.';
  if (!input.setupSecret) errors.setupSecret = 'Enter the local development setup secret.';
  const passwordError = validatePassword(input.password);
  if (passwordError) errors.password = passwordError;
  if (input.password !== input.confirmPassword) errors.confirmPassword = 'Passwords do not match.';
  if (Object.keys(errors).length) throw new ServiceError('VALIDATION', 'Check the highlighted fields.', errors);

  const configuredSecret = import.meta.env.VITE_ADMIN_SETUP_SECRET;
  if (!configuredSecret || input.setupSecret !== configuredSecret) throw new ServiceError('FORBIDDEN', 'The administrator setup secret is invalid or is not configured for local development.');
  if (!firstAdminSetupAvailable()) throw new ServiceError('CONFLICT', 'An administrator already exists. Additional administrator access must be provisioned from the protected staff-management page.');

  const email = input.email.trim().toLowerCase();
  if (appStore.getState().users.some((user) => user.email.toLowerCase() === email)) throw new ServiceError('CONFLICT', 'That email is already registered.', { email: 'Email already in use.' });
  let passwordDigest: string;
  try {
    passwordDigest = await digestPassword(input.password);
  } catch {
    throw new ServiceError('SECURE_CONTEXT_REQUIRED', 'Administrator setup needs HTTPS or localhost.');
  }
  const at = nowIso();
  const user: AdminUser = {
    id: `usr-admin-${randomCode(10).toLowerCase()}`,
    role: 'super_admin',
    name: input.name.trim(),
    email,
    mobile: '',
    createdAt: at,
    passwordDigest,
    active: true,
    lastLoginAt: at,
    accountStatus: 'approved',
    approvalAt: at,
    approvedBy: null,
    designation: 'Local Development Administrator',
    systemAccess: ['Prototype administration'],
  };
  appStore.commit((current) => {
    const next = { ...current, users: [...current.users, user], counters: { ...current.counters, user: current.counters.user + 1 } };
    return addAudit(next, actorOf(user), at, { action: 'first_admin_setup', detail: 'First local-development administrator provisioned' });
  });
  return user;
}

export interface ProvisionAdminInput {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export async function provisionAdministrator(actor: User, input: ProvisionAdminInput): Promise<AdminUser> {
  if (!isAdmin(actor)) throw new ServiceError('FORBIDDEN', 'Only an administrator can provision another administrator.');
  await simulateLatency();
  const errors: FieldErrors<keyof ProvisionAdminInput> = {};
  const nameError = validateName(input.name);
  if (nameError) errors.name = nameError;
  if (!isValidEmail(input.email)) errors.email = 'Enter a valid email address.';
  const passwordError = validatePassword(input.password);
  if (passwordError) errors.password = passwordError;
  if (input.confirmPassword !== input.password) errors.confirmPassword = 'Passwords do not match.';
  if (Object.keys(errors).length) throw new ServiceError('VALIDATION', 'Check the highlighted fields.', errors);
  const email = input.email.trim().toLowerCase();
  if (appStore.getState().users.some((user) => user.email.toLowerCase() === email)) throw new ServiceError('CONFLICT', 'That email is already registered.', { email: 'Email already in use.' });
  const passwordDigest = await digestPassword(input.password);
  const at = nowIso();
  const user: AdminUser = {
    id: `usr-admin-${randomCode(10).toLowerCase()}`,
    role: 'super_admin',
    name: input.name.trim(),
    email,
    mobile: '',
    createdAt: at,
    passwordDigest,
    active: true,
    lastLoginAt: null,
    accountStatus: 'approved',
    approvalAt: at,
    approvedBy: actor.id,
    designation: 'Administrator',
    systemAccess: ['Prototype administration'],
  };
  appStore.commit((state) => {
    const next = { ...state, users: [...state.users, user], counters: { ...state.counters, user: state.counters.user + 1 } };
    return addAudit(next, actorOf(actor), at, { action: 'administrator_provisioned', detail: `Provisioned administrator ${user.email}` });
  });
  return user;
}

function requireAdmin(actor: User): void {
  if (!isAdmin(actor)) throw new ServiceError('FORBIDDEN', 'Only an administrator can manage staff accounts.');
}

export async function approveStaff(actor: User, userId: string): Promise<void> {
  requireAdmin(actor);
  const target = appStore.getState().users.find((user) => user.id === userId);
  if (!target || !('employeeId' in target)) throw new ServiceError('NOT_FOUND', 'Staff registration not found.');
  if (target.id === actor.id) throw new ServiceError('FORBIDDEN', 'You cannot approve your own registration.');
  if (target.accountStatus !== 'pending_approval') throw new ServiceError('CONFLICT', 'This staff request is no longer pending.');
  const at = nowIso();
  appStore.commit((state) => {
    const next = updateUser(state, target.id, (user) => ({ ...user, active: true, accountStatus: 'approved', approvalAt: at, approvedBy: actor.id, rejectionReason: null }));
    return addAudit(next, actorOf(actor), at, { action: 'staff_registration_approved', departmentId: target.departmentId, detail: `Approved ${target.employeeId}` });
  });
}

export async function rejectStaff(actor: User, userId: string, reason: string): Promise<void> {
  requireAdmin(actor);
  const target = appStore.getState().users.find((user) => user.id === userId);
  if (!target || !('employeeId' in target)) throw new ServiceError('NOT_FOUND', 'Staff registration not found.');
  if (target.id === actor.id) throw new ServiceError('FORBIDDEN', 'You cannot reject your own registration.');
  if (target.accountStatus !== 'pending_approval') throw new ServiceError('CONFLICT', 'This staff request is no longer pending.');
  if (reason.trim().length < 10) throw new ServiceError('VALIDATION', 'Provide a rejection reason of at least 10 characters.', { reason: 'Enter at least 10 characters.' });
  const at = nowIso();
  appStore.commit((state) => {
    const next = updateUser(state, target.id, (user) => ({ ...user, active: false, accountStatus: 'rejected', rejectionReason: reason.trim(), approvalAt: null, approvedBy: actor.id }));
    return addAudit(next, actorOf(actor), at, { action: 'staff_registration_rejected', departmentId: target.departmentId, detail: `Rejected ${target.employeeId}: ${reason.trim()}` });
  });
}

export async function setStaffSuspended(actor: User, userId: string, suspended: boolean): Promise<void> {
  requireAdmin(actor);
  const target = appStore.getState().users.find((user) => user.id === userId);
  if (!target || !('employeeId' in target)) throw new ServiceError('NOT_FOUND', 'Staff account not found.');
  if (target.id === actor.id) throw new ServiceError('FORBIDDEN', 'You cannot suspend your own account.');
  if (target.accountStatus === 'pending_approval' || target.accountStatus === 'rejected') throw new ServiceError('CONFLICT', 'Only approved staff accounts can be suspended or reactivated.');
  const at = nowIso();
  appStore.commit((state) => {
    const next = updateUser(state, target.id, (user) => ({
      ...user,
      active: !suspended,
      accountStatus: suspended ? 'suspended' : 'approved',
    }));
    return addAudit(next, actorOf(actor), at, { action: suspended ? 'staff_suspended' : 'staff_reactivated', departmentId: target.departmentId, detail: `${suspended ? 'Suspended' : 'Reactivated'} ${target.employeeId}` });
  });
}

export function staffAccounts(): OfficerUser[] {
  return appStore.getState().users.filter((user): user is OfficerUser => 'employeeId' in user);
}
