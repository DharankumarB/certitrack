import type { Application, Certificate, User } from '../types';
import { appStore } from '../store/appStore';
import { simulateLatency } from './api';
import { canViewApplication, isAdmin, isCitizen, isOfficer } from './access';

export interface SearchPerson {
  id: string;
  name: string;
  detail: string;
  applicationIds: string[];
}

export interface SearchResults {
  applications: Application[];
  certificates: Certificate[];
  people: SearchPerson[];
}

/** Global search grouped by Application ID, Certificate ID and applicant name. Respects role scoping. */
export async function globalSearch(viewer: User, query: string): Promise<SearchResults> {
  await simulateLatency(80);
  const q = query.trim().toLowerCase();
  const empty: SearchResults = { applications: [], certificates: [], people: [] };
  if (q.length < 2) return empty;
  const state = appStore.getState();
  const visibleApps = state.applications.filter((a) => canViewApplication(viewer, a));
  const applications = visibleApps
    .filter((a) => a.id.toLowerCase().includes(q) || a.applicantName.toLowerCase().includes(q))
    .slice(0, 6);
  const certificates = state.certificates
    .filter((c) => {
      if (isAdmin(viewer)) return true;
      if (isCitizen(viewer)) return c.citizenId === viewer.id;
      if (isOfficer(viewer)) return state.applications.find((a) => a.id === c.applicationId)?.departmentId === viewer.departmentId;
      return false;
    })
    .filter((c) => c.certificateNumber.toLowerCase().includes(q) || c.applicantName.toLowerCase().includes(q))
    .slice(0, 6);
  const peopleMap = new Map<string, SearchPerson>();
  for (const app of visibleApps) {
    if (!app.applicantName.toLowerCase().includes(q)) continue;
    const existing = peopleMap.get(app.citizenId);
    if (existing) existing.applicationIds.push(app.id);
    else peopleMap.set(app.citizenId, { id: app.citizenId, name: app.applicantName, detail: `${app.district} · ${app.taluk}`, applicationIds: [app.id] });
  }
  return { applications, certificates, people: [...peopleMap.values()].slice(0, 5) };
}
