import NetInfo from '@react-native-community/netinfo';

import {
  api,
  type AnalyticsPayload,
  type ChatPayload,
  type CommentPayload,
  type FileDownloadPayload,
  type MessagePayload,
  type NotificationPayload,
  type ProjectPayload,
  type TaskPayload,
  type WorkspacePayload,
} from '@/lib/api';

import { notifyCacheUpdate } from './cache-events';
import { CACHE_KEYS } from './cache-keys';
import {
  invalidateCache,
  isStale,
  listCacheKeys,
  readCache,
  writeCache,
} from './data-cache';
import {
  createLocalId,
  enqueueMutation,
  getMutationQueue,
  isLocalId,
  removeMutation,
  shouldDropMutation,
  updateMutation,
  type CreateCommentPayload,
  type CreateProjectPayload,
  type CreateTaskPayload,
  type MarkAllNotificationsReadPayload,
  type MarkNotificationReadPayload,
  type QueuedMutation,
  type SendMessagePayload,
  type UpdateTaskStatusPayload,
} from './mutation-queue';
import { isAuthError, isNetworkError } from './network-utils';

let isOnline = true;
let flushInProgress = false;

const FILE_METADATA_STALE_MS = 4 * 60 * 1000;

export interface DocumentEntryPayload {
  id: string;
  name: string;
  folder?: string;
  updatedAt?: string;
  author?: string;
  sizeBytes?: number;
  ext?: string;
  pinned?: boolean;
}

export async function checkIsOnline(): Promise<boolean> {
  try {
    const state = await NetInfo.fetch();
    isOnline = state.isConnected === true && state.isInternetReachable !== false;
  } catch {
    isOnline = true;
  }
  return isOnline;
}

export function getOnlineStatus(): boolean {
  return isOnline;
}

function computeTaskCounts(
  projects: ProjectPayload[],
  tasks: TaskPayload[],
): Record<string, { total: number; done: number }> {
  const counts: Record<string, { total: number; done: number }> = {};
  for (const project of projects) {
    counts[project.id] = { total: 0, done: 0 };
  }
  for (const task of tasks) {
    const entry = counts[task.projectId];
    if (!entry) continue;
    entry.total++;
    const status = task.status?.toLowerCase() ?? '';
    if (status === 'done' || status === 'completed' || status === 'closed') {
      entry.done++;
    }
  }
  return counts;
}

function computeAnalytics(tasks: TaskPayload[]): AnalyticsPayload {
  const dist: Record<string, number> = {};
  tasks.forEach((task) => {
    dist[task.status] = (dist[task.status] ?? 0) + 1;
  });
  const isDone = (status: string) => {
    const value = status?.toLowerCase() ?? '';
    return value === 'done' || value === 'completed' || value === 'closed';
  };
  return {
    throughput: tasks.filter((task) => isDone(task.status)).length,
    overdue: tasks.filter(
      (task) => task.dueDate && new Date(task.dueDate) < new Date() && !isDone(task.status),
    ).length,
    totalTasks: tasks.length,
    statusDistribution: dist,
  };
}

function replaceTaskIdInCaches(oldId: string, newTask: TaskPayload): void {
  const mine = readCache<TaskPayload[]>(CACHE_KEYS.tasksMine);
  if (mine) {
    writeCache(
      CACHE_KEYS.tasksMine,
      mine.map((task) => (task.id === oldId ? newTask : task)),
    );
  }

  const projectKey = CACHE_KEYS.tasksProject(newTask.projectId);
  const projectTasks = readCache<TaskPayload[]>(projectKey);
  if (projectTasks) {
    writeCache(
      projectKey,
      projectTasks.map((task) => (task.id === oldId ? newTask : task)),
    );
  }

  remapQueuedTaskId(oldId, newTask.id);
  refreshDerivedCaches();
}

function remapQueuedTaskId(oldId: string, newId: string): void {
  for (const item of getMutationQueue()) {
    if (item.type !== 'updateTaskStatus') continue;
    const payload = item.payload as UpdateTaskStatusPayload;
    if (payload.taskId !== oldId) continue;
    updateMutation({
      ...item,
      payload: { ...payload, taskId: newId },
    });
  }
}

function replaceProjectIdInCaches(oldId: string, newProject: ProjectPayload): void {
  const mine = readCache<ProjectPayload[]>(CACHE_KEYS.projectsMine);
  if (mine) {
    writeCache(
      CACHE_KEYS.projectsMine,
      mine.map((project) => (project.id === oldId ? newProject : project)),
    );
  }

  const workspaceKey = CACHE_KEYS.projectsWorkspace(newProject.workspaceId);
  const workspaceProjects = readCache<ProjectPayload[]>(workspaceKey);
  if (workspaceProjects) {
    writeCache(
      workspaceKey,
      workspaceProjects.map((project) => (project.id === oldId ? newProject : project)),
    );
  }

  const oldProjectTasks = readCache<TaskPayload[]>(CACHE_KEYS.tasksProject(oldId));
  if (oldProjectTasks) {
    writeCache(
      CACHE_KEYS.tasksProject(newProject.id),
      oldProjectTasks.map((task) => ({ ...task, projectId: newProject.id })),
    );
    invalidateCache(CACHE_KEYS.tasksProject(oldId));
  }

  refreshDerivedCaches();
}

function refreshDerivedCaches(): void {
  const projects = readCache<ProjectPayload[]>(CACHE_KEYS.projectsMine) ?? [];
  const tasks = readCache<TaskPayload[]>(CACHE_KEYS.tasksMine) ?? [];
  writeCache(CACHE_KEYS.taskCounts, computeTaskCounts(projects, tasks));

  const workspaceIds = new Set(projects.map((project) => project.workspaceId));
  for (const workspaceId of workspaceIds) {
    const analytics = computeAnalytics(tasks);
    writeCache(CACHE_KEYS.dashboard(workspaceId), analytics);
    writeCache(CACHE_KEYS.analytics(workspaceId), analytics);
  }
}

