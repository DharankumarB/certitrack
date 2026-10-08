import type { AdminUser, CitizenUser, OfficerUser, User } from '../types';
import { DEMO_PASSWORD_DIGEST } from '../config/demo';
import { ago } from './factories';

/**
 * Demo staff and the demo citizen. All accounts are fictional and share the demo password
 * (stored only as a SHA-256 digest). Synthetic applicants are generated separately.
 */
export const DEMO_CITIZEN_ID = 'usr-citizen-demo';
export const DEMO_OFFICER_ID = 'usr-officer-caste';
export const DEMO_ADMIN_ID = 'usr-admin-demo';

export function mockUsers(now: number): User[] {
  const citizen: CitizenUser = {
    id: DEMO_CITIZEN_ID,
    role: 'citizen',
    name: 'Meera Krishnan',
    email: 'citizen.demo@certitrack.example',
    mobile: '9000000001',
    createdAt: ago(now, 180),
    passwordDigest: DEMO_PASSWORD_DIGEST,
    active: true,
    lastLoginAt: ago(now, 0, 0, 25),
    dateOfBirth: '1994-03-18',
    gender: 'Female',
    address: '14, Gandhi Street, Ward 7, near the Panchayat Office',
    district: 'Coimbatore',
    taluk: 'Pollachi',
    village: 'Kinathukadavu',
    language: 'en',
    notificationPrefs: { whatsapp: true, email: true },
  };

  const caste: OfficerUser = {
    id: DEMO_OFFICER_ID,
    role: 'officer',
    name: 'Deepa Srinivasan',
    email: 'officer.demo@certitrack.example',
    mobile: '9000000002',
    createdAt: ago(now, 400),
    passwordDigest: DEMO_PASSWORD_DIGEST,
    active: true,
    lastLoginAt: ago(now, 0, 1),
    employeeId: 'CT-OFF-1042',
    departmentId: 'caste',
    designation: 'Verification Officer, Grade II',
  };

  const admin: AdminUser = {
    id: DEMO_ADMIN_ID,
    role: 'admin',
    name: 'Arjun Mehta',
    email: 'admin.demo@certitrack.example',
    mobile: '9000000003',
    createdAt: ago(now, 500),
    passwordDigest: DEMO_PASSWORD_DIGEST,
    active: true,
    lastLoginAt: ago(now, 0, 0, 40),
    designation: 'Super Administrator, CertiTrack',
    systemAccess: ['All departments', 'Applications (read)', 'Analytics', 'Audit logs', 'Settings', 'Demo reset'],
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

  const secondAdmin: AdminUser = {
    id: 'usr-admin-2',
    role: 'admin',
    name: 'Sunita Rao',
    email: 'sunita.rao@certitrack.example',
    mobile: '9000000004',
    createdAt: ago(now, 300),
    passwordDigest: DEMO_PASSWORD_DIGEST,
    active: true,
    lastLoginAt: ago(now, 3),
    designation: 'Platform Operations Lead',
    systemAccess: ['All departments', 'Audit logs (read)', 'Analytics'],
  };

  return [citizen, caste, admin, ...staff, secondAdmin];
}

function officer(id: string, name: string, employeeId: string, departmentId: OfficerUser['departmentId'], designation: string, mobile: number, now: number): OfficerUser {
  return {
    id,
    role: 'officer',
    name,
    email: `${name.toLowerCase().replace(/\s+/g, '.')}@certitrack.example`,
    mobile: String(mobile),
    createdAt: ago(now, 320),
    passwordDigest: DEMO_PASSWORD_DIGEST,
    active: true,
    lastLoginAt: ago(now, 1, 3),
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
    passwordDigest: DEMO_PASSWORD_DIGEST,
    active: true,
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
    base('usr-cit-suresh', 'Suresh Babu', 'suresh.babu@mail.example', '9876501234', '1989-11-02', 'Male', '22, Bharathi Street, Kamaraj Colony', 'Madurai', 'Madurai South', 'Thirunagar'),
    base('usr-cit-anjali', 'Anjali Pillai', 'anjali.pillai@mail.example', '9845012377', '1997-06-21', 'Female', '7, Temple Road, Gandhipuram', 'Coimbatore', 'Coimbatore North', 'Peelamedu'),
    base('usr-cit-ravi', 'Ravi Shankar', 'ravi.shankar@mail.example', '9712345680', '1985-01-09', 'Male', '3/45, Mill Road, Erode', 'Erode', 'Erode', 'Chithode'),
  ];
}
