/**
 * Subscribe to backend `notification.created` WebSocket events and surface
 * them as in-app toasts.
 *
 * Mirrors the web behavior (`julow-web/src/components/app-shell.tsx`):
 *  - chat_message → toast routes to chat, suppressed if user is already in it
 *  - task_assigned / task_status_changed / task_added → toast with optional
 *    deep-link to the project/task
 *  - everything else → generic toast that opens the notifications screen
 *
 * Mount once at the root (after auth). Does nothing if the WS is not active.
 */

import { router } from 'expo-router';
import { useEffect } from 'react';

import { useI18n } from '@/i18n/context';
import { getActiveChatId } from '@/lib/active-chat';
import { subscribeWsEvent } from '@/lib/ws-client';
import { showToast, type ToastKind } from '@/components/toaster';

type NotificationPayload = {
  notification_type?: string;
  title?: string;
  body?: string;
  chat_id?: string;
  project_id?: string;
  task_id?: string;
  data?: {
    chat_id?: string;
    project_id?: string;
    task_id?: string;
  };
};

function classifyKind(notificationType: string): ToastKind {
  const t = notificationType.toLowerCase();
  if (t.includes('chat') || t.includes('message')) return 'message';
  if (t.includes('task')) return 'task';
  if (t.includes('error') || t.includes('fail')) return 'error';
  if (t.includes('success') || t.includes('done') || t.includes('completed')) return 'success';
  return 'notification';
}

function pickToastLabels(locale: 'ru' | 'en' | 'de'): {
  open: string;
  defaultTitle: string;
} {
  if (locale === 'ru') return { open: 'Открыть', defaultTitle: 'Уведомление' };
  if (locale === 'de') return { open: 'Öffnen', defaultTitle: 'Benachrichtigung' };
  return { open: 'Open', defaultTitle: 'Notification' };
}

export function useNotificationToasts({ enabled }: { enabled: boolean }): void {
  const { locale } = useI18n();

  useEffect(() => {
    if (!enabled) return;

    const labels = pickToastLabels(locale);

    const unsub = subscribeWsEvent('notification.created', (rawPayload) => {
      const p = (rawPayload ?? {}) as NotificationPayload;
      const data = p.data ?? {};
      const chatId = data.chat_id ?? p.chat_id;
      const projectId = data.project_id ?? p.project_id;
      const taskId = data.task_id ?? p.task_id;
      const ntype = (p.notification_type ?? '').toLowerCase();
      const isChatMessage = ntype === 'chat_message';

      // Suppress chat-message toasts while user is reading that chat — the
      // message is already visible in the live feed; doubling it as a toast
      // is just noise. Matches web behavior.
      if (isChatMessage && chatId && getActiveChatId() === chatId) return;

      const goTo = () => {
        if (chatId) {
          router.push(`/chat/${chatId}`);
          return;
        }
        if (projectId) {
          router.push(`/project/${projectId}`);
          return;
        }
        // Fallback — open the notifications screen.
        router.push('/notifications');
      };

      showToast({
        title: p.title?.trim() || labels.defaultTitle,
        body: p.body?.trim() || undefined,
        kind: classifyKind(p.notification_type ?? ''),
        onPress: goTo,
        action: { label: labels.open, onPress: goTo },
      });
    });

    return () => {
      unsub();
    };
  }, [enabled, locale]);
}
