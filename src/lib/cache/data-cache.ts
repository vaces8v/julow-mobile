import { dataMmkv, getJson, removeKey, setJson } from './mmkv-storage';

export const DEFAULT_STALE_MS = 5 * 60 * 1000;

export interface CacheEntry<T> {
  data: T;
  fetchedAt: number;
  version: number;
}

export function readCache<T>(key: string): T | null {
  const entry = getJson<CacheEntry<T>>(key);
  return entry?.data ?? null;
}

export function readCacheEntry<T>(key: string): CacheEntry<T> | null {
  return getJson<CacheEntry<T>>(key);
}

export function writeCache<T>(key: string, data: T, version = 1): void {
  const entry: CacheEntry<T> = {
    data,
    fetchedAt: Date.now(),
    version,
  };
  setJson(key, entry);
}

export function isStale(key: string, staleMs = DEFAULT_STALE_MS): boolean {
  const entry = getJson<CacheEntry<unknown>>(key);
  if (!entry) return true;
  return Date.now() - entry.fetchedAt > staleMs;
}

export function invalidateCache(key: string): void {
  removeKey(key);
}

export function clearDataCache(): void {
  for (const key of dataMmkv.getAllKeys()) {
    if (key.startsWith('julow.cache.')) {
      dataMmkv.remove(key);
    }
  }
}

export function listCacheKeys(): string[] {
  return dataMmkv.getAllKeys().filter((key) => key.startsWith('julow.cache.'));
}
