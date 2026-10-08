import { useSyncExternalStore } from 'react';
import { appStore } from '../store/appStore';
import type { AppData } from '../types';

/**
 * Subscribes a component to a slice of the central store. The selector must return a stable
 * reference (a stored array or object), otherwise React will re-render on every read.
 */
export function useAppState<T>(selector: (state: AppData) => T): T {
  const read = () => selector(appStore.getState());
  return useSyncExternalStore(appStore.subscribe, read, read);
}

export function useAppRev(): number {
  return useAppState((s) => s.rev);
}