function upsertTaskInCaches(task: TaskPayload): void {
  const upsert = (list: TaskPayload[]) => {
    const idx = list.findIndex((entry) => entry.id === task.id);
    if (idx >= 0) {
      const next = [...list];
      next[idx] = task;
      return next;
    }
    return [task, ...list];
  };

  const mine = readCache<TaskPayload[]>(CACHE_KEYS.tasksMine) ?? [];
  writeCache(CACHE_KEYS.tasksMine, upsert(mine));

  const projectKey = CACHE_KEYS.tasksProject(task.projectId);
  const projectTasks = readCache<TaskPayload[]>(projectKey) ?? [];
  writeCache(projectKey, upsert(projectTasks));

  refreshDerivedCaches();
}

function upsertProjectInCaches(project: ProjectPayload): void {
  const upsert = (list: ProjectPayload[]) => {
    const idx = list.findIndex((entry) => entry.id === project.id);
    if (idx >= 0) {
      const next = [...list];
      next[idx] = project;
      return next;
    }
    return [project, ...list];
  };

  const mine = readCache<ProjectPayload[]>(CACHE_KEYS.projectsMine) ?? [];
  writeCache(CACHE_KEYS.projectsMine, upsert(mine));

  const workspaceKey = CACHE_KEYS.projectsWorkspace(project.workspaceId);
  const workspaceProjects = readCache<ProjectPayload[]>(workspaceKey) ?? [];
  writeCache(workspaceKey, upsert(workspaceProjects));

  refreshDerivedCaches();
}

function patchTaskStatus(taskId: string, statusId: string): void {
  const patch = (list: TaskPayload[]) =>
    list.map((task) => (task.id === taskId ? { ...task, statusId, status: statusId } : task));

  const mine = readCache<TaskPayload[]>(CACHE_KEYS.tasksMine);
  if (mine) writeCache(CACHE_KEYS.tasksMine, patch(mine));

  for (const task of mine ?? []) {
    if (task.id !== taskId) continue;
    const projectTasks = readCache<TaskPayload[]>(CACHE_KEYS.tasksProject(task.projectId));
    if (projectTasks) {
      writeCache(CACHE_KEYS.tasksProject(task.projectId), patch(projectTasks));
    }
    break;
  }

  refreshDerivedCaches();
}

function chatsListKey(workspaceId?: string): string {
  return workspaceId ? CACHE_KEYS.chatsWorkspace(workspaceId) : CACHE_KEYS.chatsGlobal;
}

function mergeMessages(existing: MessagePayload[], incoming: MessagePayload[]): MessagePayload[] {
  const byId = new Map<string, MessagePayload>();
  for (const msg of existing) byId.set(msg.id, msg);
  for (const msg of incoming) byId.set(msg.id, msg);
  return [...byId.values()].sort((a, b) => {
    const ta = a.createdAt ? Date.parse(a.createdAt) : 0;
    const tb = b.createdAt ? Date.parse(b.createdAt) : 0;
    return ta - tb;
  });
}

function upsertMessageInCache(chatId: string, message: MessagePayload): void {
  const key = CACHE_KEYS.chatMessages(chatId);
  const existing = readCache<MessagePayload[]>(key) ?? [];
  writeCache(key, mergeMessages(existing, [message]));
}

function replaceMessageIdInCaches(chatId: string, oldId: string, newMessage: MessagePayload): void {
  const key = CACHE_KEYS.chatMessages(chatId);
  const existing = readCache<MessagePayload[]>(key);
  if (existing) {
    writeCache(
      key,
      existing.map((msg) => (msg.id === oldId ? newMessage : msg)),
    );
  }
}

function touchChatLastMessage(chatId: string, at?: string): void {
  const ts = at ?? new Date().toISOString();
  const patch = (list: ChatPayload[]) =>
    list.map((ch) => (ch.id === chatId ? { ...ch, lastMessageAt: ts } : ch));

  const global = readCache<ChatPayload[]>(CACHE_KEYS.chatsGlobal);
  if (global) writeCache(CACHE_KEYS.chatsGlobal, patch(global));

  for (const key of listCacheKeys()) {
    if (!key.startsWith('julow.cache.v1.chats.workspace.')) continue;
    const list = readCache<ChatPayload[]>(key);
    if (list) writeCache(key, patch(list));
  }
}

function upsertCommentInCache(taskId: string, comment: CommentPayload): void {
  const key = CACHE_KEYS.commentsTask(taskId);
  const existing = readCache<CommentPayload[]>(key) ?? [];
  const idx = existing.findIndex((c) => c.id === comment.id);
  if (idx >= 0) {
    const next = [...existing];
    next[idx] = comment;
    writeCache(key, next);
    return;
  }
  writeCache(key, [...existing, comment]);
}

function replaceCommentIdInCaches(taskId: string, oldId: string, newComment: CommentPayload): void {
  const key = CACHE_KEYS.commentsTask(taskId);
  const existing = readCache<CommentPayload[]>(key);
  if (existing) {
    writeCache(
      key,
      existing.map((c) => (c.id === oldId ? newComment : c)),
    );
  }
}

function patchNotificationRead(notificationId: string, isRead = true): void {
  const key = CACHE_KEYS.notifications;
  const list = readCache<NotificationPayload[]>(key);
  if (!list) return;
  writeCache(
    key,
    list.map((n) => (n.id === notificationId ? { ...n, isRead } : n)),
  );
}

function patchAllNotificationsRead(): void {
  const key = CACHE_KEYS.notifications;
  const list = readCache<NotificationPayload[]>(key);
  if (!list) return;
  writeCache(key, list.map((n) => ({ ...n, isRead: true })));
}

