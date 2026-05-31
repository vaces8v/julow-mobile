import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Device from 'expo-device';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Alert, AppState, type AppStateStatus } from 'react-native';

import { useI18n } from '@/i18n/context';
import {
  getPushPermissionStatus,
  hasRegisteredPushToken,
  isPushChannelEnabledOnServer,
  isPushPermissionGranted,
  openAppNotificationSettings,
  registerPushTokenWithBackend,
  requestPushPermissions,
  resolvePushPermissionState,
  unregisterPushTokenFromBackend,
  type PushPermissionState,
} from '@/lib/push-notifications';

const PUSH_PREF_KEY = '@julow/push_enabled';

type PushNotificationsContextValue = {
  isPushEnabled: boolean;
  permissionState: PushPermissionState;
  isReady: boolean;
  isBusy: boolean;
  setPushEnabled: (enabled: boolean) => Promise<void>;
  refreshPushState: () => Promise<void>;
};

const PushNotificationsContext = createContext<PushNotificationsContextValue | null>(null);

async function readStoredPreference(): Promise<boolean | null> {
  const raw = await AsyncStorage.getItem(PUSH_PREF_KEY);
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  return null;
}

async function writeStoredPreference(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(PUSH_PREF_KEY, enabled ? 'true' : 'false');
}

export function PushNotificationsProvider({ children }: { children: React.ReactNode }) {
  const { t } = useI18n();
  const s = t.settings.push;
  const [isPushEnabled, setIsPushEnabled] = useState(false);
  const [permissionState, setPermissionState] = useState<PushPermissionState>('undetermined');
  const [isReady, setIsReady] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const busyRef = useRef(false);

  const refreshPushState = useCallback(async () => {
    const [status, storedPref, hasToken, serverPushEnabled] = await Promise.all([
      getPushPermissionStatus(),
      readStoredPreference(),
      hasRegisteredPushToken(),
      isPushChannelEnabledOnServer(),
    ]);

    const permState = resolvePushPermissionState(status);
    setPermissionState(permState);

    const granted = isPushPermissionGranted(status);
    let wantsPush = storedPref;
    if (wantsPush == null) {
      wantsPush = hasToken && granted;
    }

    const enabled = Boolean(wantsPush && granted && hasToken && serverPushEnabled);
    setIsPushEnabled(enabled);

    if (wantsPush && granted && serverPushEnabled && !hasToken && Device.isDevice) {
      try {
        await registerPushTokenWithBackend({ skipPermissionCheck: true });
        setIsPushEnabled(true);
      } catch (err) {
        console.warn('[push] auto-register failed', err);
      }
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    refreshPushState()
      .catch((err) => console.warn('[push] initial state failed', err))
      .finally(() => {
        if (!cancelled) setIsReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [refreshPushState]);

  useEffect(() => {
    const onChange = (next: AppStateStatus) => {
      if (next === 'active') {
        void refreshPushState();
      }
    };
    const sub = AppState.addEventListener('change', onChange);
    return () => sub.remove();
  }, [refreshPushState]);

  const showPermissionDeniedAlert = useCallback(() => {
    Alert.alert(s.permissionDeniedTitle, s.permissionDeniedBody, [
      { text: t.common.cancel, style: 'cancel' },
      { text: s.openSettings, onPress: () => void openAppNotificationSettings() },
    ]);
  }, [s.openSettings, s.permissionDeniedBody, s.permissionDeniedTitle, t.common.cancel]);

  const setPushEnabled = useCallback(
    async (enabled: boolean) => {
      if (busyRef.current) return;
      busyRef.current = true;
      setIsBusy(true);

      try {
        if (!enabled) {
          await unregisterPushTokenFromBackend();
          await writeStoredPreference(false);
          setIsPushEnabled(false);
          return;
        }

        if (!Device.isDevice) {
          Alert.alert(s.permissionDeniedTitle, s.simulatorBody);
          return;
        }

        const serverPushEnabled = await isPushChannelEnabledOnServer();
        if (!serverPushEnabled) {
          Alert.alert(s.serverDisabledTitle, s.serverDisabledBody);
          return;
        }

        let granted = await requestPushPermissions();
        if (!granted) {
          const status = await getPushPermissionStatus();
          setPermissionState(resolvePushPermissionState(status));
          showPermissionDeniedAlert();
          setIsPushEnabled(false);
          return;
        }

        const result = await registerPushTokenWithBackend({ skipPermissionCheck: true });
        if (!result) {
          Alert.alert(s.permissionDeniedTitle, s.enableFailed);
          setIsPushEnabled(false);
          return;
        }

        await writeStoredPreference(true);
        setPermissionState('granted');
        setIsPushEnabled(true);
      } catch (err) {
        console.warn('[push] toggle failed', err);
        Alert.alert(s.permissionDeniedTitle, s.enableFailed);
        setIsPushEnabled(false);
      } finally {
        busyRef.current = false;
        setIsBusy(false);
      }
    },
    [
      s.enableFailed,
      s.permissionDeniedBody,
      s.permissionDeniedTitle,
      s.serverDisabledBody,
      s.serverDisabledTitle,
      s.simulatorBody,
      showPermissionDeniedAlert,
    ],
  );

  const value = useMemo(
    () => ({
      isPushEnabled,
      permissionState,
      isReady,
      isBusy,
      setPushEnabled,
      refreshPushState,
    }),
    [isBusy, isPushEnabled, isReady, permissionState, refreshPushState, setPushEnabled],
  );

  return <PushNotificationsContext.Provider value={value}>{children}</PushNotificationsContext.Provider>;
}

export function usePushNotificationsPreference(): PushNotificationsContextValue {
  const ctx = useContext(PushNotificationsContext);
  if (!ctx) {
    throw new Error('usePushNotificationsPreference must be used within PushNotificationsProvider');
  }
  return ctx;
}
