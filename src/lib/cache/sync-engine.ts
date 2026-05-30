import {
  checkIsOnline,
  flushMutationQueue,
  getOnlineStatus,
  refreshStaleCaches,
} from './cached-api';
import { getPendingMutationsCount } from './mutation-queue';

type SyncListener = () => void;

let isSyncing = false;
let smartSyncInProgress = false;
let reconnectDebounceTimer: ReturnType<typeof setTimeout> | null = null;

const RECONNECT_DEBOUNCE_MS = 1500;

const syncListeners = new Set<SyncListener>();

function notifySyncStatusChange(): void {
  syncListeners.forEach((fn) => {
    try {
      fn();
    } catch {
      /* noop */
    }
  });
}

export function subscribeSyncStatus(listener: SyncListener): () => void {
  syncListeners.add(listener);
  return () => {
    syncListeners.delete(listener);
  };
}

export function getSyncStatus(): { isSyncing: boolean; pendingMutationsCount: number } {
  return {
    isSyncing,
    pendingMutationsCount: getPendingMutationsCount(),
  };
}

/**
 * Smart sync: mutations first (auth-critical queue flush), then incremental stale refresh.
 */
export async function runSmartSync(): Promise<void> {
  if (smartSyncInProgress) return;
  smartSyncInProgress = true;
  isSyncing = true;
  notifySyncStatusChange();

  try {
    await checkIsOnline();
    if (!getOnlineStatus()) return;

    // Priority 1: flush queued mutations (createTask, sendMessage, etc.)
    await flushMutationQueue();

    // Priority 2: incremental TTL-based refresh of stale keys only
    await refreshStaleCaches();
  } finally {
    isSyncing = false;
    smartSyncInProgress = false;
    notifySyncStatusChange();
  }
}

/** Debounced reconnect handler — avoids hammering API on flaky networks. */
export function scheduleSmartSyncOnReconnect(): void {
  if (reconnectDebounceTimer) clearTimeout(reconnectDebounceTimer);
  reconnectDebounceTimer = setTimeout(() => {
    reconnectDebounceTimer = null;
    void runSmartSync();
  }, RECONNECT_DEBOUNCE_MS);
}

export { checkIsOnline, flushMutationQueue, getOnlineStatus };

/** @deprecated Prefer runSmartSync for incremental updates */
export async function refreshFromNetwork(): Promise<void> {
  await runSmartSync();
}
