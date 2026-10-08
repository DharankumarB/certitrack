/**
 * Service layer conventions. Every function in src/services is async and returns plain data,
 * so a real REST/GraphQL backend can replace the mock store without touching the UI.
 */

export type ServiceErrorCode =
  | 'NOT_FOUND'
  | 'FORBIDDEN'
  | 'VALIDATION'
  | 'CONFLICT'
  | 'INVALID_CREDENTIALS'
  | 'PENDING_APPROVAL'
  | 'UNAUTHENTICATED'
  | 'SECURE_CONTEXT_REQUIRED'
  | 'STORAGE_UNAVAILABLE';

export class ServiceError extends Error {
  readonly code: ServiceErrorCode;
  readonly fieldErrors?: Partial<Record<string, string>>;

  constructor(code: ServiceErrorCode, message: string, fieldErrors?: Partial<Record<string, string>>) {
    super(message);
    this.name = 'ServiceError';
    this.code = code;
    this.fieldErrors = fieldErrors;
  }
}

export function isServiceError(error: unknown): error is ServiceError {
  return error instanceof ServiceError;
}

export function errorMessage(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (error instanceof ServiceError) return error.message;
  if (error instanceof Error && error.message && !error.message.startsWith('SECURE_CONTEXT')) return error.message;
  return fallback;
}

const IS_TEST = import.meta.env.MODE === 'test';
/** Small artificial latency so loading states are visible and realistic. Zero in unit tests. */
export const LATENCY_MS = IS_TEST ? 0 : 160;

export function simulateLatency(ms: number = LATENCY_MS): Promise<void> {
  if (IS_TEST || ms <= 0) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function nowIso(): string {
  return new Date().toISOString();
}
