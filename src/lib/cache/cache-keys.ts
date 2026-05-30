export const CACHE_VERSION = 1;

export const CACHE_KEYS = {
  workspaces: 'julow.cache.v1.workspaces',
  projectsMine: 'julow.cache.v1.projects.mine',
  projectsWorkspace: (workspaceId: string) => `julow.cache.v1.projects.workspace.${workspaceId}`,
  tasksMine: 'julow.cache.v1.tasks.mine',
  tasksProject: (projectId: string) => `julow.cache.v1.tasks.project.${projectId}`,
  taskCounts: 'julow.cache.v1.taskCounts',
  dashboard: (workspaceId: string) => `julow.cache.v1.dashboard.${workspaceId}`,
  analytics: (workspaceId: string) => `julow.cache.v1.analytics.${workspaceId}`,
  chatsGlobal: 'julow.cache.v1.chats.global',
  chatsWorkspace: (workspaceId: string) => `julow.cache.v1.chats.workspace.${workspaceId}`,
  chatDetail: (chatId: string) => `julow.cache.v1.chat.${chatId}`,
  chatMessages: (chatId: string) => `julow.cache.v1.chat.messages.${chatId}`,
  chatUnreadMap: 'julow.cache.v1.chats.unread',
  notifications: 'julow.cache.v1.notifications',
  commentsTask: (taskId: string) => `julow.cache.v1.comments.task.${taskId}`,
  documents: (workspaceId: string) => `julow.cache.v1.documents.${workspaceId}`,
  fileMetadata: (fileId: string) => `julow.cache.v1.file.${fileId}`,
  mutationQueue: 'julow.cache.v1.mutationQueue',
} as const;

export type CacheKey =
  | typeof CACHE_KEYS.workspaces
  | typeof CACHE_KEYS.projectsMine
  | typeof CACHE_KEYS.tasksMine
  | typeof CACHE_KEYS.taskCounts
  | typeof CACHE_KEYS.mutationQueue
  | typeof CACHE_KEYS.chatsGlobal
  | typeof CACHE_KEYS.chatUnreadMap
  | typeof CACHE_KEYS.notifications
  | ReturnType<typeof CACHE_KEYS.projectsWorkspace>
  | ReturnType<typeof CACHE_KEYS.tasksProject>
  | ReturnType<typeof CACHE_KEYS.dashboard>
  | ReturnType<typeof CACHE_KEYS.analytics>
  | ReturnType<typeof CACHE_KEYS.chatsWorkspace>
  | ReturnType<typeof CACHE_KEYS.chatDetail>
  | ReturnType<typeof CACHE_KEYS.chatMessages>
  | ReturnType<typeof CACHE_KEYS.commentsTask>
  | ReturnType<typeof CACHE_KEYS.documents>
  | ReturnType<typeof CACHE_KEYS.fileMetadata>;
