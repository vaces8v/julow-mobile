/**
 * Julow Mobile API — real backend integration.
 * Mirrors the web's api.ts interface but calls backend directly via Bearer token.
 */

import {
  API_BASE_URL,
  apiGet,
  apiGetPaginated,
  apiPost,
  apiPatch,
  apiDelete,
  apiPostMultipart,
  getAccessToken,
  ApiError,
} from './api-client';
import { buildUploadFormData } from './build-upload-form-data';

/**
 * The backend is currently configured with `S3_ENDPOINT_URL=http://minio:9000`
 * (Docker-internal hostname), so storage URLs returned to clients reference an
 * unreachable host like `http://minio:9000/<bucket>/<key>` or, on a
 * misconfigured non-Docker dev box, `http://localhost:9000/...`.
 *
 * Rewrite those to the host the device CAN reach: same scheme/host as the API
 * base URL, port 9000 (the MinIO host port from docker-compose).
 *
 * On a real production deploy where the storage URL is already public this is
 * a no-op (the hostname won't match the rewrite list).
 */
const STORAGE_REWRITE_HOSTS = new Set(['minio', 'localhost', '127.0.0.1', '0.0.0.0']);

let _apiHostCache: { hostname: string; protocol: string } | null = null;
function getApiHost(): { hostname: string; protocol: string } {
  if (_apiHostCache) return _apiHostCache;
  try {
    const u = new URL(API_BASE_URL);
    _apiHostCache = { hostname: u.hostname, protocol: u.protocol };
  } catch {
    _apiHostCache = { hostname: 'localhost', protocol: 'http:' };
  }
  return _apiHostCache;
}

/**
 * Base URL of the public web frontend that hosts the auth-aware /api/proxy
 * route. Mobile uses this proxy to fetch chat attachments with a Bearer token
 * because the raw S3/MinIO URL the backend hands out points to a Docker-internal
 * host that's unreachable from devices.
 *
 * Override via `EXPO_PUBLIC_WEB_BASE_URL` if you run the web frontend on a
 * different domain.
 */
export const WEB_BASE_URL =
  (process.env.EXPO_PUBLIC_WEB_BASE_URL as string | undefined) ?? 'https://julow.ru';

/**
 * Build the URL for streaming a file's content via the web proxy.
 * The caller must add an `Authorization: Bearer <token>` header — the proxy
 * accepts Bearer auth as a fallback when the request has no session cookie.
 */
export function buildFileContentUrl(fileId: string): string {
  return `${WEB_BASE_URL.replace(/\/$/, '')}/api/proxy/files/${fileId}/content`;
}

/** Stream file bytes directly from the mobile API (Bearer-authed). */
export function buildDirectFileContentUrl(fileId: string): string {
  const base = API_BASE_URL.replace(/\/$/, '');
  return `${base}/files/${encodeURIComponent(fileId)}/content`;
}

export function rewriteStorageUrl(url: string | undefined | null): string | undefined {
  if (!url) return undefined;
  try {
    const u = new URL(url);
    if (STORAGE_REWRITE_HOSTS.has(u.hostname)) {
      const api = getApiHost();
      u.hostname = api.hostname;
      u.protocol = api.protocol;
      // Storage stays on 9000 (MinIO port from docker-compose).
      if (!u.port) u.port = '9000';
      return u.toString();
    }
    return url;
  } catch {
    return url;
  }
}

// ── Payload types ────────────────────────────────────────────────

export interface WorkspacePayload {
  id: string;
  name: string;
  slug: string;
}

export interface ProjectPayload {
  id: string;
  workspaceId: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  status?: string;
  methodology?: string;
  ownerIds?: string[];
  progress?: number;
  tasksTotal?: number;
  tasksDone?: number;
  dueDate?: string;
  members?: { id: string; name: string; avatar?: string }[];
}

export interface TaskPayload {
  id: string;
  title: string;
  status: string;
  statusId?: string;
  columnId?: string;
  priority: string;
  dueDate?: string;
  startDate?: string;
  labels: string[];
  projectId: string;
  taskType?: string;
  assigneeIds?: string[];
  assignee?: string;
  reporterId?: string;
  progress?: number;
  sprintId?: string;
  epicId?: string;
  parentTaskId?: string;
  createdAt?: string;
  completedAt?: string;
}

export interface ChecklistItemPayload {
  id: string;
  text: string;
  isChecked: boolean;
  assigneeId?: string;
  dueDate?: string;
  checkedAt?: string;
  order: number;
}

export interface ChecklistPayload {
  id: string;
  title: string;
  items: ChecklistItemPayload[];
}

export interface TaskDetailPayload extends TaskPayload {
  description?: string;
  descriptionFormat?: string;
  checklists: ChecklistPayload[];
  relations: { relatedTaskId: string; relationType: string; createdAt: string; createdBy: string }[];
  watchers: { userId: string; watchedAt: string }[];
  attachments: { fileId: string; filename: string; sizeBytes: number; uploadedBy: string; uploadedAt: string }[];
  customFields: Record<string, string>;
}

export interface TaskChangelogEntryPayload {
  id: string;
  fieldName: string;
  oldValue?: string | null;
  newValue?: string | null;
  changedAt: string;
  changedBy: string;
}

export interface SprintPayload {
  id: string;
  projectId: string;
  name: string;
  goal?: string;
  status: string;
  startDate?: string;
  endDate?: string;
  createdAt?: string;
}

export interface EpicPayload {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  status: string;
  color?: string;
  startDate?: string;
  endDate?: string;
}

export interface BoardColumnPayload {
  id: string;
  name: string;
  statusMapping: string | null;
  position: number;
  wipLimit: number | null;
}

export interface WorkflowStatusPayload {
  id: string;
  name: string;
  category: string;
  order: number;
  isDefault: boolean;
}

export interface CommentAttachmentShape {
  id: string;
  fileId: string;
  url?: string;
  attachmentType?: string;
  name?: string;
  sizeBytes?: number;
  previewUrl?: string;
  createdAt?: string;
}

export interface CommentPayload {
  id: string;
  targetType: string;
  targetId: string;
  authorId: string;
  content: string;
  contentFormat: string;
  parentCommentId?: string;
  attachments: CommentAttachmentShape[];
  createdAt: string;
  updatedAt?: string;
  isPinned: boolean;
}

export interface FileDownloadPayload {
  url: string;
  expiresIn: number;
  fileId: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
}

export interface AnalyticsPayload {
  throughput: number;
  overdue: number;
  statusDistribution: Record<string, number>;
  totalTasks: number;
}

export interface NotificationPayload {
  id: string;
  title: string;
  message: string;
  body?: string;
  channel: string;
  notificationType?: string;
  priority?: string;
  data?: Record<string, unknown> | null;
  isRead?: boolean;
  isArchived?: boolean;
  createdAt: string;
}

export type ChatType = 'dm' | 'group' | 'channel' | 'announcement';

export interface ChatMemberShape {
  userId: string;
  role: string;
  joinedAt?: string;
  lastReadAt?: string;
}

