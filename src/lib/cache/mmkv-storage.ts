import { createMMKV, type MMKV } from 'react-native-mmkv';

export const dataMmkv: MMKV = createMMKV({ id: 'julow-data-cache' });

export function getJson<T>(key: string): T | null {
  const raw = dataMmkv.getString(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function setJson(key: string, value: unknown): void {
  dataMmkv.set(key, JSON.stringify(value));
}

export function removeKey(key: string): void {
  dataMmkv.remove(key);
}

export function clearAllDataKeys(): void {
  const keys = dataMmkv.getAllKeys();
  for (const key of keys) {
    if (key.startsWith('julow.cache.')) {
      dataMmkv.remove(key);
    }
  }
}
