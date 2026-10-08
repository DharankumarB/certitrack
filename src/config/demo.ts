import type { UserRole } from '../types';

/**
 * Prototype demo accounts. These are fictional accounts in the local demo dataset.
 * They are NOT real credentials and carry no real personal data.
 */
export const DEMO_PASSWORD = 'Demo@2026';
/** SHA-256 digest of DEMO_PASSWORD. Seeded accounts store this digest, never the plaintext. */
export const DEMO_PASSWORD_DIGEST = 'sha256:6269bdc44514c668efb1ee9442d68ac81c662367fa36c1883e3027ee197f4036';

export interface DemoAccount {
  role: UserRole;
  title: string;
  email: string;
  summary: string;
  userId: string;
}

export const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    role: 'citizen',
    title: 'Citizen Demo',
    email: 'citizen.demo@certitrack.example',
    summary: 'Meera Krishnan · four applications across the three certificate types.',
    userId: 'usr-citizen-demo',
  },
  {
    role: 'officer',
    title: 'Officer Demo',
    email: 'officer.demo@certitrack.example',
    summary: 'Caste Certificate Department officer · sees only caste files.',
    userId: 'usr-officer-caste',
  },
  {
    role: 'admin',
    title: 'Super Admin Demo',
    email: 'admin.demo@certitrack.example',
    summary: 'All departments, analytics, audit logs and settings.',
    userId: 'usr-admin-demo',
  },
];

/**
 * Simulation timings (milliseconds). "fast" is used for live presentations.
 * These only control the mock e-sign and courier progression.
 */
export const SIM_TIMINGS = {
  normal: { esignDelay: 6000, deliveryStep: 20000 },
  fast: { esignDelay: 2500, deliveryStep: 8000 },
} as const;

export const AI_STAGE_DELAY_MS = 380;
