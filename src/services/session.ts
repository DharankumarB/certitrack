import type { Session } from '../types';

/**
 * Session handling. Sessions live in sessionStorage (per browser tab) so several roles can be
 * signed in side by side in different tabs. "Remember me" moves the session to localStorage.
 */
const KEY = 'certitrack.session';

function storages(): Storage[] {
  if (typeof window === 'undefined') return [];
  return [window.sessionStorage, window.localStorage];
}

export function readSession(): Session | null {
  for (const store of storages()) {
    try {
      const raw = store.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Session;
        if (parsed && typeof parsed.userId === 'string' && typeof parsed.role === 'string') return parsed;
      }
    } catch {
      // Ignore corrupted session data and fall through.
    }
  }
  return null;
}

export function writeSession(session: Session): void {
  const [tab, local] = storages();
  try {
    if (session.remember) {
      local?.setItem(KEY, JSON.stringify(session));
      tab?.removeItem(KEY);
    } else {
      tab?.setItem(KEY, JSON.stringify(session));
      local?.removeItem(KEY);
    }
  } catch {
    // Storage unavailable: the session lasts for this page view only.
  }
}

export function clearSession(): void {
  for (const store of storages()) {
    try {
      store.removeItem(KEY);
    } catch {
      // ignore
    }
  }
}
