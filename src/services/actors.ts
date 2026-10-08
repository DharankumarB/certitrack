import type { ActorRef, User } from '../types';

export function actorOf(user: User): ActorRef {
  return {
    id: user.id,
    name: user.name,
    role: user.role,
    departmentId: user.role === 'officer' ? user.departmentId : null,
  };
}

export const SYSTEM_ACTOR: ActorRef = { id: null, name: 'CertiTrack system', role: 'system' };
export const AI_ACTOR: ActorRef = { id: null, name: 'AI pre-verification (prototype)', role: 'system' };
export const COURIER_ACTOR: ActorRef = { id: null, name: 'Partner courier (simulated)', role: 'system' };
export const PUBLIC_ACTOR: ActorRef = { id: null, name: 'Public visitor', role: 'public' };
