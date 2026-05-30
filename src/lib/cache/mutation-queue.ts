import { CACHE_KEYS } from './cache-keys';
import { getJson, setJson } from './mmkv-storage';

export type MutationType =
  | 'createTask'
  | 'updateTaskStatus'
  | 'createProject'
  | 'sendMessage'
  | 'createComment'
  | 'markNotificationRead'
  | 'markAllNotificationsRead';

export interface CreateTaskPayload {
  workspaceId: string;
  projectId: string;
  title: string;
  taskType?: string;
  reporterId?: string;
  parentTaskId?: string;
  epicId?: string;
  description?: string;
  descriptionFormat?: 'PLAIN' | 'MARKDOWN' | 'HTML';
  priority?: string;
  assigneeIds?: string[];
  startDate?: string;
  dueDate?: string;
  sprintId?: string;
  /** Initial board column / workflow status (applied after create). */
  statusId?: string;
}

export interface UpdateTaskStatusPayload {
  taskId: string;
  statusId: string;
}

export interface CreateProjectPayload {
  workspaceId: string;
  name: string;
  description?: string;
}

export interface SendMessagePayload {
  chatId: string;
  content: string;
  contentFormat?: 'markdown' | 'plain';
  messageType?: string;
  senderId?: string;
}

export interface CreateCommentPayload {
  targetType: 'task' | 'project' | 'epic' | 'sprint';
  targetId: string;
  content: string;
  contentFormat?: 'markdown' | 'wysiwyg' | 'plain';
  parentCommentId?: string;
  authorId?: string;
}

export interface MarkNotificationReadPayload {
  notificationId: string;
}

export interface MarkAllNotificationsReadPayload {
  workspaceId?: string;
}

export type MutationPayload =
  | CreateTaskPayload
  | UpdateTaskStatusPayload
  | CreateProjectPayload
  | SendMessagePayload
  | CreateCommentPayload
  | MarkNotificationReadPayload
  | MarkAllNotificationsReadPayload;

export interface QueuedMutation {
  id: string;
  type: MutationType;
  payload: MutationPayload;
  createdAt: number;
  retryCount: number;
  localId?: string;
}

const MAX_RETRIES = 5;

function readQueue(): QueuedMutation[] {
  return getJson<QueuedMutation[]>(CACHE_KEYS.mutationQueue) ?? [];
}

function writeQueue(queue: QueuedMutation[]): void {
  setJson(CACHE_KEYS.mutationQueue, queue);
}

export function getMutationQueue(): QueuedMutation[] {
  return readQueue();
}

export function getPendingMutationsCount(): number {
  return readQueue().length;
}

export function enqueueMutation(
  type: MutationType,
  payload: MutationPayload,
  localId?: string,
): QueuedMutation {
  const item: QueuedMutation = {
    id: `mut-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    type,
    payload,
    createdAt: Date.now(),
    retryCount: 0,
    localId,
  };
  writeQueue([...readQueue(), item]);
  return item;
}

export function removeMutation(id: string): void {
  writeQueue(readQueue().filter((item) => item.id !== id));
}

export function updateMutation(item: QueuedMutation): void {
  writeQueue(readQueue().map((entry) => (entry.id === item.id ? item : entry)));
}

export function clearMutationQueue(): void {
  writeQueue([]);
}

export function shouldDropMutation(item: QueuedMutation): boolean {
  return item.retryCount >= MAX_RETRIES;
}

export type LocalIdPrefix = 'task' | 'project' | 'message' | 'comment';

export function createLocalId(prefix: LocalIdPrefix): string {
  return `local-${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function isLocalId(id: string): boolean {
  return (
    id.startsWith('local-task-') ||
    id.startsWith('local-project-') ||
    id.startsWith('local-message-') ||
    id.startsWith('local-comment-')
  );
}
