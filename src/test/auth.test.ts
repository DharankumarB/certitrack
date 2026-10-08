import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildSeedData } from '../data/seed';
import { appStore } from '../store/appStore';
import type { AdminUser, OfficerUser } from '../types';
import { homeFor, login, signup } from '../services/authService';
import { approveStaff, firstAdminSetupAvailable, provisionAdministrator, registerStaff, setStaffSuspended, setupFirstAdmin } from '../services/registrationService';
import { canEnterDepartmentWorkspace } from '../services/departmentAccessService';
import { ServiceError } from '../services/api';
import { resetDemoData } from '../services/systemService';
import { AppStore, STORAGE_KEY } from '../store/appStore';
import { DEFAULT_ADMIN_EMAIL, DEFAULT_ADMIN_ID, DEFAULT_ADMIN_PASSWORD } from '../data/mockUsers';

const administrator: AdminUser = {
  id: 'test-admin',
  role: 'super_admin',
  name: 'Test Administrator',
  email: 'admin@example.test',
  mobile: '',
  createdAt: new Date().toISOString(),
  passwordDigest: '',
  active: true,
  lastLoginAt: null,
  accountStatus: 'approved',
  designation: 'Administrator',
  systemAccess: [],
};

const citizenRegistration = {
  name: 'Test Citizen',
  email: 'citizen@example.test',
  mobile: '9876543210',
  password: 'SecurePass!2026',
  confirmPassword: 'SecurePass!2026',
  acceptTerms: true,
};

const staffRegistration = {
  name: 'Test Staff',
  email: 'staff@example.test',
  employeeId: 'STAFF-1001',
  departmentId: 'caste' as const,
  designation: 'Review Officer',
  password: 'SecurePass!2026',
  confirmPassword: 'SecurePass!2026',
  staffReference: '',
};

beforeEach(() => {
  appStore.replace(buildSeedData(Date.now()));
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('local prototype authentication', () => {
  it('signs in with the documented default administrator credential', async () => {
    const admin = await login({
      identifier: DEFAULT_ADMIN_EMAIL,
      password: DEFAULT_ADMIN_PASSWORD,
      remember: false,
      expectedRole: 'super_admin',
    });
    expect(admin.id).toBe(DEFAULT_ADMIN_ID);
    expect(admin.role).toBe('super_admin');
  });

  it('registers citizens with a salted verifier and rejects duplicate accounts', async () => {
    const created = await signup(citizenRegistration);
    expect(created.role).toBe('citizen');
    expect(created.passwordDigest).toMatch(/^pbkdf2\$/);
    await expect(signup(citizenRegistration)).rejects.toMatchObject({ code: 'CONFLICT' });
  });

  it('checks password and portal role during sign-in', async () => {
    await signup(citizenRegistration);
    await expect(login({
      identifier: citizenRegistration.email,
      password: 'WrongPassword!2026',
      remember: false,
      expectedRole: 'citizen',
    })).rejects.toBeInstanceOf(ServiceError);
    await expect(login({
      identifier: citizenRegistration.email,
      password: citizenRegistration.password,
      remember: false,
      expectedRole: 'department_staff',
    })).rejects.toBeInstanceOf(ServiceError);
  });

  it('keeps staff pending until approval, then restricts access to their assigned department', async () => {
    const staff = await registerStaff(staffRegistration);
    expect(staff.accountStatus).toBe('pending_approval');
    expect(canEnterDepartmentWorkspace(staff, 'caste')).toBe(false);
    await expect(login({
      identifier: staff.email,
      password: staffRegistration.password,
      remember: false,
      expectedRole: 'department_staff',
      expectedDepartment: 'caste',
    })).rejects.toMatchObject({ code: 'PENDING_APPROVAL' });

    await approveStaff(administrator, staff.id);
    const approved = appStore.getState().users.find((user) => user.id === staff.id) as OfficerUser;
    expect(canEnterDepartmentWorkspace(approved, 'caste')).toBe(true);
    expect(canEnterDepartmentWorkspace(approved, 'income')).toBe(false);

    await setStaffSuspended(administrator, staff.id, true);
    const suspended = appStore.getState().users.find((user) => user.id === staff.id) as OfficerUser;
    expect(suspended.accountStatus).toBe('suspended');
    expect(canEnterDepartmentWorkspace(suspended, 'caste')).toBe(false);
  });

  it('lets staff sign in through the department-neutral entry and routes by approved assignment', async () => {
    const staff = await registerStaff(staffRegistration);
    await approveStaff(administrator, staff.id);

    const signedIn = await login({
      identifier: staff.email,
      password: staffRegistration.password,
      remember: false,
      expectedRole: 'department_staff',
    });

    expect(signedIn.id).toBe(staff.id);
    expect(homeFor(signedIn)).toBe('/staff/caste/dashboard');
  });

  it('does not allow public first-admin setup when the default admin is seeded', async () => {
    vi.stubEnv('VITE_ADMIN_SETUP_SECRET', 'local-test-secret');
    const input = {
      name: 'Local Administrator',
      email: 'second-admin@example.test',
      setupSecret: 'local-test-secret',
      password: 'SecurePass!2026',
      confirmPassword: 'SecurePass!2026',
    };
    expect(firstAdminSetupAvailable()).toBe(false);
    await expect(setupFirstAdmin(input)).rejects.toMatchObject({ code: 'CONFLICT' });
    const provisioned = await provisionAdministrator(administrator, {
      name: input.name,
      email: input.email,
      password: input.password,
      confirmPassword: input.confirmPassword,
    });
    expect(provisioned.role).toBe('super_admin');
  });

  it('preserves locally registered accounts when fictional sample data is reset', async () => {
    const citizen = await signup(citizenRegistration);
    await resetDemoData(administrator);
    expect(appStore.getState().users.some((user) => user.id === citizen.id)).toBe(true);
    expect(appStore.getState().applications.length).toBeGreaterThan(0);
  });

  it('migrates existing version-two browser data to the default administrator without discarding workflow data', () => {
    class MemoryStorage implements Storage {
      private values = new Map<string, string>();
      get length() { return this.values.size; }
      clear() { this.values.clear(); }
      getItem(key: string) { return this.values.get(key) ?? null; }
      key(index: number) { return [...this.values.keys()][index] ?? null; }
      removeItem(key: string) { this.values.delete(key); }
      setItem(key: string, value: string) { this.values.set(key, value); }
    }

    const storage = new MemoryStorage();
    const legacy = buildSeedData(Date.now());
    legacy.schemaVersion = 2;
    const existingAdmin = legacy.users.find((user) => user.email === DEFAULT_ADMIN_EMAIL)!;
    existingAdmin.passwordDigest = 'old-local-password-verifier';
    const originalApplicationCount = legacy.applications.length;
    storage.setItem(STORAGE_KEY, JSON.stringify(legacy));

    const migrated = new AppStore(storage, () => buildSeedData(Date.now())).getState();
    const admin = migrated.users.find((user) => user.email === DEFAULT_ADMIN_EMAIL);

    expect(migrated.schemaVersion).toBe(3);
    expect(migrated.applications).toHaveLength(originalApplicationCount);
    expect(admin?.id).toBe(existingAdmin.id);
    expect(admin?.id).toBe(DEFAULT_ADMIN_ID);
    expect(admin?.passwordDigest).not.toBe('old-local-password-verifier');
  });
});
