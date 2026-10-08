import type { Delivery, User } from '../types';
import { appStore } from '../store/appStore';
import { simulateLatency } from './api';
import { canViewApplication, isAdmin } from './access';

export async function getDeliveryForApplication(viewer: User, applicationId: string): Promise<Delivery | null> {
  await simulateLatency(120);
  const state = appStore.getState();
  const app = state.applications.find((a) => a.id === applicationId);
  if (!app || !canViewApplication(viewer, app)) return null;
  return state.deliveries.find((d) => d.applicationId === applicationId) ?? null;
}

export async function listDeliveries(viewer: User): Promise<Delivery[]> {
  await simulateLatency();
  const state = appStore.getState();
  const visible = new Set(state.applications.filter((a) => canViewApplication(viewer, a)).map((a) => a.id));
  return state.deliveries
    .filter((d) => (isAdmin(viewer) ? true : visible.has(d.applicationId)))
    .sort((a, b) => Date.parse(b.dispatchedAt) - Date.parse(a.dispatchedAt));
}
