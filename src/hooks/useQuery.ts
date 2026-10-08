import { useEffect, useRef, useState } from 'react';
import { useAppRev } from './useAppState';

export interface QueryState<T> {
  data: T | undefined;
  error: unknown;
  /** True only before the first response. Background refreshes keep showing existing data. */
  loading: boolean;
  reload: () => void;
}

/**
 * Runs an async service call and re-runs it whenever the shared store changes, so every screen
 * reflects the latest state (approvals, notifications, deliveries) without manual refresh.
 */
export function useQuery<T>(fetcher: () => Promise<T>, deps: ReadonlyArray<unknown> = []): QueryState<T> {
  const rev = useAppRev();
  const [nonce, setNonce] = useState(0);
  const [result, setResult] = useState<{ data?: T; error?: unknown; ready: boolean }>({ ready: false });
  const fetcherRef = useRef(fetcher);
  useEffect(() => {
    fetcherRef.current = fetcher;
  });
  useEffect(() => {
    let active = true;
    fetcherRef
      .current()
      .then(
        (data) => {
          if (active) setResult({ data, ready: true });
        },
        (error: unknown) => {
          if (active) setResult({ error, ready: true });
        },
      );
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deps are supplied by callers
  }, [rev, nonce, ...deps]);
  return { data: result.data, error: result.error, loading: !result.ready, reload: () => setNonce((n) => n + 1) };
}
