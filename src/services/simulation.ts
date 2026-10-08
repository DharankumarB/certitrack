import type { AppData, Delivery, DeliveryStatus } from '../types';
import { appStore } from '../store/appStore';
import { addAudit, addNotifications, appendEvents, bumpCounter, findApplication, updateApplication } from '../store/mutations';
import type { EventSpec, NotificationSpec } from '../store/mutations';
import { SIM_TIMINGS } from '../config/demo';
import { buildCertificate, buildDelivery } from '../data/factories';
import { MSG } from '../utils/messages';
import { SYSTEM_ACTOR } from './actors';

/**
 * Simulation engine for the mock e-sign and courier services (PROTOTYPE).
 * Every transition re-checks its preconditions against the latest state, so several open tabs
 * can run the loop at the same time without duplicating work.
 */

const DELIVERY_ORDER: DeliveryStatus[] = ['dispatched', 'in_transit', 'out_for_delivery', 'delivered'];

const COURIER_TIMELINE = { name: 'Partner courier (simulated)', role: 'courier' as const };
const E_SIGN_TIMELINE = { name: 'Competent authority e-sign (simulated)', role: 'system' as const };

const DELIVERY_COPY: Record<'in_transit' | 'out_for_delivery' | 'delivered', { title: string; description: string }> = {
  in_transit: { title: 'In transit', description: 'Moving through the courier network toward the destination district.' },
  out_for_delivery: { title: 'Out for delivery', description: 'With the delivery agent for the registered address.' },
  delivered: { title: 'Delivered', description: 'Delivered to the registered address. Signature captured.' },
};

function iso(ms: number): string {
  return new Date(ms).toISOString();
}

function completeESign(s: AppData, applicationId: string, now: number): AppData {
  const app = findApplication(s, applicationId);
  if (!app || app.status !== 'esign_pending' || !app.esignAt || Date.parse(app.esignAt) > now) return s;
  const at = iso(now);
  const speed = s.settings.simulationSpeed;
  const deptName = s.departments.find((d) => d.id === app.departmentId)?.name ?? 'Department';

  const cert = bumpCounter(s, 'certificate');
  const certId = `cert-${cert.value}`;
  const certificate = buildCertificate({
    id: certId,
    number: cert.value,
    year: new Date(now).getFullYear(),
    type: app.certificateType,
    applicationId,
    citizen: { id: app.citizenId, name: app.applicantName, dob: app.applicantDob, address: app.address, district: app.district },
    parentOrSpouseName: app.details.fatherName ?? app.details.parentOrSpouseName ?? '—',
    details: app.details,
    issuedAt: at,
    deliveryRequested: app.deliveryRequested,
    taluk: app.taluk,
  });
  let state: AppData = { ...cert.state, certificates: [certificate, ...cert.state.certificates] };

  let delivery: Delivery | null = null;
  if (app.deliveryRequested) {
    const tracking = bumpCounter(state, 'tracking');
    state = tracking.state;
    delivery = buildDelivery({
      id: `dlv-${tracking.value}`,
      number: 500_000_000 + tracking.value,
      applicationId,
      certificateId: certId,
      recipientName: app.applicantName,
      recipientAddress: app.address,
      location: `${app.district} Sorting Hub`,
      dispatchedAt: at,
      status: 'dispatched',
      nextStepAt: iso(now + SIM_TIMINGS[speed].deliveryStep),
    });
    state = { ...state, deliveries: [delivery, ...state.deliveries] };
  }

  state = updateApplication(state, applicationId, (a) => ({
    ...a,
    status: 'issued',
    esignAt: null,
    certificateId: certId,
    completedAt: app.deliveryRequested ? null : at,
  }));

  const events: EventSpec[] = [
    { at, stage: 'esign', key: 'signed', action: 'Digitally signed', description: 'Signed by the competent authority (simulated e-sign, prototype only).', department: deptName, actorName: E_SIGN_TIMELINE.name, actorRole: E_SIGN_TIMELINE.role, tone: 'success' },
    { at, stage: 'issued', key: 'issued', action: 'Certificate issued', description: `Certificate ${certificate.certificateNumber} added to the applicant’s Certificate Locker.`, department: deptName, actorName: 'CertiTrack system', actorRole: 'system', tone: 'success' },
  ];
  if (delivery) {
    events.push({ at, stage: 'delivered', key: 'dispatched', action: 'Dispatched for delivery', description: `Physical copy dispatched from ${app.district} Sorting Hub. Tracking ID ${delivery.trackingId}.`, department: null, actorName: COURIER_TIMELINE.name, actorRole: COURIER_TIMELINE.role, tone: 'info' });
  }
  state = appendEvents(state, applicationId, events);

  const notes: NotificationSpec[] = [{ recipientId: app.citizenId, ...MSG.issued(app.certificateType, applicationId), kind: 'certificate', tone: 'success', applicationId }];
  if (delivery) notes.push({ recipientId: app.citizenId, ...MSG.dispatched(delivery.trackingId, applicationId), kind: 'delivery', tone: 'info', applicationId });
  state = addNotifications(state, notes, at);

  state = addAudit(state, SYSTEM_ACTOR, at, { action: 'esign_completed', applicationId, departmentId: app.departmentId, detail: 'Simulated e-sign (prototype)' });
  state = addAudit(state, SYSTEM_ACTOR, at, { action: 'certificate_issued', applicationId, departmentId: app.departmentId, detail: certificate.certificateNumber });
  if (delivery) state = addAudit(state, SYSTEM_ACTOR, at, { action: 'delivery_dispatched', applicationId, departmentId: app.departmentId, detail: `Tracking ${delivery.trackingId}` });
  return state;
}

