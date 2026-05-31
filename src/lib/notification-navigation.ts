/**
 * Shared navigation from push / WS / in-app notification payloads.
 */

import { router } from 'expo-router';

import { api } from '@/lib/api';

export type NotificationNavData = {
  type?: string;
  notification_type?: string;
  notification_id?: string;
  url?: string;
  mobile_url?: string;
  chat_id?: string;
  project_id?: string;
  task_id?: string;
  data?: {
    chat_id?: string;
    project_id?: string;
    task_id?: string;
    target_type?: string;
    target_id?: string;
  };
};

function pickEntityIds(payload: NotificationNavData) {
  const nested = payload.data ?? {};
  const targetType = nested.target_type as string | undefined;
  const targetId = nested.target_id as string | undefined;
  const chatId = nested.chat_id ?? payload.chat_id;
  const projectId =
    nested.project_id ??
    payload.project_id ??
    (targetType === 'project' ? targetId : undefined);
  const taskId =
    nested.task_id ??
    payload.task_id ??
    (targetType === 'task' ? targetId : undefined);
  return { chatId, projectId, taskId };
}

function navigateFromMobileUrl(rawUrl: string | undefined): boolean {
  if (!rawUrl?.trim()) return false;
  const trimmed = rawUrl.trim();
  if (trimmed.startsWith('julowmobile://')) {
    const path = trimmed.replace(/^julowmobile:\/\//, '/');
    router.push(path as any);
    return true;
  }
  if (trimmed.startsWith('/')) {
    router.push(trimmed as any);
    return true;
  }
  return false;
}

export async function navigateFromNotificationData(payload: NotificationNavData): Promise<void> {
  if (navigateFromMobileUrl(payload.mobile_url ?? payload.url)) return;

  const { chatId, projectId, taskId } = pickEntityIds(payload);
  if (chatId) {
    router.push(`/chat/${chatId}` as any);
    return;
  }
  if (taskId) {
    try {
      const task = await api.getTask(taskId);
      if (task?.projectId) {
        router.push(`/project/${task.projectId}?task=${taskId}` as any);
        return;
      }
    } catch {
      /* ignore */
    }
  }
  if (projectId) {
    router.push(`/project/${projectId}` as any);
    return;
  }
  router.push('/notifications');
}
