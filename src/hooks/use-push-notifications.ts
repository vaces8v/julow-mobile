import * as Notifications from 'expo-notifications';
import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import { navigateFromNotificationData } from '@/lib/notification-navigation';
import {
  getNativePushToken,
  parsePushData,
  registerPushTokenWithBackend,
  unregisterPushTokenFromBackend,
} from '@/lib/push-notifications';
import { showToast } from '@/components/toaster';
import { getActiveChatId } from '@/lib/active-chat';
import * as SecureStore from 'expo-secure-store';

const DEVICE_PUSH_TOKEN_KEY = 'julow.push.fcm_token';

export function usePushNotifications({ enabled }: { enabled: boolean }): void {
  const registeredRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    const register = async () => {
      try {
        await registerPushTokenWithBackend();
        if (!cancelled) registeredRef.current = true;
      } catch (err) {
        console.warn('[push] registration failed', err);
      }
    };

    void register();

    const refreshSub = Notifications.addPushTokenListener(({ data }) => {
      void (async () => {
        const next = data?.trim();
        if (!next) return;
        const prev = await SecureStore.getItemAsync(DEVICE_PUSH_TOKEN_KEY);
        if (prev === next) return;
        try {
          await registerPushTokenWithBackend();
        } catch (err) {
          console.warn('[push] token refresh registration failed', err);
        }
      })();
    });

    const receivedSub = Notifications.addNotificationReceivedListener((notification) => {
      if (AppState.currentState === 'active') {
        const data = parsePushData(notification.request.content.data);
        const chatId = data.chat_id;
        const ntype = (data.type ?? data.notification_type ?? '').toLowerCase();
        if (ntype === 'chat_message' && chatId && getActiveChatId() === chatId) return;

        showToast({
          title: notification.request.content.title ?? data.title ?? 'Julow',
          body: notification.request.content.body ?? data.body,
          kind: ntype.includes('chat') ? 'message' : 'notification',
          onPress: () => {
            void navigateFromNotificationData(data);
          },
        });
      }
    });

    const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = parsePushData(response.notification.request.content.data);
      void navigateFromNotificationData(data);
    });

    return () => {
      cancelled = true;
      registeredRef.current = false;
      refreshSub.remove();
      receivedSub.remove();
      responseSub.remove();
    };
  }, [enabled]);
}

export async function unregisterPushOnLogout(): Promise<void> {
  await unregisterPushTokenFromBackend();
}

export async function refreshPushTokenIfNeeded(): Promise<void> {
  const token = await getNativePushToken();
  if (!token) return;
  const prev = await SecureStore.getItemAsync(DEVICE_PUSH_TOKEN_KEY);
  if (prev !== token) {
    await registerPushTokenWithBackend();
  }
}
