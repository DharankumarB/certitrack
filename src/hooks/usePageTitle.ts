import { useEffect } from 'react';

const BASE = 'CertiTrack';

export function usePageTitle(title?: string): void {
  useEffect(() => {
    document.title = title ? `${title} · ${BASE}` : `${BASE} · Government certificates, tracked live`;
  }, [title]);
}