async function processMutation(item: QueuedMutation): Promise<void> {
  if (item.type === 'createTask') {
    const payload = item.payload as CreateTaskPayload;
    const { statusId, ...createPayload } = payload;
    const created = await api.createTask(createPayload);
    if (statusId) {
      await api.updateTaskStatus(created.id, statusId);
      patchTaskStatus(created.id, statusId);
    }
    if (item.localId) {
      replaceTaskIdInCaches(item.localId, created);
    } else {
      upsertTaskInCaches(created);
    }
    return;
  }

  if (item.type === 'createProject') {
    const payload = item.payload as CreateProjectPayload;
    const created = await api.createProject(payload);
    if (item.localId) {
      replaceProjectIdInCaches(item.localId, created);
    } else {
      upsertProjectInCaches(created);
    }
    return;
  }

  if (item.type === 'updateTaskStatus') {
    const payload = item.payload as UpdateTaskStatusPayload;
    if (isLocalId(payload.taskId)) {
      throw new Error('Task not synced yet');
    }
    await api.updateTaskStatus(payload.taskId, payload.statusId);
    patchTaskStatus(payload.taskId, payload.statusId);
    return;
  }

  if (item.type === 'sendMessage') {
    const payload = item.payload as SendMessagePayload;
    const created = await api.sendMessage(payload.chatId, {
      content: payload.content,
      contentFormat: payload.contentFormat,
      messageType: payload.messageType,
    });
    if (item.localId) {
      replaceMessageIdInCaches(payload.chatId, item.localId, created);
    } else {
      upsertMessageInCache(payload.chatId, created);
    }
    touchChatLastMessage(payload.chatId, created.createdAt);
    return;
  }

  if (item.type === 'createComment') {
    const payload = item.payload as CreateCommentPayload;
    const created = await api.addComment({
      targetType: payload.targetType,
      targetId: payload.targetId,
      content: payload.content,
      contentFormat: payload.contentFormat,
      parentCommentId: payload.parentCommentId,
    });
    if (payload.targetType === 'task') {
      if (item.localId) {
        replaceCommentIdInCaches(payload.targetId, item.localId, created);
      } else {
        upsertCommentInCache(payload.targetId, created);
      }
    }
    return;
  }

  if (item.type === 'markNotificationRead') {
    const payload = item.payload as MarkNotificationReadPayload;
    await api.markNotificationRead(payload.notificationId);
    patchNotificationRead(payload.notificationId);
    return;
  }

  if (item.type === 'markAllNotificationsRead') {
    const payload = item.payload as MarkAllNotificationsReadPayload;
    await api.markAllNotificationsRead(payload.workspaceId);
    patchAllNotificationsRead();
  }
}

export async function flushMutationQueue(): Promise<void> {
  if (flushInProgress) return;
  await checkIsOnline();
  if (!isOnline) return;

  flushInProgress = true;
  try {
    const queue = getMutationQueue();
    for (const item of queue) {
      try {
        await processMutation(item);
        removeMutation(item.id);
        notifyCacheUpdate();
      } catch (err) {
        if (isAuthError(err)) break;
        if (isNetworkError(err)) break;

        const next = { ...item, retryCount: item.retryCount + 1 };
        if (shouldDropMutation(next)) {
          removeMutation(item.id);
        } else {
          updateMutation(next);
        }
      }
    }
  } finally {
    flushInProgress = false;
  }
}

export async function refreshFromNetwork(): Promise<void> {
  await checkIsOnline();
  if (!isOnline) return;

  try {
    const [workspaces, projects, tasks] = await Promise.all([
      api.getWorkspaces(),
      api.getMyProjects(),
      api.getTasks(),
    ]);

    writeCache(CACHE_KEYS.workspaces, workspaces);
    writeCache(CACHE_KEYS.projectsMine, projects);
    writeCache(CACHE_KEYS.tasksMine, tasks);
    writeCache(CACHE_KEYS.taskCounts, computeTaskCounts(projects, tasks));

    const byWorkspace = new Map<string, ProjectPayload[]>();
    for (const project of projects) {
      const list = byWorkspace.get(project.workspaceId) ?? [];
      list.push(project);
      byWorkspace.set(project.workspaceId, list);
    }
    for (const [workspaceId, list] of byWorkspace) {
      writeCache(CACHE_KEYS.projectsWorkspace(workspaceId), list);
      writeCache(CACHE_KEYS.dashboard(workspaceId), computeAnalytics(tasks));
    }

    notifyCacheUpdate();
  } catch (err) {
    if (!isNetworkError(err)) {
      console.warn('[cache] refreshFromNetwork failed', err);
    }
  }
}

async function revalidateWorkspaces(force = false): Promise<WorkspacePayload[]> {
  if (!force && !isStale(CACHE_KEYS.workspaces)) {
    return readCache<WorkspacePayload[]>(CACHE_KEYS.workspaces) ?? [];
  }
  await checkIsOnline();
  if (!isOnline) {
    return readCache<WorkspacePayload[]>(CACHE_KEYS.workspaces) ?? [];
  }
  try {
    const data = await api.getWorkspaces();
    writeCache(CACHE_KEYS.workspaces, data);
    notifyCacheUpdate();
    return data;
  } catch (err) {
    if (isNetworkError(err)) {
      return readCache<WorkspacePayload[]>(CACHE_KEYS.workspaces) ?? [];
    }
    throw err;
  }
}

async function revalidateMyProjects(force = false): Promise<ProjectPayload[]> {
  if (!force && !isStale(CACHE_KEYS.projectsMine)) {
    return readCache<ProjectPayload[]>(CACHE_KEYS.projectsMine) ?? [];
  }
  await checkIsOnline();
  if (!isOnline) {
    return readCache<ProjectPayload[]>(CACHE_KEYS.projectsMine) ?? [];
  }
  try {
    const data = await api.getMyProjects();
    writeCache(CACHE_KEYS.projectsMine, data);
    refreshDerivedCaches();
    notifyCacheUpdate();
    return data;
  } catch (err) {
    if (isNetworkError(err)) {
      return readCache<ProjectPayload[]>(CACHE_KEYS.projectsMine) ?? [];
    }
    throw err;
  }
}

