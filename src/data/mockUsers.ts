import type { AdminUser, CitizenUser, OfficerUser, User } from '../types';
import { ago } from './factories';

/** Fictional IDs used only to build sample workflow events. */
export const SAMPLE_CITIZEN_ID = 'usr-sample-citizen';
export const SAMPLE_CASTE_STAFF_ID = 'usr-sample-staff-caste';
export const DEFAULT_ADMIN_ID = 'usr-admin-local-demo';
export const DEFAULT_ADMIN_EMAIL = 'admin@gmail.com';
export const DEFAULT_ADMIN_PASSWORD = 'admin@123';

/** Shared, intentionally weak prototype credential. Never use outside local demonstration. */
export const DEFAULT_ADMIN_PASSWORD_DIGEST =
  'pbkdf2$120000$a34d719c52eb8601f0a47d3b8c51e629$158f3d90ddc3f77c6a03dd3f2b4b99942ac6e69de446a72f031cfbbc8bd92890';

export function mockUsers(now: number): User[] {
  const admin: AdminUser = {
    id: DEFAULT_ADMIN_ID,
    role: 'super_admin',
    name: 'DK',
    email: DEFAULT_ADMIN_EMAIL,
    mobile: '',
    createdAt: new Date(now).toISOString(),
    passwordDigest: DEFAULT_ADMIN_PASSWORD_DIGEST,
    active: true,
    lastLoginAt: null,
    accountStatus: 'approved',
    designation: 'Local Demo Administrator',
    systemAccess: ['Prototype administration'],
  };

  const staff: OfficerUser[] = [
    officer('usr-officer-caste-2', 'Karthika Raman', 'CT-OFF-1017', 'caste', 'Verification Officer, Grade I', 9100000011, now),
    officer('usr-officer-caste-3', 'Vijay Anand', 'CT-OFF-1020', 'caste', 'Verification Officer, Grade II', 9100000012, now),
    officer('usr-officer-income-1', 'Sathish Kumar', 'CT-OFF-2011', 'income', 'Income Assessor', 9100000021, now),
    officer('usr-officer-income-2', 'Priyanka Sen', 'CT-OFF-2013', 'income', 'Income Assessor', 9100000022, now),
    officer('usr-officer-income-3', 'Mohan Das', 'CT-OFF-2020', 'income', 'Senior Assessor', 9100000023, now),
    officer('usr-officer-domicile-1', 'Geetha Lakshmi', 'CT-OFF-3008', 'domicile', 'Revenue Inspector', 9100000031, now),
    officer('usr-officer-domicile-2', 'Ramesh Babu', 'CT-OFF-3012', 'domicile', 'Revenue Inspector', 9100000032, now),
    officer('usr-officer-domicile-3', 'Nisha Thomas', 'CT-OFF-3019', 'domicile', 'Senior Revenue Inspector', 9100000033, now),
  ];

  return [...staff, admin];
}

function officer(id: string, name: string, employeeId: string, departmentId: OfficerUser['departmentId'], designation: string, mobile: number, now: number): OfficerUser {
  return {
    id,
    role: 'officer',
    name,
    email: `${name.toLowerCase().replace(/\s+/g, '.')}@certitrack.example`,
    mobile: String(mobile),
    createdAt: ago(now, 320),
    passwordDigest: '',
    active: false,
    lastLoginAt: null,
    employeeId,
    departmentId,
    designation,
  };
}

/** Citizens who appear in the curated story (Suresh, Anjali and Ravi). Fictional records. */
export function curatedCitizens(now: number): CitizenUser[] {
  const base = (id: string, name: string, email: string, mobile: string, dob: string, gender: string, address: string, district: string, taluk: string, village: string): CitizenUser => ({
    id,
    role: 'citizen',
    name,
    email,
    mobile,
    createdAt: ago(now, 60),
    passwordDigest: '',
    active: false,
    lastLoginAt: null,
    dateOfBirth: dob,
    gender,
    address,
    district,
    taluk,
    village,
    language: 'en',
    notificationPrefs: { whatsapp: true, email: true },
  });
  return [
    base(SAMPLE_CITIZEN_ID, 'Meera Krishnan', 'meera.krishnan@sample.invalid', '9000000001', '1994-03-18', 'Female', '14, Gandhi Street, Ward 7, near the Panchayat Office', 'Coimbatore', 'Pollachi', 'Kinathukadavu'),
    base('usr-cit-suresh', 'Suresh Babu', 'suresh.babu@mail.example', '9876501234', '1989-11-02', 'Male', '22, Bharathi Street, Kamaraj Colony', 'Madurai', 'Madurai South', 'Thirunagar'),
    base('usr-cit-anjali', 'Anjali Pillai', 'anjali.pillai@mail.example', '9845012377', '1997-06-21', 'Female', '7, Temple Road, Gandhipuram', 'Coimbatore', 'Coimbatore North', 'Peelamedu'),
    base('usr-cit-ravi', 'Ravi Shankar', 'ravi.shankar@mail.example', '9712345680', '1985-01-09', 'Male', '3/45, Mill Road, Erode', 'Erode', 'Erode', 'Chithode'),
  ];
}
