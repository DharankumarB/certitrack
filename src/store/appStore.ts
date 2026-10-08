import type { AppData } from '../types';
import { buildSeedData, DATA_SCHEMA_VERSION } from '../data/seed';

export const STORAGE_KEY = 'certitrack:data:v1';

export type Mutator = (state: AppData) => AppData;

type Listener = () => void;

function isValidData(value: unknown): value is AppData {
  return isAppDataShape(value) && value.schemaVersion === DATA_SCHEMA_VERSION;
}

function isAppDataShape(value: unknown): value is AppData {
  if (!value || typeof value !== 'object') return false;
  const v = value as Partial<AppData>;
  return (
    typeof v.schemaVersion === 'number' &&
    typeof v.rev === 'number' &&
    Array.isArray(v.users) &&
    Array.isArray(v.applications) &&
    Array.isArray(v.documents) &&
    Array.isArray(v.certificates) &&
    Array.isArray(v.deliveries) &&
    Array.isArray(v.notifications) &&
    Array.isArray(v.auditLogs) &&
    Array.isArray(v.departments) &&
    !!v.settings &&
    !!v.counters
  );
}

/**
 * Single, centralised application store.
 *  - Reads are synchronous snapshots (safe for useSyncExternalStore).
 *  - Writes go through `commit`, which applies a pure mutator to the LATEST persisted state, so two tabs
 *    never overwrite each other with stale data.
 *  - Persistence uses localStorage. The `storage` event keeps other tabs in sync.
 */
export class AppStore {
  private state: AppData;
  private raw: string | null = null;
  private readonly listeners = new Set<Listener>();
  private persistFailed = false;
  notice: string | null = null;

  constructor(
    private readonly backend: Storage | null,
    private readonly seed: () => AppData,
  ) {
    this.state = this.loadInitial();
  }

  getState = (): AppData => this.state;

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  get isPersistent(): boolean {
    return this.backend !== null && !this.persistFailed;
  }

  /** Applies a pure mutator to the latest state, persists the result and notifies subscribers. */
  commit(mutate: Mutator): AppData {
    const base = this.sync();
    const next = mutate(base);
    if (next === base) return base;
    const stamped: AppData = { ...next, rev: base.rev + 1 };
    this.state = stamped;
    this.persist(stamped);
    this.emit();
    return stamped;
  }

  /** Replaces the entire dataset (used by demo reset). */
  replace(data: AppData): AppData {
    const stamped: AppData = { ...data, rev: this.state.rev + 1 };
    this.state = stamped;
    this.persist(stamped);
    this.emit();
    return stamped;
  }

  reseed(): AppData {
    return this.replace(this.seed());
  }

  /** Called from the window `storage` event handler. Adopts newer data written by another tab. */
  handleStorageEvent(event: StorageEvent): void {
    if (event.key !== STORAGE_KEY || !event.newValue) return;
    if (event.newValue === this.raw) return;
    const parsed = this.parse(event.newValue);
    if (parsed && parsed.rev > this.state.rev) {
      this.state = parsed;
      this.raw = event.newValue;
      this.emit();
    }
  }

  private sync(): AppData {
    if (!this.backend) return this.state;
    let raw: string | null = null;
    try {
      raw = this.backend.getItem(STORAGE_KEY);
    } catch {
      return this.state;
    }
    if (!raw || raw === this.raw) return this.state;
    const parsed = this.parse(raw);
    if (parsed && parsed.rev > this.state.rev) {
      this.state = parsed;
      this.raw = raw;
    }
    return this.state;
  }

  private parse(raw: string): AppData | null {
    try {
      const parsed: unknown = JSON.parse(raw);
      return isValidData(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }

  private persist(state: AppData): void {
    if (!this.backend) return;
    try {
      const raw = JSON.stringify(state);
      this.raw = raw;
      this.backend.setItem(STORAGE_KEY, raw);
      this.persistFailed = false;
    } catch {
      // Quota exceeded or storage disabled. Keep working in memory and tell the user.
      this.persistFailed = true;
      this.notice = 'Browser storage is full or disabled. Changes stay in this tab only.';
    }
  }

  private loadInitial(): AppData {
    if (this.backend) {
      try {
        const raw = this.backend.getItem(STORAGE_KEY);
        const parsed = raw ? this.parse(raw) : null;
        if (parsed) {
          this.raw = raw;
          return parsed;
        }
        const migrated = raw ? this.migrateVersionTwoData(raw) : null;
        if (migrated) {
          this.persist(migrated);
          return migrated;
        }
        if (raw) this.notice = 'Stored demo data was invalid, so it was reset to the starting state.';
      } catch {
        this.notice = 'Browser storage is unavailable. Using in-memory demo data.';
      }
    }
    return this.seedAndPersist();
  }

  private migrateVersionTwoData(raw: string): AppData | null {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (!isAppDataShape(parsed) || parsed.schemaVersion !== 2) return null;
      const seededAdmin = this.seed().users.find((user) => user.email.toLowerCase() === 'admin@gmail.com');
      if (!seededAdmin || (seededAdmin.role !== 'super_admin' && seededAdmin.role !== 'admin')) return null;
      const existingAdmin = parsed.users.find((user) => user.email.toLowerCase() === seededAdmin.email.toLowerCase());
      const admin = existingAdmin ? { ...seededAdmin, id: existingAdmin.id } : seededAdmin;
      const users = [...parsed.users.filter((user) => user.email.toLowerCase() !== seededAdmin.email.toLowerCase()), admin];
      return {
        ...parsed,
        schemaVersion: DATA_SCHEMA_VERSION,
        rev: parsed.rev + 1,
        users,
        counters: { ...parsed.counters, user: Math.max(parsed.counters.user, users.length + 1) },
      };
    } catch {
      return null;
    }
  }

  private seedAndPersist(): AppData {
    const data = this.seed();
    this.persist(data);
    return data;
  }

  private emit(): void {
    this.listeners.forEach((listener) => listener());
  }
}

function resolveBackend(): Storage | null {
  try {
    if (typeof window === 'undefined') return null;
    const probe = '__certitrack_probe__';
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
    return window.localStorage;
  } catch {
    return null;
  }
}

export const appStore = new AppStore(resolveBackend(), () => buildSeedData(Date.now()));

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => appStore.handleStorageEvent(event));
}
