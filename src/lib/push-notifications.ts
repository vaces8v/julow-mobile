/**
 * FCM push token registration via expo-notifications.
 *
 * EAS / native build notes:
 * - Upload FCM server key + google-services.json via `eas credentials`
 * - Android: add google-services.json and `"googleServicesFile"` in app.json
 * - iOS: APNs key in EAS + Firebase iOS app with APNs configured
 */

import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Linking, Platform } from 'react-native';

import { apiDelete, apiGet, apiPost } from '@/lib/api-client';
import * as SecureStore from 'expo-secure-store';

const DEVICE_TOKEN_ID_KEY = 'julow.push.device_token_id';
const DEVICE_PUSH_TOKEN_KEY = 'julow.push.fcm_token';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export type PushRegistrationResult = {
  deviceTokenId: string;
  token: string;
  platform: 'ios' | 'android' | 'web';
};

function resolvePlatform(): 'ios' | 'android' | 'web' {
  if (Platform.OS === 'ios') return 'ios';
  if (Platform.OS === 'android') return 'android';
  return 'web';
}

async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('default', {
    name: 'Julow',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
  });
}

export type PushPermissionState = 'granted' | 'denied' | 'undetermined';

export function isPushPermissionGranted(
  status: Notifications.NotificationPermissionsStatus,
): boolean {
  return (
    status.granted ||
    status.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL
  );
}

export function resolvePushPermissionState(
  status: Notifications.NotificationPermissionsStatus,
): PushPermissionState {
  if (isPushPermissionGranted(status)) return 'granted';
  if (status.status === Notifications.PermissionStatus.DENIED && status.canAskAgain === false) {
    return 'denied';
  }
  if (status.status === Notifications.PermissionStatus.DENIED) return 'denied';
  return 'undetermined';
}

export async function getPushPermissionStatus(): Promise<Notifications.NotificationPermissionsStatus> {
  return Notifications.getPermissionsAsync();
}

export async function requestPushPermissions(): Promise<boolean> {
  if (!Device.isDevice) return false;
  await ensureAndroidChannel();
  const current = await Notifications.getPermissionsAsync();
  if (isPushPermissionGranted(current)) return true;
  if (current.canAskAgain === false) return false;
  const requested = await Notifications.requestPermissionsAsync();
  return isPushPermissionGranted(requested);
}

export async function openAppNotificationSettings(): Promise<void> {
  await Linking.openSettings();
}

export async function hasRegisteredPushToken(): Promise<boolean> {
  const deviceTokenId = await SecureStore.getItemAsync(DEVICE_TOKEN_ID_KEY);
  return Boolean(deviceTokenId?.trim());
}

export interface NotificationPreferenceEntry {
  type: string;
  in_app: boolean;
  email: boolean;
  push: boolean;
}

export async function fetchNotificationPreferences(): Promise<NotificationPreferenceEntry[]> {
  const res = await apiGet<{ global_preferences: NotificationPreferenceEntry[] }>(
    '/notification-settings/preferences',
  );
  return res.data.global_preferences ?? [];
}

/** True when at least one global notification type has push channel enabled. */
export async function isPushChannelEnabledOnServer(): Promise<boolean> {
  try {
    const prefs = await fetchNotificationPreferences();
    if (prefs.length === 0) return true;
    return prefs.some((entry) => entry.push);
  } catch {
    return true;
  }
}

export async function getNativePushToken(): Promise<string | null> {
  if (!Device.isDevice) return null;
  try {
    const token = await Notifications.getDevicePushTokenAsync();
    return token.data?.trim() || null;
  } catch (err) {
    console.warn('[push] getDevicePushTokenAsync failed', err);
    return null;
  }
}

export async function registerPushTokenWithBackend(options?: {
  skipPermissionCheck?: boolean;
}): Promise<PushRegistrationResult | null> {
  if (!options?.skipPermissionCheck) {
    const granted = await requestPushPermissions();
    if (!granted) return null;
  } else if (!Device.isDevice) {
    return null;
  } else {
    await ensureAndroidChannel();
    const status = await Notifications.getPermissionsAsync();
    if (!isPushPermissionGranted(status)) return null;
  }

  const token = await getNativePushToken();
  if (!token) return null;

  const platform = resolvePlatform();
  const deviceName =
    Device.modelName ??
    Device.deviceName ??
    Constants.deviceName ??
    `${platform} device`;

  const res = await apiPost<{
    id: string;
    platform: string;
    device_name: string;
    is_active: boolean;
  }>('/notification-settings/devices', {
    token,
    platform,
    device_name: deviceName,
  });

  await SecureStore.setItemAsync(DEVICE_TOKEN_ID_KEY, res.data.id);
  await SecureStore.setItemAsync(DEVICE_PUSH_TOKEN_KEY, token);

  return {
    deviceTokenId: res.data.id,
    token,
    platform,
  };
}

export async function unregisterPushTokenFromBackend(): Promise<void> {
  const deviceTokenId = await SecureStore.getItemAsync(DEVICE_TOKEN_ID_KEY);
  if (deviceTokenId) {
    try {
      await apiDelete(`/notification-settings/devices/${deviceTokenId}`);
    } catch (err) {
      console.warn('[push] unregister failed', err);
    }
  }
  await SecureStore.deleteItemAsync(DEVICE_TOKEN_ID_KEY);
  await SecureStore.deleteItemAsync(DEVICE_PUSH_TOKEN_KEY);
}

export function parsePushData(raw: unknown): Record<string, string> {
  if (!raw || typeof raw !== 'object') return {};
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (value == null) continue;
    out[key] = String(value);
  }
  return out;
}

export async function handleColdStartNotification(): Promise<void> {
  const response = await Notifications.getLastNotificationResponseAsync();
  if (!response) return;
  const data = parsePushData(response.notification.request.content.data);
  const { navigateFromNotificationData } = await import('@/lib/notification-navigation');
  await navigateFromNotificationData(data);
}
