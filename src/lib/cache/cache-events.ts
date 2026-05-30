type CacheListener = () => void;

const listeners = new Set<CacheListener>();

export function subscribeCacheUpdates(listener: CacheListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function notifyCacheUpdate(): void {
  listeners.forEach((fn) => {
    try {
      fn();
    } catch {
      /* noop */
    }
  });
}