async function revalidateWorkspaceProjects(
  workspaceId: string,
  force = false,
): Promise<ProjectPayload[]> {
  const key = CACHE_KEYS.projectsWorkspace(workspaceId);
  if (!force && !isStale(key)) {
    return readCache<ProjectPayload[]>(key) ?? [];
  }
  await checkIsOnline();
  if (!isOnline) {
    return readCache<ProjectPayload[]>(key) ?? [];
  }
  try {
    const data = await api.getProjects(workspaceId);
    writeCache(key, data);
    notifyCacheUpdate();
    return data;
  } catch (err) {
    if (isNetworkError(err)) {
      return readCache<ProjectPayload[]>(key) ?? [];
    }
    throw err;
  }
}

async function revalidateTasks(force = false): Promise<TaskPayload[]> {
  if (!force && !isStale(CACHE_KEYS.tasksMine)) {
    return readCache<TaskPayload[]>(CACHE_KEYS.tasksMine) ?? [];
  }
  await checkIsOnline();
  if (!isOnline) {
    return readCache<TaskPayload[]>(CACHE_KEYS.tasksMine) ?? [];
  }
  try {
    const data = await api.getTasks();
    writeCache(CACHE_KEYS.tasksMine, data);
    refreshDerivedCaches();
    notifyCacheUpdate();
    return data;
  } catch (err) {
    if (isNetworkError(err)) {
      return readCache<TaskPayload[]>(CACHE_KEYS.tasksMine) ?? [];
    }
    throw err;
  }
}

async function revalidateProjectTasks(
  workspaceId: string,
  projectId: string,
  force = false,
): Promise<TaskPayload[]> {
  const key = CACHE_KEYS.tasksProject(projectId);
  if (!force && !isStale(key)) {
    return readCache<TaskPayload[]>(key) ?? [];
  }
  await checkIsOnline();
  if (!isOnline) {
    return readCache<TaskPayload[]>(key) ?? [];
  }
  try {
    const data = await api.getProjectTasks(workspaceId, projectId);
    writeCache(key, data);
    notifyCacheUpdate();
    return data;
  } catch (err) {
    if (isNetworkError(err)) {
      return readCache<TaskPayload[]>(key) ?? [];
    }
    throw err;
  }
}

async function revalidateChats(workspaceId?: string, force = false): Promise<ChatPayload[]> {
  const key = chatsListKey(workspaceId);
  if (!force && !isStale(key)) {
    return readCache<ChatPayload[]>(key) ?? [];
  }
  await checkIsOnline();
  if (!isOnline) {
    return readCache<ChatPayload[]>(key) ?? [];
  }
  try {
    const data = workspaceId ? await api.getChats(workspaceId) : await api.listChats();
    writeCache(key, data);
    notifyCacheUpdate();
    return data;
  } catch (err) {
    if (isNetworkError(err)) {
      return readCache<ChatPayload[]>(key) ?? [];
    }
    throw err;
  }
}

async function revalidateChat(chatId: string, force = false): Promise<ChatPayload | null> {
  const key = CACHE_KEYS.chatDetail(chatId);
  if (!force && !isStale(key)) {
    return readCache<ChatPayload>(key);
  }
  await checkIsOnline();
  if (!isOnline) {
    return readCache<ChatPayload>(key);
  }
  try {
    const data = await api.getChat(chatId);
    writeCache(key, data);
    notifyCacheUpdate();
    return data;
  } catch (err) {
    if (isNetworkError(err)) {
      return readCache<ChatPayload>(key);
    }
    throw err;
  }
}

async function revalidateChatMessages(chatId: string, limit = 100, force = false): Promise<MessagePayload[]> {
  const key = CACHE_KEYS.chatMessages(chatId);
  if (!force && !isStale(key)) {
    return readCache<MessagePayload[]>(key) ?? [];
  }
  await checkIsOnline();
  if (!isOnline) {
    return readCache<MessagePayload[]>(key) ?? [];
  }
  try {
    const data = await api.getChatMessages(chatId, limit);
    const cached = readCache<MessagePayload[]>(key) ?? [];
    const merged = mergeMessages(cached, data);
    writeCache(key, merged);
    notifyCacheUpdate();
    return merged;
  } catch (err) {
    if (isNetworkError(err)) {
      return readCache<MessagePayload[]>(key) ?? [];
    }
    throw err;
  }
}

async function revalidateNotifications(force = false): Promise<NotificationPayload[]> {
  const key = CACHE_KEYS.notifications;
  if (!force && !isStale(key)) {
    return readCache<NotificationPayload[]>(key) ?? [];
  }
  await checkIsOnline();
  if (!isOnline) {
    return readCache<NotificationPayload[]>(key) ?? [];
  }
  try {
    const data = await api.getNotifications({ limit: 50 });
    writeCache(key, data);
    notifyCacheUpdate();
    return data;
  } catch (err) {
    if (isNetworkError(err)) {
      return readCache<NotificationPayload[]>(key) ?? [];
    }
    throw err;
  }
}

async function revalidateTaskComments(taskId: string, force = false): Promise<CommentPayload[]> {
  const key = CACHE_KEYS.commentsTask(taskId);
  if (!force && !isStale(key)) {
    return readCache<CommentPayload[]>(key) ?? [];
  }
  await checkIsOnline();
  if (!isOnline) {
    return readCache<CommentPayload[]>(key) ?? [];
  }
  try {
    const data = await api.listComments('task', taskId);
    writeCache(key, data);
    notifyCacheUpdate();
    return data;
  } catch (err) {
    if (isNetworkError(err)) {
      return readCache<CommentPayload[]>(key) ?? [];
    }
    throw err;
  }
}

