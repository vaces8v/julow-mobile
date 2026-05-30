import { useCallback, useEffect, useState } from 'react';

import { subscribeCacheUpdates } from './cache-events';
import { getSyncStatus, subscribeSyncStatus } from './sync-engine';

export function useCacheSync(onUpdate?: () => void): void {
  const stableUpdate = useCallback(() => {
    onUpdate?.();
  }, [onUpdate]);

  useEffect(() => {
    if (!onUpdate) return;
    return subscribeCacheUpdates(stableUpdate);
  }, [onUpdate, stableUpdate]);
}

export function useSyncStatus(): { isSyncing: boolean; pendingMutationsCount: number } {
  const [status, setStatus] = useState(getSyncStatus);

  useEffect(() => {
    const refresh = () => setStatus(getSyncStatus());
    const unsubSync = subscribeSyncStatus(refresh);
    const unsubCache = subscribeCacheUpdates(refresh);
    return () => {
      unsubSync();
      unsubCache();
    };
  }, []);

  return status;
}