export interface ChatPayload {
  id: string;
  chatType: string;
  name?: string;
  description?: string;
  icon?: string;
  color?: string;
  workspaceId?: string;
  projectId?: string;
  members: ChatMemberShape[];
  isArchived: boolean;
  lastMessageAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface MessageAttachmentShape {
  id: string;
  fileId: string;
  filename: string;
  sizeBytes?: number;
  mimeType?: string;
  /** Direct URL set by backend at upload time (may be presigned and expire). */
  url?: string;
  /** Optional smaller preview URL for images/videos. */
  previewUrl?: string;
}

export interface MessagePayload {
  id: string;
  chatId: string;
  threadId?: string;
  senderId: string;
  content?: string;
  contentFormat: string;
  messageType: string;
  replyToId?: string;
  attachments: MessageAttachmentShape[];
  reactions: { emoji: string; userIds: string[] }[];
  isEdited: boolean;
  isDeleted: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface MeetingParticipantShape {
  userId: string;
  isMandatory: boolean;
  rsvpStatus: string;
  joinedAt?: string;
}

export interface MeetingPayload {
  id: string;
  title: string;
  description?: string;
  meetingType: string;
  status: string;
  scheduledAt?: string;
  durationMinutes?: number;
  location?: string;
  conferenceUrl?: string;
  conferenceProvider: string;
  workspaceId: string;
  projectId?: string;
  organizerId: string;
  participants: MeetingParticipantShape[];
  agenda: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface MeetingJoinPayload {
  joinUrl: string;
  accessToken?: string;
  provider: string;
}

export interface UserPayload {
  id: string;
  email: string;
  status: string;
  isEmailConfirmed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProfilePayload {
  id: string;
  userId: string;
  displayName?: string;
  avatarUrl?: string;
  bio?: string;
  jobTitle?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SessionPayload {
  id: string;
  userId: string;
  deviceInfo: string;
  ipAddress: string;
  status: string;
  isRememberMe: boolean;
  createdAt: string;
  expiresAt: string;
}

export interface WorkspaceMemberPayload {
  id: string;
  userId: string;
  displayName?: string;
  roleId: string;
  joinedAt: string;
  isActive: boolean;
  source: string;
  invitedBy?: string;
}

export interface ProjectMemberPayload {
  id: string;
  userId: string;
  roleId: string;
  joinedAt?: string;
  isActive: boolean;
}

export interface ProjectRolePayload {
  id: string;
  projectId: string;
  name: string;
  permissions: string[];
  isSystem: boolean;
  description?: string;
}

export interface ProjectInvitationLinkPayload {
  value: string;
  expiresAt?: string;
  maxUses?: number;
  usedCount: number;
}

export interface ProjectInvitationPayload {
  id: string;
  projectId: string;
  workspaceId: string;
  email?: string;
  link?: ProjectInvitationLinkPayload;
  roleId: string;
  invitedBy: string;
  invitedAt: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired' | 'revoked';
  userId?: string;
  projectName?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface NotificationConnectionInfo {
  websocketUrl: string;
  authMethod: string;
  authParam: string;
  heartbeatIntervalSec: number;
  serverEvents: string[];
  clientMessages: string[];
}

// ── Backend DTO interfaces ───────────────────────────────────────

interface BackendWorkspace {
  id: string;
  name: string;
  status: string;
  workspace_type: string;
  organization_id?: string | null;
  parent_workspace_id?: string | null;
  owner_ids?: string[] | null;
  created_at?: string | null;
  updated_at?: string | null;
}

interface BackendProject {
  id: string;
  workspace_id: string;
  name: string;
  description?: { content: string; format: string } | null;
  methodology: string;
  visibility: string;
  status: string;
  color?: string | null;
  icon?: string | null;
  category?: string | null;
  owner_ids?: string[] | null;
  start_date?: string | null;
  deadline?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

interface BackendChecklistItem {
  id: string;
  text: string;
  is_checked: boolean;
  assignee_id?: string | null;
  due_date?: string | null;
  checked_at?: string | null;
  order: number;
}

interface BackendChecklist {
  id: string;
  title: string;
  items?: BackendChecklistItem[];
}

interface BackendTaskRelation {
  related_task_id: string;
  relation_type: string;
  created_at: string;
  created_by: string;
}

interface BackendTaskAttachment {
  file_id: string;
  filename: string;
  size_bytes: number;
  uploaded_by: string;
  uploaded_at: string;
}

interface BackendTaskWatcher {
  user_id: string;
  watched_at: string;
}

interface BackendTask {
  id: string;
  project_id: string;
  parent_task_id?: string | null;
  epic_id?: string | null;
  title: string;
  description?: { content: string; format: string } | null;
  status: string;
  status_id?: string | null;
  column_id?: string | null;
  priority: string;
  task_type: string;
  assignee_ids?: string[];
  reporter_id?: string | null;
  labels?: { name: string; color?: string | null }[];
  progress: number;
  due_date?: string | null;
  start_date?: string | null;
  completed_at?: string | null;
  sprint_id?: string | null;
  custom_fields?: Record<string, string>;
  checklists?: BackendChecklist[];
  relations?: BackendTaskRelation[];
  watchers?: BackendTaskWatcher[];
  attachments?: BackendTaskAttachment[];
  created_at: string;
  updated_at: string;
}

interface BackendSprint {
  id: string;
  project_id: string;
  name: string;
  goal?: string | null;
  status: string;
  start_date?: string | null;
  end_date?: string | null;
  created_at?: string | null;
}

interface BackendEpic {
  id: string;
  project_id: string;
  name: string;
  description?: string | null;
  status: string;
  color?: string | null;
  start_date?: string | null;
  end_date?: string | null;
}

interface BackendBoardColumn {
  id: string;
  name: string;
  status_mapping: string | null;
  order: number;
  color?: string | null;
  wip_limit?: number | null;
}

interface BackendWorkflowStatus {
  id: string;
  name: string;
  color?: string | null;
  icon?: string | null;
  order: number;
  is_default: boolean;
  category: string;
}

interface BackendComment {
  id: string;
  target_type: string;
  target_id: string;
  author_id: string;
  content: string;
  content_format: string;
  parent_comment_id?: string | null;
  attachments?: {
    id: string;
    file_id: string;
    url?: string | null;
    attachment_type?: string | null;
    name?: string | null;
    size_bytes?: number | null;
    preview_url?: string | null;
    created_at?: string | null;
  }[];
  created_at: string;
  updated_at?: string | null;
  is_pinned: boolean;
}

interface BackendChatMember {
  user_id: string;
  role: string;
  joined_at?: string | null;
  last_read_at?: string | null;
}

interface BackendChat {
  id: string;
  chat_type: string;
  name?: string | null;
  description?: string | null;
  icon?: string | null;
  color?: string | null;
  workspace_id?: string | null;
  project_id?: string | null;
  members?: BackendChatMember[];
  is_archived: boolean;
  last_message_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

interface BackendMessageAttachment {
  id: string;
  file_id: string;
  name?: string | null;
  filename?: string | null;
  attachment_type?: string | null;
  url?: string | null;
  size_bytes?: number | null;
  mime_type?: string | null;
  preview_url?: string | null;
}

interface BackendMessage {
  id: string;
  chat_id: string;
  thread_id?: string | null;
  sender_id: string;
  content?: string | null;
  content_format: string;
  message_type: string;
  reply_to_id?: string | null;
  attachments?: BackendMessageAttachment[];
  reactions?: { emoji: string; user_ids: string[] }[];
  is_edited: boolean;
  is_deleted: boolean;
  created_at?: string | null;
  updated_at?: string | null;
}

interface BackendMeetingParticipant {
  user_id: string;
  is_mandatory: boolean;
  rsvp_status: string;
  joined_at?: string | null;
}

interface BackendMeeting {
  id: string;
  title: string;
  description?: string | null;
  meeting_type: string;
  status: string;
  scheduled_at?: string | null;
  duration_minutes?: number | null;
  location?: string | null;
  conference_provider: string;
  conference_url?: string | null;
  workspace_id: string;
  project_id?: string | null;
  organizer_id: string;
  participants?: BackendMeetingParticipant[];
  agenda?: string[];
  created_at?: string | null;
  updated_at?: string | null;
}

interface BackendNotification {
  id: string;
  recipient_id: string;
  workspace_id?: string | null;
  notification_type: string;
  title: string;
  body: string;
  priority: string;
  data?: Record<string, unknown> | null;
  channels?: string[] | null;
  is_read: boolean;
  read_at?: string | null;
  is_archived: boolean;
  actor_id?: string | null;
  created_at?: string | null;
}

interface BackendWorkspaceMember {
  id: string;
  user_id: string;
  display_name?: string | null;
  role_id: string;
  joined_at: string;
  is_active: boolean;
  source: string;
  invited_by?: string | null;
}

interface BackendProjectMember {
  id: string;
  user_id: string;
  role_id: string;
  joined_at?: string | null;
  is_active: boolean;
}

interface BackendProjectRole {
  id: string;
  project_id: string;
  name: string;
  permissions: string[];
  is_system: boolean;
  description?: string | null;
}

interface BackendProjectInvitationLink {
  value: string;
  expires_at?: string | null;
  max_uses?: number | null;
  used_count: number;
}

interface BackendProjectInvitation {
  id: string;
  project_id: string;
  workspace_id: string;
  email?: string | null;
  link?: BackendProjectInvitationLink | null;
  role_id: string;
  invited_by: string;
  invited_at: string;
  status: string;
  user_id?: string | null;
  project_name?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

// ── Mapper helpers ───────────────────────────────────────────────

function mapWorkspace(bw: BackendWorkspace): WorkspacePayload {
  return {
    id: bw.id,
    name: bw.name,
    slug: bw.name.toLowerCase().replace(/\s+/g, '-'),
  };
}

function mapProject(bp: BackendProject): ProjectPayload {
  return {
    id: bp.id,
    workspaceId: bp.workspace_id,
    name: bp.name,
    description: bp.description?.content ?? undefined,
    color: bp.color ?? undefined,
    icon: bp.icon ?? undefined,
    status: bp.status,
    methodology: bp.methodology,
    ownerIds: bp.owner_ids ?? [],
    dueDate: bp.deadline ?? undefined,
  };
}

function mapTask(bt: BackendTask): TaskPayload {
  return {
    id: bt.id,
    title: bt.title,
    status: bt.status,
    statusId: bt.status_id ?? undefined,
    columnId: bt.column_id ?? undefined,
    priority: bt.priority,
    dueDate: bt.due_date ?? undefined,
    startDate: bt.start_date ?? undefined,
    labels: bt.labels?.map((l) => l.name) ?? [],
    projectId: bt.project_id,
    taskType: bt.task_type,
    assigneeIds: bt.assignee_ids ?? [],
    assignee: bt.assignee_ids?.[0],
    reporterId: bt.reporter_id ?? undefined,
    progress: bt.progress,
    sprintId: bt.sprint_id ?? undefined,
    epicId: bt.epic_id ?? undefined,
    parentTaskId: bt.parent_task_id ?? undefined,
    createdAt: bt.created_at,
    completedAt: bt.completed_at ?? undefined,
  };
}

function mapChecklistItem(it: BackendChecklistItem): ChecklistItemPayload {
  return {
    id: it.id,
    text: it.text,
    isChecked: it.is_checked,
    assigneeId: it.assignee_id ?? undefined,
    dueDate: it.due_date ?? undefined,
    checkedAt: it.checked_at ?? undefined,
    order: it.order,
  };
}

function mapChecklist(c: BackendChecklist): ChecklistPayload {
  return { id: c.id, title: c.title, items: (c.items ?? []).map(mapChecklistItem) };
}

function mapTaskDetail(bt: BackendTask): TaskDetailPayload {
  return {
    ...mapTask(bt),
    description: bt.description?.content,
    descriptionFormat: bt.description?.format,
    checklists: (bt.checklists ?? []).map(mapChecklist),
    relations: (bt.relations ?? []).map((r) => ({
      relatedTaskId: r.related_task_id,
      relationType: r.relation_type,
      createdAt: r.created_at,
      createdBy: r.created_by,
    })),
    watchers: (bt.watchers ?? []).map((w) => ({
      userId: w.user_id,
      watchedAt: w.watched_at,
    })),
    attachments: (bt.attachments ?? []).map((a) => ({
      fileId: a.file_id,
      filename: a.filename,
      sizeBytes: a.size_bytes,
      uploadedBy: a.uploaded_by,
      uploadedAt: a.uploaded_at,
    })),
    customFields: bt.custom_fields ?? {},
  };
}

function mapSprint(bs: BackendSprint): SprintPayload {
  return {
    id: bs.id,
    projectId: bs.project_id,
    name: bs.name,
    goal: bs.goal ?? undefined,
    status: bs.status,
    startDate: bs.start_date ?? undefined,
    endDate: bs.end_date ?? undefined,
    createdAt: bs.created_at ?? undefined,
  };
}

function mapEpic(be: BackendEpic): EpicPayload {
  return {
    id: be.id,
    projectId: be.project_id,
    name: be.name,
    description: be.description ?? undefined,
    status: be.status,
    color: be.color ?? undefined,
    startDate: be.start_date ?? undefined,
    endDate: be.end_date ?? undefined,
  };
}

function mapBoardColumn(c: BackendBoardColumn): BoardColumnPayload {
  return {
    id: c.id,
    name: c.name,
    statusMapping: c.status_mapping,
    position: c.order,
    wipLimit: c.wip_limit ?? null,
  };
}

function mapWorkflowStatus(s: BackendWorkflowStatus): WorkflowStatusPayload {
  return {
    id: s.id,
    name: s.name,
    category: s.category,
    order: s.order,
    isDefault: s.is_default,
  };
}

function mapComment(c: BackendComment): CommentPayload {
  return {
    id: c.id,
    targetType: c.target_type,
    targetId: c.target_id,
    authorId: c.author_id,
    content: c.content,
    contentFormat: c.content_format,
    parentCommentId: c.parent_comment_id ?? undefined,
    attachments: (c.attachments ?? []).map((a) => ({
      id: a.id,
      fileId: a.file_id,
      url: a.url ?? undefined,
      attachmentType: a.attachment_type ?? undefined,
      name: a.name ?? undefined,
      sizeBytes: a.size_bytes ?? undefined,
      previewUrl: a.preview_url ?? undefined,
      createdAt: a.created_at ?? undefined,
    })),
    createdAt: c.created_at,
    updatedAt: c.updated_at ?? undefined,
    isPinned: c.is_pinned,
  };
}

function attachmentTypeToMime(t?: string | null): string | undefined {
  if (!t) return undefined;
  const v = t.toLowerCase();
  if (v === 'image') return 'image/*';
  if (v === 'video') return 'video/*';
  if (v === 'voice') return 'audio/*';
  return undefined;
}

function mapChat(b: BackendChat): ChatPayload {
  return {
    id: b.id,
    chatType: b.chat_type,
    name: b.name ?? undefined,
    description: b.description ?? undefined,
    icon: b.icon ?? undefined,
    color: b.color ?? undefined,
    workspaceId: b.workspace_id ?? undefined,
    projectId: b.project_id ?? undefined,
    members: (b.members ?? []).map((m) => ({
      userId: m.user_id,
      role: m.role,
      joinedAt: m.joined_at ?? undefined,
      lastReadAt: m.last_read_at ?? undefined,
    })),
    isArchived: b.is_archived,
    lastMessageAt: b.last_message_at ?? undefined,
    createdAt: b.created_at ?? undefined,
    updatedAt: b.updated_at ?? undefined,
  };
}

function mapMessage(b: BackendMessage): MessagePayload {
  return {
    id: b.id,
    chatId: b.chat_id,
    threadId: b.thread_id ?? undefined,
    senderId: b.sender_id,
    content: b.content ?? undefined,
    contentFormat: b.content_format,
    messageType: b.message_type,
    replyToId: b.reply_to_id ?? undefined,
    attachments: (b.attachments ?? []).map((a) => ({
      id: a.id,
      fileId: a.file_id,
      filename: a.name ?? a.filename ?? '',
      sizeBytes: a.size_bytes ?? undefined,
      mimeType: a.mime_type ?? attachmentTypeToMime(a.attachment_type),
      url: rewriteStorageUrl(a.url),
      previewUrl: rewriteStorageUrl(a.preview_url),
    })),
    reactions: (b.reactions ?? []).map((r) => ({ emoji: r.emoji, userIds: r.user_ids })),
    isEdited: b.is_edited,
    isDeleted: b.is_deleted,
    createdAt: b.created_at ?? undefined,
    updatedAt: b.updated_at ?? undefined,
  };
}

function mapMeeting(b: BackendMeeting): MeetingPayload {
  return {
    id: b.id,
    title: b.title,
    description: b.description ?? undefined,
    meetingType: b.meeting_type,
    status: b.status,
    scheduledAt: b.scheduled_at ?? undefined,
    durationMinutes: b.duration_minutes ?? undefined,
    location: b.location ?? undefined,
    conferenceUrl: b.conference_url ?? undefined,
    conferenceProvider: b.conference_provider,
    workspaceId: b.workspace_id,
    projectId: b.project_id ?? undefined,
    organizerId: b.organizer_id,
    participants: (b.participants ?? []).map((p) => ({
      userId: p.user_id,
      isMandatory: p.is_mandatory,
      rsvpStatus: p.rsvp_status,
      joinedAt: p.joined_at ?? undefined,
    })),
    agenda: b.agenda ?? [],
    createdAt: b.created_at ?? undefined,
    updatedAt: b.updated_at ?? undefined,
  };
}

function mapNotification(b: BackendNotification): NotificationPayload {
  return {
    id: b.id,
    title: b.title,
    message: b.body,
    body: b.body,
    channel: b.channels?.[0] ?? 'in_app',
    notificationType: b.notification_type,
    priority: b.priority,
    data: b.data ?? null,
    isRead: b.is_read,
    isArchived: b.is_archived,
    createdAt: b.created_at ?? new Date().toISOString(),
  };
}

function mapWorkspaceMember(bm: BackendWorkspaceMember): WorkspaceMemberPayload {
  return {
    id: bm.id,
    userId: bm.user_id,
    displayName: bm.display_name ?? undefined,
    roleId: bm.role_id,
    joinedAt: bm.joined_at,
    isActive: bm.is_active,
    source: bm.source,
    invitedBy: bm.invited_by ?? undefined,
  };
}

function mapProjectMember(bm: BackendProjectMember): ProjectMemberPayload {
  return {
    id: bm.id,
    userId: bm.user_id,
    roleId: bm.role_id,
    joinedAt: bm.joined_at ?? undefined,
    isActive: bm.is_active,
  };
}

function mapProjectRole(br: BackendProjectRole): ProjectRolePayload {
  return {
    id: br.id,
    projectId: br.project_id,
    name: br.name,
    permissions: br.permissions ?? [],
    isSystem: br.is_system,
    description: br.description ?? undefined,
  };
}

function mapProjectInvitation(bi: BackendProjectInvitation): ProjectInvitationPayload {
  return {
    id: bi.id,
    projectId: bi.project_id,
    workspaceId: bi.workspace_id,
    email: bi.email ?? undefined,
    link: bi.link
      ? {
          value: bi.link.value,
          expiresAt: bi.link.expires_at ?? undefined,
          maxUses: bi.link.max_uses ?? undefined,
          usedCount: bi.link.used_count ?? 0,
        }
      : undefined,
    roleId: bi.role_id,
    invitedBy: bi.invited_by,
    invitedAt: bi.invited_at,
    status: (bi.status as ProjectInvitationPayload['status']) ?? 'pending',
    userId: bi.user_id ?? undefined,
    projectName: bi.project_name ?? undefined,
    createdAt: bi.created_at ?? undefined,
    updatedAt: bi.updated_at ?? undefined,
  };
}

// ── API methods ──────────────────────────────────────────────────

export const api = {
  // ── Profile ────────────────────────────────────────────────────
  getMyProfile: async (): Promise<ProfilePayload> => {
    type BackendProfile = {
      id: string;
      user_id: string;
      display_name?: string | null;
      avatar_url?: string | null;
      bio?: string | null;
      job_title?: string | null;
      created_at: string;
      updated_at: string;
    };
    const res = await apiGet<BackendProfile>('/profile/me');
    return {
      id: res.data.id,
      userId: res.data.user_id,
      displayName: res.data.display_name ?? undefined,
      avatarUrl: res.data.avatar_url ?? undefined,
      bio: res.data.bio ?? undefined,
      jobTitle: res.data.job_title ?? undefined,
      createdAt: res.data.created_at,
      updatedAt: res.data.updated_at,
    };
  },

  updatePersonalInfo: async (payload: {
    displayName?: string;
    bio?: string;
    jobTitle?: string;
  }): Promise<void> => {
    const body: Record<string, unknown> = {};
    if (payload.displayName !== undefined) body.display_name = payload.displayName;
    if (payload.bio !== undefined) body.bio = payload.bio;
    if (payload.jobTitle !== undefined) body.job_title = payload.jobTitle;
    await apiPatch('/profile/me/personal-info', body);
  },

  // ── Account (Identity BC) ─────────────────────────────────────
  getMe: async (): Promise<UserPayload> => {
    type BackendUser = {
      id: string;
      email: string;
      status: string;
      is_email_confirmed: boolean;
      created_at: string;
      updated_at: string;
    };
    const res = await apiGet<BackendUser>('/account/me');
    return {
      id: res.data.id,
      email: res.data.email,
      status: res.data.status,
      isEmailConfirmed: res.data.is_email_confirmed,
      createdAt: res.data.created_at,
      updatedAt: res.data.updated_at,
    };
  },

  getUserById: async (userId: string): Promise<UserPayload> => {
    type BackendUser = {
      id: string;
      email: string;
      status: string;
      is_email_confirmed: boolean;
      created_at: string;
      updated_at: string;
    };
    const res = await apiGet<BackendUser>(`/account/users/${userId}`);
    return {
      id: res.data.id,
      email: res.data.email,
      status: res.data.status,
      isEmailConfirmed: res.data.is_email_confirmed,
      createdAt: res.data.created_at,
      updatedAt: res.data.updated_at,
    };
  },

  changePassword: async (payload: {
    currentPassword: string;
    newPassword: string;
  }): Promise<void> => {
    await apiPost('/account/me/change-password', {
      current_password: payload.currentPassword,
      new_password: payload.newPassword,
    });
  },

  getActiveSessions: async (): Promise<SessionPayload[]> => {
    type BackendSession = {
      id: string;
      user_id: string;
      device_info: string;
      ip_address: string;
      status: string;
      is_remember_me: boolean;
      created_at: string;
      expires_at: string;
    };
    const res = await apiGet<BackendSession[]>('/account/sessions');
    return (res.data ?? []).map((s) => ({
      id: s.id,
      userId: s.user_id,
      deviceInfo: s.device_info,
      ipAddress: s.ip_address,
      status: s.status,
      isRememberMe: s.is_remember_me,
      createdAt: s.created_at,
      expiresAt: s.expires_at,
    }));
  },

  terminateSession: async (sessionId: string): Promise<void> => {
    await apiDelete(`/account/sessions/${sessionId}`);
  },

  // ── Workspaces ─────────────────────────────────────────────────
  getWorkspaces: async (): Promise<WorkspacePayload[]> => {
    const res = await apiGetPaginated<BackendWorkspace>('/workspaces/');
    return (res.items ?? []).map(mapWorkspace);
  },

  createWorkspace: async (name: string, type = 'PERSONAL'): Promise<WorkspacePayload> => {
    const res = await apiPost<BackendWorkspace>('/workspaces/', {
      name,
      workspace_type: type,
    });
    return mapWorkspace(res.data);
  },

  getWorkspaceMembers: async (workspaceId: string): Promise<WorkspaceMemberPayload[]> => {
    const res = await apiGetPaginated<BackendWorkspaceMember>(
      `/workspaces/${workspaceId}/members`,
      { limit: 100 },
    );
    return (res.items ?? []).map(mapWorkspaceMember);
  },

  updateWorkspaceInfo: async (
    workspaceId: string,
    payload: { name?: string; color?: string; icon?: string; displayName?: string; description?: string },
  ): Promise<void> => {
    const body: Record<string, unknown> = {};
    if (payload.name !== undefined) body.name = payload.name;
    if (payload.color !== undefined) body.color = payload.color;
    if (payload.icon !== undefined) body.icon = payload.icon;
    if (payload.displayName !== undefined) body.display_name = payload.displayName;
    if (payload.description !== undefined) body.description = payload.description;
    await apiPatch(`/workspaces/${workspaceId}`, body);
  },

  // ── Projects ───────────────────────────────────────────────────
  getProjects: async (workspaceId: string): Promise<ProjectPayload[]> => {
    const res = await apiGet<BackendProject[]>(
      `/workspaces/${workspaceId}/projects/`,
    );
    return (res.data ?? []).map(mapProject);
  },

  getMyProjects: async (): Promise<ProjectPayload[]> => {
    const res = await apiGet<BackendProject[]>('/projects/mine');
    return (res.data ?? []).map(mapProject);
  },

  createProject: async (payload: {
    workspaceId: string;
    name: string;
    description?: string;
  }): Promise<ProjectPayload> => {
    const res = await apiPost<BackendProject>(
      `/workspaces/${payload.workspaceId}/projects/`,
      { name: payload.name, methodology: 'kanban', visibility: 'workspace' },
    );
    return mapProject(res.data);
  },

  updateProjectInfo: async (
    workspaceId: string,
    projectId: string,
    payload: {
      name?: string;
      description?: { content: string; format?: 'PLAIN' | 'MARKDOWN' | 'HTML' };
      icon?: string;
      color?: string;
      startDate?: string;
      deadline?: string;
    },
  ): Promise<void> => {
    const body: Record<string, unknown> = {};
    if (payload.name !== undefined) body.name = payload.name;
    if (payload.description !== undefined) {
      body.description = {
        content: payload.description.content,
        format: (payload.description.format ?? 'MARKDOWN').toLowerCase(),
      };
    }
    if (payload.icon !== undefined) body.icon = payload.icon;
    if (payload.color !== undefined) body.color = payload.color;
    if (payload.startDate !== undefined) body.start_date = payload.startDate;
    if (payload.deadline !== undefined) body.deadline = payload.deadline;
    await apiPatch(`/workspaces/${workspaceId}/projects/${projectId}`, body);
  },

  archiveProject: async (workspaceId: string, projectId: string): Promise<void> => {
    await apiPost(`/workspaces/${workspaceId}/projects/${projectId}/archive`);
  },

  restoreProject: async (workspaceId: string, projectId: string): Promise<void> => {
    await apiPost(`/workspaces/${workspaceId}/projects/${projectId}/restore`);
  },

  // ── Project members ────────────────────────────────────────────
  getProjectMembers: async (workspaceId: string, projectId: string): Promise<ProjectMemberPayload[]> => {
    const res = await apiGet<BackendProjectMember[]>(
      `/workspaces/${workspaceId}/projects/${projectId}/members`,
    );
    return (res.data ?? []).map(mapProjectMember);
  },

  addProjectMember: async (
    workspaceId: string,
    projectId: string,
    payload: { userId: string; roleId: string; membershipType?: 'STANDARD' | 'GUEST' },
  ): Promise<void> => {
    await apiPost(`/workspaces/${workspaceId}/projects/${projectId}/members`, {
      user_id: payload.userId,
      role_id: payload.roleId,
      membership_type: payload.membershipType ?? 'STANDARD',
    });
  },

  removeProjectMember: async (workspaceId: string, projectId: string, userId: string): Promise<void> => {
    await apiDelete(`/workspaces/${workspaceId}/projects/${projectId}/members/${userId}`);
  },

  // ── Project roles ──────────────────────────────────────────────
  getProjectRoles: async (workspaceId: string, projectId: string): Promise<ProjectRolePayload[]> => {
    const res = await apiGet<BackendProjectRole[]>(
      `/workspaces/${workspaceId}/projects/${projectId}/roles`,
    );
    return (res.data ?? []).map(mapProjectRole);
  },

  // ── Project invitations ────────────────────────────────────────
  getProjectInvitations: async (workspaceId: string, projectId: string): Promise<ProjectInvitationPayload[]> => {
    const res = await apiGetPaginated<BackendProjectInvitation>(
      `/workspaces/${workspaceId}/projects/${projectId}/invitations`,
      { limit: 200 },
    );
    return (res.items ?? []).map(mapProjectInvitation);
  },

  acceptProjectInvitation: async (invitationId: string): Promise<{
    projectId: string;
    workspaceId: string;
    roleId: string;
    membershipType: string;
  }> => {
    const res = await apiPost<{
      project_id: string;
      workspace_id: string;
      role_id: string;
      membership_type: string;
    }>(`/project-invitations/${invitationId}/accept`);
    return {
      projectId: res.data.project_id,
      workspaceId: res.data.workspace_id,
      roleId: res.data.role_id,
      membershipType: res.data.membership_type,
    };
  },

  declineProjectInvitation: async (invitationId: string): Promise<void> => {
    await apiPost(`/project-invitations/${invitationId}/decline`);
  },

  getMyProjectInvitations: async (): Promise<ProjectInvitationPayload[]> => {
    const res = await apiGetPaginated<BackendProjectInvitation>(
      '/project-invitations/mine',
      { limit: 200 },
    );
    return (res.items ?? []).map(mapProjectInvitation);
  },

  getProjectInvitationByToken: async (token: string): Promise<ProjectInvitationPayload> => {
    const res = await apiGet<BackendProjectInvitation>(
      `/project-invitations/token/${encodeURIComponent(token)}`,
    );
    return mapProjectInvitation(res.data);
  },

  redeemProjectInvitation: async (token: string): Promise<{
    projectId: string;
    workspaceId: string;
    roleId: string;
    membershipType: string;
  }> => {
    const res = await apiPost<{
      project_id: string;
      workspace_id: string;
      role_id: string;
      membership_type: string;
    }>('/project-invitations/redeem', { token });
    return {
      projectId: res.data.project_id,
      workspaceId: res.data.workspace_id,
      roleId: res.data.role_id,
      membershipType: res.data.membership_type,
    };
  },

  // ── Tasks ──────────────────────────────────────────────────────
  getTasks: async (_wsId?: string, filters?: {
    status?: string;
    priority?: string;
    role?: 'assignee' | 'reporter' | 'watcher' | 'all';
    limit?: number;
    offset?: number;
    search?: string;
  }): Promise<TaskPayload[]> => {
    const res = await apiGetPaginated<BackendTask>('/tasks/mine', {
      limit: filters?.limit ?? 200,
      offset: filters?.offset ?? 0,
      status: filters?.status,
      priority: filters?.priority,
      role: filters?.role,
      search: filters?.search,
    });
    return (res.items ?? []).map(mapTask);
  },

  getMyOverdueTasks: async (projectId?: string): Promise<TaskPayload[]> => {
    const res = await apiGetPaginated<BackendTask>('/tasks/mine/overdue', {
      project_id: projectId,
      limit: 100,
    });
    return (res.items ?? []).map(mapTask);
  },

  getProjectTasks: async (workspaceId: string, projectId: string): Promise<TaskPayload[]> => {
    const res = await apiGetPaginated<BackendTask>(
      `/workspaces/${workspaceId}/projects/${projectId}/tasks`,
    );
    return (res.items ?? []).map(mapTask);
  },

  getTask: async (taskId: string): Promise<TaskDetailPayload> => {
    const res = await apiGet<BackendTask>(`/tasks/${taskId}`);
    return mapTaskDetail(res.data);
  },

  createTask: async (payload: {
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
  }): Promise<TaskPayload> => {
    const createBody: Record<string, unknown> = {
      title: payload.title,
      task_type: (payload.taskType ?? 'TASK').toLowerCase(),
    };
    if (payload.reporterId) createBody.reporter_id = payload.reporterId;
    if (payload.parentTaskId) createBody.parent_task_id = payload.parentTaskId;
    if (payload.epicId) createBody.epic_id = payload.epicId;

    const res = await apiPost<BackendTask>(
      `/workspaces/${payload.workspaceId}/projects/${payload.projectId}/tasks`,
      createBody,
    );
    const task = mapTask(res.data);
    const taskId = task.id;

    // Post-creation updates (best-effort)
    const hasInfoUpdate = payload.description != null || payload.startDate != null || payload.dueDate != null;
    if (hasInfoUpdate) {
      try {
        await apiPatch(`/tasks/${taskId}`, {
          description_content: payload.description,
          description_format: payload.descriptionFormat?.toLowerCase(),
          start_date: payload.startDate,
          due_date: payload.dueDate,
        });
      } catch (err) { console.warn('createTask: updateInfo failed', err); }
    }

    if (payload.priority && payload.priority !== 'NONE') {
      try {
        await apiPost(`/tasks/${taskId}/change-priority`, { priority: payload.priority.toLowerCase() });
      } catch (err) { console.warn('createTask: changePriority failed', err); }
    }

    if (payload.assigneeIds && payload.assigneeIds.length > 0) {
      for (const userId of payload.assigneeIds) {
        try {
          await apiPost(`/tasks/${taskId}/assignees`, { assignee_id: userId });
        } catch (err) { console.warn(`createTask: assign ${userId} failed`, err); }
      }
    }

    if (payload.sprintId) {
      try {
        await apiPost(`/tasks/${taskId}/sprint`, { sprint_id: payload.sprintId });
      } catch (err) { console.warn('createTask: assignToSprint failed', err); }
    }

    try {
      const refreshed = await apiGet<BackendTask>(`/tasks/${taskId}`);
      return mapTask(refreshed.data);
    } catch {
      return task;
    }
  },

  updateTaskInfo: async (
    taskId: string,
    payload: {
      title?: string;
      description?: string;
      descriptionFormat?: 'PLAIN' | 'MARKDOWN' | 'HTML';
      startDate?: string;
      dueDate?: string;
    },
  ): Promise<void> => {
    await apiPatch(`/tasks/${taskId}`, {
      title: payload.title,
      description_content: payload.description,
      description_format: payload.descriptionFormat?.toLowerCase(),
      start_date: payload.startDate,
      due_date: payload.dueDate,
    });
  },

  deleteTask: async (taskId: string): Promise<void> => {
    await apiDelete(`/tasks/${taskId}`);
  },

  archiveTask: async (taskId: string): Promise<void> => {
    await apiPost(`/tasks/${taskId}/archive`);
  },

  restoreTask: async (taskId: string): Promise<void> => {
    await apiPost(`/tasks/${taskId}/restore`);
  },

  moveTask: async (taskId: string, payload: { columnId: string; position: number }): Promise<void> => {
    await apiPost(`/tasks/${taskId}/move`, {
      column_id: payload.columnId,
      position: payload.position,
    });
  },

  updateTaskStatus: async (taskId: string, statusId: string): Promise<void> => {
    await apiPost(`/tasks/${taskId}/change-status`, { new_status_id: statusId });
  },

  changeTaskPriority: async (taskId: string, priority: string): Promise<void> => {
    await apiPost(`/tasks/${taskId}/change-priority`, { priority: priority.toLowerCase() });
  },

  assignTask: async (taskId: string, userId: string): Promise<void> => {
    await apiPost(`/tasks/${taskId}/assignees`, { assignee_id: userId });
  },

  unassignTask: async (taskId: string, userId: string): Promise<void> => {
    await apiDelete(`/tasks/${taskId}/assignees/${userId}`);
  },

  assignTaskToSprint: async (taskId: string, sprintId: string): Promise<void> => {
    await apiPost(`/tasks/${taskId}/sprint`, { sprint_id: sprintId });
  },

  removeTaskFromSprint: async (taskId: string): Promise<void> => {
    await apiDelete(`/tasks/${taskId}/sprint`);
  },

  assignTaskToEpic: async (taskId: string, epicId: string): Promise<void> => {
    await apiPost(`/tasks/${taskId}/epic`, { epic_id: epicId });
  },

  removeTaskFromEpic: async (taskId: string): Promise<void> => {
    await apiDelete(`/tasks/${taskId}/epic`);
  },

  // ── Task checklists ────────────────────────────────────────────
  addChecklist: async (taskId: string, title: string): Promise<void> => {
    await apiPost(`/tasks/${taskId}/checklists`, { title });
  },

  removeChecklist: async (taskId: string, checklistId: string): Promise<void> => {
    await apiDelete(`/tasks/${taskId}/checklists/${checklistId}`);
  },

  addChecklistItem: async (
    taskId: string,
    checklistId: string,
    payload: { text: string; assigneeId?: string; dueDate?: string },
  ): Promise<void> => {
    await apiPost(`/tasks/${taskId}/checklists/${checklistId}/items`, {
      text: payload.text,
      assignee_id: payload.assigneeId,
      due_date: payload.dueDate,
    });
  },

  toggleChecklistItem: async (taskId: string, checklistId: string, itemId: string): Promise<void> => {
    await apiPost(`/tasks/${taskId}/checklists/${checklistId}/items/${itemId}/toggle`);
  },

  // ── Task changelog ─────────────────────────────────────────────
  getTaskChangelog: async (taskId: string, fieldName?: string): Promise<TaskChangelogEntryPayload[]> => {
    const path = fieldName ? `/tasks/${taskId}/changelog/${fieldName}` : `/tasks/${taskId}/changelog`;
    const res = await apiGetPaginated<{
      id: string;
      field_name: string;
      old_value?: string | null;
      new_value?: string | null;
      changed_at: string;
      changed_by: string;
    }>(path, { limit: 200 });
    return (res.items ?? []).map((e) => ({
      id: e.id,
      fieldName: e.field_name,
      oldValue: e.old_value,
      newValue: e.new_value,
      changedAt: e.changed_at,
      changedBy: e.changed_by,
    }));
  },

  getSubtasks: async (taskId: string): Promise<TaskPayload[]> => {
    const res = await apiGetPaginated<BackendTask>(`/tasks/${taskId}/subtasks`, { limit: 100 });
    return (res.items ?? []).map(mapTask);
  },

  // ── Comments ───────────────────────────────────────────────────
  listComments: async (
    targetType: 'task' | 'project' | 'epic' | 'sprint',
    targetId: string,
  ): Promise<CommentPayload[]> => {
    const res = await apiGet<{ items: BackendComment[]; total: number }>(
      '/comments/',
      { target_type: targetType, target_id: targetId },
    );
    return (res.data.items ?? []).map(mapComment);
  },

  addComment: async (payload: {
    targetType: 'task' | 'project' | 'epic' | 'sprint';
    targetId: string;
    content: string;
    contentFormat?: 'markdown' | 'wysiwyg' | 'plain';
    parentCommentId?: string;
  }): Promise<CommentPayload> => {
    const res = await apiPost<BackendComment>('/comments/', {
      target_type: payload.targetType,
      target_id: payload.targetId,
      content: payload.content.trim() ? payload.content : null,
      content_format: payload.contentFormat ?? 'markdown',
      parent_comment_id: payload.parentCommentId,
    });
    return mapComment(res.data);
  },

  deleteComment: async (commentId: string): Promise<void> => {
    await apiDelete(`/comments/${commentId}`);
  },

  addCommentAttachment: async (
    commentId: string,
    file: { uri: string; name: string; mimeType?: string | null },
    attachmentType: 'image' | 'video' | 'file' | 'link' | 'voice' = 'file',
  ): Promise<CommentAttachmentShape> => {
    const form = buildUploadFormData(file, { attachment_type: attachmentType });
    const res = await apiPostMultipart<{
      id: string;
      file_id: string;
      url?: string | null;
      attachment_type?: string | null;
      name?: string | null;
      size_bytes?: number | null;
      preview_url?: string | null;
      created_at?: string | null;
    }>(`/comments/${commentId}/attachments`, form);
    return {
      id: res.data.id,
      fileId: res.data.file_id,
      url: res.data.url ?? undefined,
      attachmentType: res.data.attachment_type ?? undefined,
      name: res.data.name ?? undefined,
      sizeBytes: res.data.size_bytes ?? undefined,
      previewUrl: res.data.preview_url ?? undefined,
      createdAt: res.data.created_at ?? undefined,
    };
  },

  // ── Sprints ────────────────────────────────────────────────────
  getSprints: async (workspaceId: string, projectId: string): Promise<SprintPayload[]> => {
    const res = await apiGet<BackendSprint[]>(
      `/workspaces/${workspaceId}/projects/${projectId}/sprints`,
    );
    return (res.data ?? []).map(mapSprint);
  },

  getActiveSprint: async (workspaceId: string, projectId: string): Promise<SprintPayload | null> => {
    try {
      const res = await apiGet<BackendSprint>(
        `/workspaces/${workspaceId}/projects/${projectId}/sprints/active`,
      );
      return mapSprint(res.data);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) return null;
      throw err;
    }
  },

  createSprint: async (
    workspaceId: string,
    projectId: string,
    payload: { name: string; goal?: string; startDate?: string; endDate?: string },
  ): Promise<SprintPayload> => {
    const res = await apiPost<BackendSprint>(
      `/workspaces/${workspaceId}/projects/${projectId}/sprints`,
      { name: payload.name, goal: payload.goal, start_date: payload.startDate, end_date: payload.endDate },
    );
    return mapSprint(res.data);
  },

  startSprint: async (workspaceId: string, projectId: string, sprintId: string): Promise<void> => {
    await apiPost(`/workspaces/${workspaceId}/projects/${projectId}/sprints/${sprintId}/start`);
  },

  completeSprint: async (workspaceId: string, projectId: string, sprintId: string): Promise<void> => {
    await apiPost(`/workspaces/${workspaceId}/projects/${projectId}/sprints/${sprintId}/complete`);
  },

  // ── Epics ──────────────────────────────────────────────────────
  getEpics: async (workspaceId: string, projectId: string): Promise<EpicPayload[]> => {
    const res = await apiGet<BackendEpic[]>(
      `/workspaces/${workspaceId}/projects/${projectId}/epics`,
    );
    return (res.data ?? []).map(mapEpic);
  },

  createEpic: async (
    workspaceId: string,
    projectId: string,
    payload: { name: string; description?: string; color?: string },
  ): Promise<EpicPayload> => {
    const res = await apiPost<BackendEpic>(
      `/workspaces/${workspaceId}/projects/${projectId}/epics`,
      { name: payload.name, description: payload.description, color: payload.color },
    );
    return mapEpic(res.data);
  },

  // ── Board / Workflow ───────────────────────────────────────────
  getBoardData: async (
    workspaceId: string,
    projectId: string,
  ): Promise<{ columns: BoardColumnPayload[]; workflowStatuses: WorkflowStatusPayload[] }> => {
    const res = await apiGet<{
      columns: BackendBoardColumn[];
      workflow_statuses: BackendWorkflowStatus[];
    }>(`/workspaces/${workspaceId}/projects/${projectId}/board`);
    return {
      columns: (res.data.columns ?? []).map(mapBoardColumn),
      workflowStatuses: (res.data.workflow_statuses ?? []).map(mapWorkflowStatus),
    };
  },

  // ── Communication BC: Chats ────────────────────────────────────
  listChats: async (): Promise<ChatPayload[]> => {
    const res = await apiGet<{ items: BackendChat[]; total: number }>(
      '/chats/',
      { limit: 200 },
    );
    return (res.data.items ?? []).map(mapChat);
  },

  getChat: async (chatId: string): Promise<ChatPayload> => {
    const res = await apiGet<BackendChat>(`/chats/${chatId}`);
    return mapChat(res.data);
  },

  getChats: async (workspaceId: string): Promise<ChatPayload[]> => {
    const res = await apiGet<{ items: BackendChat[]; total: number }>(
      '/chats/',
      { limit: 200, workspace_id: workspaceId },
    );
    return (res.data.items ?? []).map(mapChat);
  },

  createDm: async (otherUserId: string): Promise<ChatPayload> => {
    const res = await apiPost<BackendChat>('/chats/dm', { other_user_id: otherUserId });
    return mapChat(res.data);
  },

  createGroupChat: async (name: string): Promise<ChatPayload> => {
    const res = await apiPost<BackendChat>('/chats/group', { name });
    return mapChat(res.data);
  },

  createChannel: async (workspaceId: string, name: string): Promise<ChatPayload> => {
    const res = await apiPost<BackendChat>('/chats/channel', { name, workspace_id: workspaceId });
    return mapChat(res.data);
  },

  updateChat: async (
    chatId: string,
    payload: { name?: string; description?: string; icon?: string; color?: string },
  ): Promise<void> => {
    await apiPatch(`/chats/${chatId}`, payload);
  },

  archiveChat: async (chatId: string): Promise<void> => {
    await apiPost(`/chats/${chatId}/archive`);
  },

  markChatRead: async (chatId: string): Promise<void> => {
    await apiPost(`/chats/${chatId}/read`);
  },

  getChatUnreadCount: async (chatId: string): Promise<number> => {
    const res = await apiGet<{ unread_count: number }>(`/chats/${chatId}/unread-count`);
    return res.data.unread_count ?? 0;
  },

  addChatMember: async (chatId: string, userId: string): Promise<void> => {
    await apiPost(`/chats/${chatId}/members`, { user_id: userId });
  },

  removeChatMember: async (chatId: string, userId: string): Promise<void> => {
    await apiDelete(`/chats/${chatId}/members/${userId}`);
  },

  // ── Communication BC: Messages ─────────────────────────────────
  listMessages: async (
    chatId: string,
    filters?: { limit?: number; before?: string; after?: string },
  ): Promise<{ items: MessagePayload[]; hasMore: boolean }> => {
    const res = await apiGet<{
      items: BackendMessage[];
      total: number;
      has_more: boolean;
    }>(`/chats/${chatId}/messages`, {
      limit: filters?.limit ?? 100,
      before: filters?.before,
      after: filters?.after,
    });
    const items = (res.data.items ?? []).map(mapMessage).reverse();
    items.sort((a, b) => {
      const ta = a.createdAt ? Date.parse(a.createdAt) : 0;
      const tb = b.createdAt ? Date.parse(b.createdAt) : 0;
      return ta - tb;
    });
    return { items, hasMore: res.data.has_more ?? false };
  },

  getChatMessages: async (chatId: string, limit = 50): Promise<MessagePayload[]> => {
    const result = await api.listMessages(chatId, { limit });
    return result.items;
  },

  sendMessage: async (
    chatId: string,
    payload: string | {
      content: string;
      contentFormat?: 'markdown' | 'plain';
      threadId?: string;
      replyToId?: string;
      messageType?: string;
    },
  ): Promise<MessagePayload> => {
    const p = typeof payload === 'string' ? { content: payload } : payload;
    const res = await apiPost<BackendMessage>(`/chats/${chatId}/messages`, {
      content: p.content.trim() ? p.content : null,
      content_format: p.contentFormat ?? 'markdown',
      thread_id: p.threadId,
      reply_to_id: p.replyToId,
      message_type: p.messageType ?? 'text',
    });
    return mapMessage(res.data);
  },

  addMessageAttachment: async (
    messageId: string,
    file: { uri: string; name: string; mimeType?: string | null },
    attachmentType: 'image' | 'video' | 'file' | 'link' | 'voice' = 'file',
  ): Promise<MessageAttachmentShape> => {
    const form = buildUploadFormData(file, { attachment_type: attachmentType });
    const res = await apiPostMultipart<{
      id: string;
      file_id: string;
      name?: string | null;
      filename?: string | null;
      size_bytes?: number | null;
      attachment_type?: string | null;
      mime_type?: string | null;
      url?: string | null;
      preview_url?: string | null;
    }>(`/messages/${messageId}/attachments`, form);
    return {
      id: res.data.id,
      fileId: res.data.file_id,
      filename: res.data.name ?? res.data.filename ?? file.name,
      sizeBytes: res.data.size_bytes ?? undefined,
      mimeType:
        res.data.mime_type ?? attachmentTypeToMime(res.data.attachment_type) ?? file.mimeType ?? undefined,
      url: res.data.url ?? undefined,
      previewUrl: res.data.preview_url ?? undefined,
    };
  },

  updateMessage: async (messageId: string, payload: { content: string; contentFormat?: string }): Promise<void> => {
    await apiPatch(`/messages/${messageId}`, {
      content: payload.content,
      content_format: payload.contentFormat ?? 'markdown',
    });
  },

  deleteMessage: async (messageId: string): Promise<void> => {
    await apiDelete(`/messages/${messageId}`);
  },

  addMessageReaction: async (messageId: string, emoji: string): Promise<void> => {
    await apiPost(`/messages/${messageId}/reactions`, { emoji });
  },

  removeMessageReaction: async (messageId: string, emoji: string): Promise<void> => {
    await apiDelete(`/messages/${messageId}/reactions/${encodeURIComponent(emoji)}`);
  },

  // ── Communication BC: Meetings ─────────────────────────────────
  listMyMeetings: async (filters?: {
    status?: string;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<MeetingPayload[]> => {
    const res = await apiGet<{ items: BackendMeeting[]; total: number }>(
      '/meetings/',
      { status: filters?.status, date_from: filters?.dateFrom, date_to: filters?.dateTo },
    );
    return (res.data.items ?? []).map(mapMeeting);
  },

  getMeeting: async (meetingId: string): Promise<MeetingPayload> => {
    const res = await apiGet<BackendMeeting>(`/meetings/${meetingId}`);
    return mapMeeting(res.data);
  },

  createMeeting: async (payload: {
    workspaceId: string;
    title: string;
    description?: string;
    meetingType?: string;
    scheduledAt?: string;
    durationMinutes?: number;
    location?: string;
    projectId?: string;
    participantIds?: string[];
    agenda?: string[];
    conferenceProvider?: string;
  }): Promise<MeetingPayload> => {
    const res = await apiPost<BackendMeeting>('/meetings/', {
      title: payload.title,
      description: payload.description,
      meeting_type: payload.meetingType ?? 'video_call',
      conference_provider: payload.conferenceProvider ?? 'internal',
      workspace_id: payload.workspaceId,
      project_id: payload.projectId,
      scheduled_at: payload.scheduledAt,
      duration_minutes: payload.durationMinutes,
      location: payload.location,
      participant_ids: payload.participantIds,
      agenda: payload.agenda,
    });
    return mapMeeting(res.data);
  },

  updateMeeting: async (
    meetingId: string,
    payload: {
      title?: string;
      description?: string;
      scheduledAt?: string;
      durationMinutes?: number;
      location?: string;
      agenda?: string[];
    },
  ): Promise<void> => {
    await apiPatch(`/meetings/${meetingId}`, {
      title: payload.title,
      description: payload.description,
      scheduled_at: payload.scheduledAt,
      duration_minutes: payload.durationMinutes,
      location: payload.location,
      agenda: payload.agenda,
    });
  },

  startMeeting: async (meetingId: string): Promise<void> => {
    await apiPost(`/meetings/${meetingId}/start`);
  },

  completeMeeting: async (meetingId: string): Promise<void> => {
    await apiPost(`/meetings/${meetingId}/complete`);
  },

  cancelMeeting: async (meetingId: string): Promise<void> => {
    await apiPost(`/meetings/${meetingId}/cancel`);
  },

  joinMeeting: async (meetingId: string): Promise<MeetingJoinPayload> => {
    const res = await apiPost<{
      join_url: string;
      access_token?: string | null;
      provider: string;
    }>(`/meetings/${meetingId}/join`);
    return {
      joinUrl: res.data.join_url,
      accessToken: res.data.access_token ?? undefined,
      provider: res.data.provider,
    };
  },

  updateMeetingRsvp: async (
    meetingId: string,
    rsvp: 'pending' | 'accepted' | 'declined' | 'tentative',
  ): Promise<void> => {
    await apiPost(`/meetings/${meetingId}/rsvp`, { rsvp_status: rsvp });
  },

  // ── Notifications ──────────────────────────────────────────────
  getNotifications: async (params?: {
    workspaceId?: string;
    type?: string;
    isRead?: boolean;
    page?: number;
    limit?: number;
  } | string): Promise<NotificationPayload[]> => {
    const p = typeof params === 'string' ? { workspaceId: params } : params;
    const query: Record<string, string> = {};
    if (p?.workspaceId) query.workspace_id = p.workspaceId;
    if (p?.type) query.notification_type = p.type;
    if (p?.isRead !== undefined) query.is_read = String(p.isRead);
    if (p?.page) query.page = String(p.page);
    query.limit = String(p?.limit ?? 50);
    const res = await apiGet<BackendNotification[]>('/notifications/', query);
    return (res.data ?? []).map(mapNotification);
  },

  markNotificationRead: async (notificationId: string): Promise<void> => {
    await apiPatch(`/notifications/${notificationId}/read`, {});
  },

  markAllNotificationsRead: async (workspaceId?: string): Promise<void> => {
    await apiPost('/notifications/read-all', workspaceId ? { workspace_id: workspaceId } : {});
  },

  getNotificationsConnectionInfo: async (): Promise<NotificationConnectionInfo> => {
    type BackendCI = {
      websocket_url: string;
      auth_method: string;
      auth_param: string;
      heartbeat_interval_sec: number;
      server_events: string[];
      client_messages: string[];
    };
    const res = await apiGet<BackendCI>('/notifications/connection-info');
    return {
      websocketUrl: res.data.websocket_url,
      authMethod: res.data.auth_method,
      authParam: res.data.auth_param,
      heartbeatIntervalSec: res.data.heartbeat_interval_sec,
      serverEvents: res.data.server_events ?? [],
      clientMessages: res.data.client_messages ?? [],
    };
  },

  getWsToken: async (): Promise<string> => {
    const token = await getAccessToken();
    if (!token) throw new Error('No access token available for WS');
    return token;
  },

  // ── Files ─────────────────────────────────────────────────────
  /**
   * Request a temporary presigned download URL for a file. The returned URL
   * is short-lived and does NOT require an `Authorization` header — safe to
   * use directly inside an `Image` src or `Linking.openURL`.
   */
  getFileDownloadUrl: async (fileId: string): Promise<FileDownloadPayload> => {
    const res = await apiGet<{
      url: string;
      expires_in: number;
      file_id: string;
      name: string;
      mime_type: string;
      size_bytes: number;
    }>(`/files/${fileId}/download`);
    return {
      url: rewriteStorageUrl(res.data.url) ?? res.data.url,
      expiresIn: res.data.expires_in,
      fileId: res.data.file_id,
      name: res.data.name,
      mimeType: res.data.mime_type,
      sizeBytes: res.data.size_bytes,
    };
  },

  // ── Analytics (computed from tasks) ────────────────────────────
  getAnalytics: async (_wsId?: string): Promise<AnalyticsPayload> => {
    try {
      const tasks = await api.getTasks(_wsId);
      const dist: Record<string, number> = {};
      tasks.forEach((t) => (dist[t.status] = (dist[t.status] ?? 0) + 1));
      const isDone = (s: string) => {
        const l = s?.toLowerCase() ?? '';
        return l === 'done' || l === 'completed' || l === 'closed';
      };
      return {
        throughput: tasks.filter((t) => isDone(t.status)).length,
        overdue: tasks.filter(
          (t) => t.dueDate && new Date(t.dueDate) < new Date() && !isDone(t.status),
        ).length,
        totalTasks: tasks.length,
        statusDistribution: dist,
      };
    } catch {
      return { throughput: 0, overdue: 0, totalTasks: 0, statusDistribution: {} };
    }
  },
};

// Backward-compatible alias for screens that imported the old name.
export const mobileApi = api;

// Re-export ApiError for convenience
export { ApiError } from './api-client';