function advanceDelivery(s: AppData, deliveryId: string, now: number): AppData {
  const delivery = s.deliveries.find((d) => d.id === deliveryId);
  if (!delivery || delivery.status === 'delivered' || !delivery.nextStepAt || Date.parse(delivery.nextStepAt) > now) return s;
  const next = DELIVERY_ORDER[DELIVERY_ORDER.indexOf(delivery.status) + 1];
  if (!next || next === 'dispatched') return s;
  const app = findApplication(s, delivery.applicationId);
  if (!app) return s;
  const at = iso(now);
  const speed = s.settings.simulationSpeed;
  const copy = DELIVERY_COPY[next];
  const location = next === 'in_transit' ? `${app.district} Regional Hub` : next === 'out_for_delivery' ? `${app.taluk} delivery office` : `Registered address, ${app.district}`;
  const done = next === 'delivered';
  const updated: Delivery = {
    ...delivery,
    status: next,
    currentLocation: done ? 'Delivered' : location,
    deliveredAt: done ? at : delivery.deliveredAt,
    nextStepAt: done ? null : iso(now + SIM_TIMINGS[speed].deliveryStep),
    events: [...delivery.events, { id: `${delivery.id}-${next}`, at, status: next, location, description: copy.description }],
  };
  let state: AppData = { ...s, deliveries: s.deliveries.map((d) => (d.id === delivery.id ? updated : d)) };
  state = appendEvents(state, app.id, [{ at, stage: 'delivered', key: next, action: copy.title, description: copy.description, department: null, actorName: COURIER_TIMELINE.name, actorRole: COURIER_TIMELINE.role, tone: done ? 'success' : 'info' }]);
  if (done) {
    state = updateApplication(state, app.id, (a) => ({ ...a, status: 'delivered', completedAt: at }));
    state = addNotifications(state, [{ recipientId: app.citizenId, ...MSG.delivered(app.id), kind: 'delivery', tone: 'success', applicationId: app.id }], at);
    state = addAudit(state, SYSTEM_ACTOR, at, { action: 'delivery_delivered', applicationId: app.id, departmentId: app.departmentId, detail: `Tracking ${delivery.trackingId}` });
  } else {
    state = addAudit(state, SYSTEM_ACTOR, at, { action: 'delivery_updated', applicationId: app.id, departmentId: app.departmentId, detail: `${copy.title} · Tracking ${delivery.trackingId}` });
  }
  return state;
}

/** Runs every due transition once. Returns true when at least one change was committed. */
export function runSimulation(now: number = Date.now()): boolean {
  let changed = false;
  const dueSignings = appStore
    .getState()
    .applications.filter((a) => a.status === 'esign_pending' && a.esignAt && Date.parse(a.esignAt) <= now)
    .map((a) => a.id);
  for (const id of dueSignings) {
    const before = appStore.getState().rev;
    appStore.commit((s) => completeESign(s, id, now));
    if (appStore.getState().rev !== before) changed = true;
  }
  const dueSteps = appStore
    .getState()
    .deliveries.filter((d) => d.status !== 'delivered' && d.nextStepAt && Date.parse(d.nextStepAt) <= now)
    .map((d) => d.id);
  for (const id of dueSteps) {
    const before = appStore.getState().rev;
    appStore.commit((s) => advanceDelivery(s, id, now));
    if (appStore.getState().rev !== before) changed = true;
  }
  return changed;
}

let pending: ReturnType<typeof setTimeout> | null = null;

/** Runs the simulation shortly after a known deadline (for example, right after an approval). */
export function scheduleSimulation(delayMs: number): void {
  if (pending) clearTimeout(pending);
  pending = setTimeout(() => {
    pending = null;
    runSimulation();
  }, Math.max(0, delayMs));
}

/** Starts the periodic loop used by the app shell. Returns a cleanup function. */
export function startSimulationLoop(intervalMs = 4000): () => void {
  runSimulation();
  const id = setInterval(() => runSimulation(), intervalMs);
  return () => clearInterval(id);
}
