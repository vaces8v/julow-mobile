import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

const PROD_API_URL = 'https://backend.julow.ru/api/v1';

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/$/, '');
}

/**
 * Android emulator cannot use localhost/127.0.0.1 for the dev machine.
 * In dev, route emulator traffic through the host loopback alias + local proxy.
 */
export function resolveApiBaseUrl(): string {
  const configured =
    (Constants.expoConfig?.extra?.apiBaseUrl as string | undefined) ??
    process.env.EXPO_PUBLIC_API_BASE_URL ??
    PROD_API_URL;

  const base = normalizeBaseUrl(configured);

  if (!__DEV__ || Platform.OS !== 'android' || Device.isDevice) {
    return base;
  }

  const emulatorOverride =
    (Constants.expoConfig?.extra?.emulatorApiBaseUrl as string | undefined) ??
    process.env.EXPO_PUBLIC_ANDROID_EMULATOR_API_BASE_URL;

  if (emulatorOverride) {
    const resolved = normalizeBaseUrl(emulatorOverride);
    if (__DEV__) {
      console.log(`[api] Android emulator → ${resolved}`);
    }
    return resolved;
  }

  if (__DEV__ && Platform.OS === 'android' && !Device.isDevice) {
    console.log(`[api] Android emulator → ${base}`);
  }

  return base;
}