async function revalidateFileMetadata(fileId: string, force = false): Promise<FileDownloadPayload | null> {
  const key = CACHE_KEYS.fileMetadata(fileId);
  if (!force && !isStale(key, FILE_METADATA_STALE_MS)) {
    return readCache<FileDownloadPayload>(key);
  }
  await checkIsOnline();
  if (!isOnline) {
    return readCache<FileDownloadPayload>(key);
  }
  try {
    const data = await api.getFileDownloadUrl(fileId);
    writeCache(key, data);
    notifyCacheUpdate();
    return data;
  } catch (err) {
    if (isNetworkError(err)) {
      return readCache<FileDownloadPayload>(key);
    }
    throw err;
  }
}

function parseCacheKeyForRefresh(key: string): (() => Promise<void>) | null {
  if (key === CACHE_KEYS.mutationQueue) return null;

  if (key === CACHE_KEYS.workspaces) {
    return async () => { await revalidateWorkspaces(true); };
  }
  if (key === CACHE_KEYS.projectsMine) {
    return async () => { await revalidateMyProjects(true); };
  }
  if (key === CACHE_KEYS.tasksMine) {
    return async () => { await revalidateTasks(true); };
  }
  if (key === CACHE_KEYS.taskCounts) {
    return async () => {
      const [projects, tasks] = await Promise.all([
        revalidateMyProjects(true),
        revalidateTasks(true),
      ]);
      writeCache(CACHE_KEYS.taskCounts, computeTaskCounts(projects, tasks));
    };
  }
  if (key === CACHE_KEYS.notifications) {
    return async () => { await revalidateNotifications(true); };
  }
  if (key === CACHE_KEYS.chatsGlobal) {
    return async () => { await revalidateChats(undefined, true); };
  }

  const wsProjects = key.match(/^julow\.cache\.v1\.projects\.workspace\.(.+)$/);
  if (wsProjects) {
    const workspaceId = wsProjects[1];
    return async () => { await revalidateWorkspaceProjects(workspaceId, true); };
  }

  const projectTasks = key.match(/^julow\.cache\.v1\.tasks\.project\.(.+)$/);
  if (projectTasks) {
    return null;
  }

  const dashboard = key.match(/^julow\.cache\.v1\.dashboard\.(.+)$/);
  if (dashboard) {
    return async () => {
      await revalidateTasks(true);
      refreshDerivedCaches();
    };
  }

  const analytics = key.match(/^julow\.cache\.v1\.analytics\.(.+)$/);
  if (analytics) {
    return async () => {
      await revalidateTasks(true);
      refreshDerivedCaches();
    };
  }

  const chatsWs = key.match(/^julow\.cache\.v1\.chats\.workspace\.(.+)$/);
  if (chatsWs) {
    const workspaceId = chatsWs[1];
    return async () => { await revalidateChats(workspaceId, true); };
  }

  const chatDetail = key.match(/^julow\.cache\.v1\.chat\.(?!messages\.)(.+)$/);
  if (chatDetail) {
    const chatId = chatDetail[1];
    return async () => { await revalidateChat(chatId, true); };
  }

  const chatMessages = key.match(/^julow\.cache\.v1\.chat\.messages\.(.+)$/);
  if (chatMessages) {
    const chatId = chatMessages[1];
    return async () => { await revalidateChatMessages(chatId, 100, true); };
  }

  const comments = key.match(/^julow\.cache\.v1\.comments\.task\.(.+)$/);
  if (comments) {
    const taskId = comments[1];
    return async () => { await revalidateTaskComments(taskId, true); };
  }

  const fileMeta = key.match(/^julow\.cache\.v1\.file\.(.+)$/);
  if (fileMeta) {
    const fileId = fileMeta[1];
    return async () => { await revalidateFileMetadata(fileId, true); };
  }

  return null;
}

function isKeyStale(key: string): boolean {
  if (key.startsWith('julow.cache.v1.file.')) {
    return isStale(key, FILE_METADATA_STALE_MS);
  }
  return isStale(key);
}

/** Incremental sync: refresh only stale cache entries (TTL-based). */
export async function refreshStaleCaches(): Promise<void> {
  await checkIsOnline();
  if (!isOnline) return;

  const staleRefreshers: Array<() => Promise<void>> = [];
  for (const key of listCacheKeys()) {
    if (key === CACHE_KEYS.mutationQueue) continue;
    if (!isKeyStale(key)) continue;
    const refresher = parseCacheKeyForRefresh(key);
    if (refresher) staleRefreshers.push(refresher);
  }

  if (staleRefreshers.length === 0) return;

  const BATCH_SIZE = 4;
  for (let i = 0; i < staleRefreshers.length; i += BATCH_SIZE) {
    const batch = staleRefreshers.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map(async (fn) => {
        try {
          await fn();
        } catch (err) {
          if (!isNetworkError(err)) {
            console.warn('[cache] stale refresh failed', err);
          }
        }
      }),
    );
  }
  notifyCacheUpdate();
}

