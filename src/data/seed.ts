import type { AppData, OfficerUser } from '../types';
import { mockDepartments } from './mockDepartments';
import { mockUsers, curatedCitizens } from './mockUsers';
import { curatedBundle } from './mockApplications';
import { curatedNotifications } from './mockNotifications';
import { curatedAuditLogs } from './mockAuditLogs';
import { generateSynthetic } from './generator';

export const DATA_SCHEMA_VERSION = 1;

/** Builds the complete, deterministic demo dataset anchored at `now`. */
export function buildSeedData(now: number = Date.now()): AppData {
  const staff = mockUsers(now);
  const curated = curatedBundle(now);
  const curatedCitizenList = curatedCitizens(now);
  const curatedNumbers = new Set(curated.applications.map((a) => Number(a.id.replace('APP-', ''))));
  const officers = staff.filter((u): u is OfficerUser => u.role === 'officer');
  const synthetic = generateSynthetic(now, curatedNumbers, officers);

  const users = [...staff, ...curatedCitizenList, ...synthetic.citizens];
  const applications = [...curated.applications, ...synthetic.applications].sort((a, b) => Date.parse(b.submittedAt) - Date.parse(a.submittedAt));
  const maxAppNumber = Math.max(...applications.map((a) => Number(a.id.replace('APP-', ''))));
  const notifications = curatedNotifications(now, users);
  const auditLogs = [...curatedAuditLogs(now, users), ...synthetic.auditLogs].sort((a, b) => Date.parse(b.at) - Date.parse(a.at));

  return {
    schemaVersion: DATA_SCHEMA_VERSION,
    rev: 1,
    seededAt: new Date(now).toISOString(),
    users,
    departments: mockDepartments.map((d) => ({ ...d, certificateTypes: [...d.certificateTypes] })),
    applications,
    documents: [...curated.documents, ...synthetic.documents],
    certificates: [...curated.certificates, ...synthetic.certificates],
    deliveries: [...curated.deliveries, ...synthetic.deliveries],
    notifications,
    auditLogs,
    settings: {
      simulationSpeed: 'normal',
      channels: { whatsapp: true, email: true },
    },
    counters: {
      application: maxAppNumber + 1,
      certificate: synthetic.nextCertificateNumber,
      tracking: 1,
      notification: notifications.length + 1,
      audit: 1,
      user: users.length + 1,
      document: 1,
      event: 1,
    },
  };
}