export const cachedApi = {
  getWorkspacesSync: (): WorkspacePayload[] =>
    readCache<WorkspacePayload[]>(CACHE_KEYS.workspaces) ?? [],

  getMyProjectsSync: (): ProjectPayload[] =>
    readCache<ProjectPayload[]>(CACHE_KEYS.projectsMine) ?? [],

  getProjectsSync: (workspaceId: string): ProjectPayload[] =>
    readCache<ProjectPayload[]>(CACHE_KEYS.projectsWorkspace(workspaceId)) ?? [],

  getTasksSync: (): TaskPayload[] =>
    readCache<TaskPayload[]>(CACHE_KEYS.tasksMine) ?? [],

  getProjectTasksSync: (projectId: string): TaskPayload[] =>
    readCache<TaskPayload[]>(CACHE_KEYS.tasksProject(projectId)) ?? [],

  getTaskCountsSync: (): Record<string, { total: number; done: number }> =>
    readCache<Record<string, { total: number; done: number }>>(CACHE_KEYS.taskCounts) ?? {},

  getAnalyticsSync: (workspaceId: string): AnalyticsPayload | null =>
    readCache<AnalyticsPayload>(CACHE_KEYS.dashboard(workspaceId)) ??
    readCache<AnalyticsPayload>(CACHE_KEYS.analytics(workspaceId)),

  getChatsSync: (workspaceId?: string): ChatPayload[] =>
    readCache<ChatPayload[]>(chatsListKey(workspaceId)) ?? [],

  getChatSync: (chatId: string): ChatPayload | null =>
    readCache<ChatPayload>(CACHE_KEYS.chatDetail(chatId)),

  getChatMessagesSync: (chatId: string): MessagePayload[] =>
    readCache<MessagePayload[]>(CACHE_KEYS.chatMessages(chatId)) ?? [],

  getNotificationsSync: (): NotificationPayload[] =>
    readCache<NotificationPayload[]>(CACHE_KEYS.notifications) ?? [],

  getTaskCommentsSync: (taskId: string): CommentPayload[] =>
    readCache<CommentPayload[]>(CACHE_KEYS.commentsTask(taskId)) ?? [],

  getDocumentsSync: (workspaceId: string): DocumentEntryPayload[] =>
    readCache<DocumentEntryPayload[]>(CACHE_KEYS.documents(workspaceId)) ?? [],

  getFileMetadataSync: (fileId: string): FileDownloadPayload | null =>
    readCache<FileDownloadPayload>(CACHE_KEYS.fileMetadata(fileId)),

  getWorkspaces: async (options?: { force?: boolean }): Promise<WorkspacePayload[]> => {
    const cached = readCache<WorkspacePayload[]>(CACHE_KEYS.workspaces);
    if (cached && !options?.force) {
      if (isStale(CACHE_KEYS.workspaces)) {
        void revalidateWorkspaces();
      }
      return cached;
    }
    return revalidateWorkspaces(options?.force);
  },

  getMyProjects: async (options?: { force?: boolean }): Promise<ProjectPayload[]> => {
    const cached = readCache<ProjectPayload[]>(CACHE_KEYS.projectsMine);
    if (cached && !options?.force) {
      if (isStale(CACHE_KEYS.projectsMine)) {
        void revalidateMyProjects();
      }
      return cached;
    }
    return revalidateMyProjects(options?.force);
  },

  getProjects: async (
    workspaceId: string,
    options?: { force?: boolean },
  ): Promise<ProjectPayload[]> => {
    const key = CACHE_KEYS.projectsWorkspace(workspaceId);
    const cached = readCache<ProjectPayload[]>(key);
    if (cached && !options?.force) {
      if (isStale(key)) {
        void revalidateWorkspaceProjects(workspaceId);
      }
      return cached;
    }
    return revalidateWorkspaceProjects(workspaceId, options?.force);
  },

  getTasks: async (options?: { force?: boolean }): Promise<TaskPayload[]> => {
    const cached = readCache<TaskPayload[]>(CACHE_KEYS.tasksMine);
    if (cached && !options?.force) {
      if (isStale(CACHE_KEYS.tasksMine)) {
        void revalidateTasks();
      }
      return cached;
    }
    return revalidateTasks(options?.force);
  },

  getProjectTasks: async (
    workspaceId: string,
    projectId: string,
    options?: { force?: boolean },
  ): Promise<TaskPayload[]> => {
    const key = CACHE_KEYS.tasksProject(projectId);
    const cached = readCache<TaskPayload[]>(key);
    if (cached && !options?.force) {
      if (isStale(key)) {
        void revalidateProjectTasks(workspaceId, projectId);
      }
      return cached;
    }
    return revalidateProjectTasks(workspaceId, projectId, options?.force);
  },

  getAnalytics: async (workspaceId?: string, options?: { force?: boolean }): Promise<AnalyticsPayload> => {
    if (workspaceId) {
      const cached = readCache<AnalyticsPayload>(CACHE_KEYS.dashboard(workspaceId));
      if (cached && !options?.force) {
        if (isStale(CACHE_KEYS.tasksMine)) {
          void revalidateTasks().then(() => notifyCacheUpdate());
        }
        return cached;
      }
    }
    const tasks = await cachedApi.getTasks(options);
    return computeAnalytics(tasks);
  },

  getTaskCounts: async (options?: { force?: boolean }): Promise<Record<string, { total: number; done: number }>> => {
    const cached = readCache<Record<string, { total: number; done: number }>>(CACHE_KEYS.taskCounts);
    if (cached && !options?.force) {
      if (isStale(CACHE_KEYS.tasksMine)) {
        void revalidateTasks();
      }
      return cached;
    }
    const [projects, tasks] = await Promise.all([
      cachedApi.getMyProjects(options),
      cachedApi.getTasks(options),
    ]);
    const counts = computeTaskCounts(projects, tasks);
    writeCache(CACHE_KEYS.taskCounts, counts);
    return counts;
  },

  listChats: async (options?: { force?: boolean }): Promise<ChatPayload[]> => {
    const key = CACHE_KEYS.chatsGlobal;
    const cached = readCache<ChatPayload[]>(key);
    if (cached && !options?.force) {
      if (isStale(key)) void revalidateChats(undefined);
      return cached;
    }
    return revalidateChats(undefined, options?.force);
  },

  getChats: async (workspaceId: string, options?: { force?: boolean }): Promise<ChatPayload[]> => {
    const key = chatsListKey(workspaceId);
    const cached = readCache<ChatPayload[]>(key);
    if (cached && !options?.force) {
      if (isStale(key)) void revalidateChats(workspaceId);
      return cached;
    }
    return revalidateChats(workspaceId, options?.force);
  },

  getChat: async (chatId: string, options?: { force?: boolean }): Promise<ChatPayload | null> => {
    const key = CACHE_KEYS.chatDetail(chatId);
    const cached = readCache<ChatPayload>(key);
    if (cached && !options?.force) {
      if (isStale(key)) void revalidateChat(chatId);
      return cached;
    }
    return revalidateChat(chatId, options?.force);
  },

  getChatMessages: async (
    chatId: string,
    limit = 100,
    options?: { force?: boolean },
  ): Promise<MessagePayload[]> => {
    const key = CACHE_KEYS.chatMessages(chatId);
    const cached = readCache<MessagePayload[]>(key);
    if (cached && !options?.force) {
      if (isStale(key)) void revalidateChatMessages(chatId, limit);
      return cached;
    }
    return revalidateChatMessages(chatId, limit, options?.force);
  },

  mergeChatMessages: (chatId: string, incoming: MessagePayload[]): MessagePayload[] => {
    const key = CACHE_KEYS.chatMessages(chatId);
    const existing = readCache<MessagePayload[]>(key) ?? [];
    const merged = mergeMessages(existing, incoming);
    writeCache(key, merged);
    notifyCacheUpdate();
    return merged;
  },

  sendMessage: async (
    chatId: string,
    content: string,
    options?: { senderId?: string; contentFormat?: 'markdown' | 'plain'; messageType?: string },
  ): Promise<MessagePayload> => {
    await checkIsOnline();

    if (isOnline) {
      try {
        const created = await api.sendMessage(chatId, {
          content,
          contentFormat: options?.contentFormat,
          messageType: options?.messageType,
        });
        upsertMessageInCache(chatId, created);
        touchChatLastMessage(chatId, created.createdAt);
        notifyCacheUpdate();
        return created;
      } catch (err) {
        if (!isNetworkError(err)) throw err;
      }
    }

    const localId = createLocalId('message');
    const optimistic: MessagePayload = {
      id: localId,
      chatId,
      senderId: options?.senderId ?? '',
      content,
      contentFormat: options?.contentFormat ?? 'markdown',
      messageType: options?.messageType ?? 'text',
      attachments: [],
      reactions: [],
      isEdited: false,
      isDeleted: false,
      createdAt: new Date().toISOString(),
    };
    upsertMessageInCache(chatId, optimistic);
    touchChatLastMessage(chatId, optimistic.createdAt);
    enqueueMutation(
      'sendMessage',
      {
        chatId,
        content,
        contentFormat: options?.contentFormat,
        messageType: options?.messageType,
        senderId: options?.senderId,
      },
      localId,
    );
    notifyCacheUpdate();
    void flushMutationQueue();
    return optimistic;
  },

  getNotifications: async (options?: {
    force?: boolean;
    limit?: number;
  }): Promise<NotificationPayload[]> => {
    const key = CACHE_KEYS.notifications;
    const cached = readCache<NotificationPayload[]>(key);
    if (cached && !options?.force) {
      if (isStale(key)) void revalidateNotifications();
      return cached.filter((n) => !n.isArchived);
    }
    const data = await revalidateNotifications(options?.force);
    return data.filter((n) => !n.isArchived);
  },

  markNotificationRead: async (notificationId: string): Promise<void> => {
    patchNotificationRead(notificationId);
    notifyCacheUpdate();

    await checkIsOnline();
    if (!isOnline) {
      enqueueMutation('markNotificationRead', { notificationId });
      void flushMutationQueue();
      return;
    }

    try {
      await api.markNotificationRead(notificationId);
    } catch (err) {
      if (isNetworkError(err)) {
        enqueueMutation('markNotificationRead', { notificationId });
        void flushMutationQueue();
        return;
      }
      throw err;
    }
  },

  markAllNotificationsRead: async (workspaceId?: string): Promise<void> => {
    patchAllNotificationsRead();
    notifyCacheUpdate();

    await checkIsOnline();
    if (!isOnline) {
      enqueueMutation('markAllNotificationsRead', { workspaceId });
      void flushMutationQueue();
      return;
    }

    try {
      await api.markAllNotificationsRead(workspaceId);
    } catch (err) {
      if (isNetworkError(err)) {
        enqueueMutation('markAllNotificationsRead', { workspaceId });
        void flushMutationQueue();
        return;
      }
      throw err;
    }
  },

  listComments: async (
    targetType: 'task' | 'project' | 'epic' | 'sprint',
    targetId: string,
    options?: { force?: boolean },
  ): Promise<CommentPayload[]> => {
    if (targetType !== 'task') {
      await checkIsOnline();
      if (!isOnline) return [];
      try {
        return await api.listComments(targetType, targetId);
      } catch (err) {
        if (isNetworkError(err)) return [];
        throw err;
      }
    }

    const key = CACHE_KEYS.commentsTask(targetId);
    const cached = readCache<CommentPayload[]>(key);
    if (cached && !options?.force) {
      if (isStale(key)) void revalidateTaskComments(targetId);
      return cached;
    }
    return revalidateTaskComments(targetId, options?.force);
  },

  addComment: async (payload: CreateCommentPayload): Promise<CommentPayload> => {
    await checkIsOnline();

    if (isOnline) {
      try {
        const created = await api.addComment({
          targetType: payload.targetType,
          targetId: payload.targetId,
          content: payload.content,
          contentFormat: payload.contentFormat,
          parentCommentId: payload.parentCommentId,
        });
        if (payload.targetType === 'task') {
          upsertCommentInCache(payload.targetId, created);
        }
        notifyCacheUpdate();
        return created;
      } catch (err) {
        if (!isNetworkError(err)) throw err;
      }
    }

    const localId = createLocalId('comment');
    const optimistic: CommentPayload = {
      id: localId,
      targetType: payload.targetType,
      targetId: payload.targetId,
      authorId: payload.authorId ?? '',
      content: payload.content,
      contentFormat: payload.contentFormat ?? 'markdown',
      parentCommentId: payload.parentCommentId,
      attachments: [],
      createdAt: new Date().toISOString(),
      isPinned: false,
    };
    if (payload.targetType === 'task') {
      upsertCommentInCache(payload.targetId, optimistic);
    }
    enqueueMutation('createComment', payload, localId);
    notifyCacheUpdate();
    void flushMutationQueue();
    return optimistic;
  },

  getFileDownloadUrl: async (
    fileId: string,
    options?: { force?: boolean },
  ): Promise<FileDownloadPayload | null> => {
    const key = CACHE_KEYS.fileMetadata(fileId);
    const cached = readCache<FileDownloadPayload>(key);
    if (cached && !options?.force) {
      if (isStale(key, FILE_METADATA_STALE_MS)) void revalidateFileMetadata(fileId);
      return cached;
    }
    return revalidateFileMetadata(fileId, options?.force);
  },

  setDocuments: (workspaceId: string, documents: DocumentEntryPayload[]): void => {
    writeCache(CACHE_KEYS.documents(workspaceId), documents);
    notifyCacheUpdate();
  },

  createTask: async (payload: CreateTaskPayload): Promise<TaskPayload> => {
    await checkIsOnline();

    const { statusId, ...createPayload } = payload;

    if (isOnline) {
      try {
        const created = await api.createTask(createPayload);
        let result = created;
        if (statusId) {
          await api.updateTaskStatus(created.id, statusId);
          result = { ...created, statusId };
          patchTaskStatus(created.id, statusId);
        }
        upsertTaskInCaches(result);
        notifyCacheUpdate();
        void revalidateProjectTasks(payload.workspaceId, payload.projectId);
        return result;
      } catch (err) {
        if (!isNetworkError(err)) throw err;
      }
    }

    const localId = createLocalId('task');
    const optimistic: TaskPayload = {
      id: localId,
      title: payload.title,
      status: 'todo',
      statusId: statusId,
      priority: payload.priority ?? 'medium',
      labels: [],
      projectId: payload.projectId,
      taskType: payload.taskType ?? 'TASK',
      assigneeIds: payload.assigneeIds ?? [],
      dueDate: payload.dueDate,
      startDate: payload.startDate,
      createdAt: new Date().toISOString(),
    };
    upsertTaskInCaches(optimistic);
    enqueueMutation('createTask', payload, localId);
    notifyCacheUpdate();
    void flushMutationQueue();
    return optimistic;
  },

  createProject: async (payload: CreateProjectPayload): Promise<ProjectPayload> => {
    await checkIsOnline();

    if (isOnline) {
      try {
        const created = await api.createProject(payload);
        upsertProjectInCaches(created);
        notifyCacheUpdate();
        return created;
      } catch (err) {
        if (!isNetworkError(err)) throw err;
      }
    }

    const localId = createLocalId('project');
    const optimistic: ProjectPayload = {
      id: localId,
      workspaceId: payload.workspaceId,
      name: payload.name,
      description: payload.description,
      status: 'active',
      methodology: 'kanban',
      ownerIds: [],
    };
    upsertProjectInCaches(optimistic);
    enqueueMutation('createProject', payload, localId);
    notifyCacheUpdate();
    void flushMutationQueue();
    return optimistic;
  },

  updateTaskStatus: async (taskId: string, statusId: string): Promise<void> => {
    patchTaskStatus(taskId, statusId);
    notifyCacheUpdate();

    await checkIsOnline();
    if (isLocalId(taskId) || !isOnline) {
      enqueueMutation('updateTaskStatus', { taskId, statusId });
      void flushMutationQueue();
      return;
    }

    try {
      await api.updateTaskStatus(taskId, statusId);
    } catch (err) {
      if (isNetworkError(err)) {
        enqueueMutation('updateTaskStatus', { taskId, statusId });
        void flushMutationQueue();
        return;
      }
      throw err;
    }
  },

  refreshAll: async (): Promise<void> => {
    invalidateCache(CACHE_KEYS.workspaces);
    invalidateCache(CACHE_KEYS.projectsMine);
    invalidateCache(CACHE_KEYS.tasksMine);
    invalidateCache(CACHE_KEYS.taskCounts);
    invalidateCache(CACHE_KEYS.notifications);
    invalidateCache(CACHE_KEYS.chatsGlobal);
    invalidateCache(CACHE_KEYS.chatUnreadMap);
    for (const key of listCacheKeys()) {
      if (
        key.startsWith('julow.cache.v1.projects.workspace.') ||
        key.startsWith('julow.cache.v1.tasks.project.') ||
        key.startsWith('julow.cache.v1.dashboard.') ||
        key.startsWith('julow.cache.v1.analytics.') ||
        key.startsWith('julow.cache.v1.chats.workspace.') ||
        key.startsWith('julow.cache.v1.chat.') ||
        key.startsWith('julow.cache.v1.comments.task.') ||
        key.startsWith('julow.cache.v1.documents.')
      ) {
        invalidateCache(key);
      }
    }
    await checkIsOnline();
    if (isOnline) {
      try {
        const [workspaces, projects, tasks] = await Promise.all([
          api.getWorkspaces(),
          api.getMyProjects(),
          api.getTasks(),
        ]);
        writeCache(CACHE_KEYS.workspaces, workspaces);
        writeCache(CACHE_KEYS.projectsMine, projects);
        writeCache(CACHE_KEYS.tasksMine, tasks);
        writeCache(CACHE_KEYS.taskCounts, computeTaskCounts(projects, tasks));
        const byWorkspace = new Map<string, ProjectPayload[]>();
        for (const project of projects) {
          const list = byWorkspace.get(project.workspaceId) ?? [];
          list.push(project);
          byWorkspace.set(project.workspaceId, list);
        }
        for (const [workspaceId, list] of byWorkspace) {
          writeCache(CACHE_KEYS.projectsWorkspace(workspaceId), list);
          const analytics = computeAnalytics(tasks);
          writeCache(CACHE_KEYS.dashboard(workspaceId), analytics);
          writeCache(CACHE_KEYS.analytics(workspaceId), analytics);
        }
        notifyCacheUpdate();
      } catch (err) {
        if (!isNetworkError(err)) {
          console.warn('[cache] refreshAll failed', err);
        }
      }
    }
    await flushMutationQueue();
  },
};
