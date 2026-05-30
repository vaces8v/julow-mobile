import type { CommentAttachmentShape, MessageAttachmentShape } from '@/lib/api';

export const CHAT_IMAGE_EXT = /\.(jpe?g|png|gif|webp|heic|heif|bmp|avif|svg)$/i;
export const CHAT_VIDEO_EXT = /\.(mp4|mov|webm|mkv|avi|m4v|3gp)$/i;

export type ChatAttachmentKind = 'image' | 'video' | 'file';

export function classifyChatAttachment(att: MessageAttachmentShape): ChatAttachmentKind {
  const mime = (att.mimeType ?? '').toLowerCase();
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/')) return 'video';
  const name = att.filename ?? '';
  if (CHAT_IMAGE_EXT.test(name)) return 'image';
  if (CHAT_VIDEO_EXT.test(name)) return 'video';
  return 'file';
}

export function formatAttachmentSize(bytes?: number): string {
  if (!bytes || bytes <= 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function attachmentFileExt(name: string): string {
  const dot = name.lastIndexOf('.');
  return dot >= 0 ? name.slice(dot + 1).toUpperCase().slice(0, 4) : 'FILE';
}

export type FileDisplaySource = {
  uri: string;
  headers?: Record<string, string>;
};

export type CommentAttachmentKind = 'image' | 'video' | 'file' | 'link' | 'voice';

export function inferAttachmentTypeFromMeta(
  name: string,
  mimeType?: string | null,
): CommentAttachmentKind {
  const type = (mimeType ?? '').toLowerCase();
  if (type.startsWith('image/')) return 'image';
  if (type.startsWith('video/')) return 'video';
  if (CHAT_IMAGE_EXT.test(name)) return 'image';
  if (CHAT_VIDEO_EXT.test(name)) return 'video';
  return 'file';
}

export function commentAttachmentToMessageShape(att: CommentAttachmentShape): MessageAttachmentShape {
  const filename = att.name ?? 'File';
  const mimeFromType = att.attachmentType?.toLowerCase();
  let mimeType: string | undefined;
  if (mimeFromType === 'image') mimeType = 'image/*';
  else if (mimeFromType === 'video') mimeType = 'video/*';
  else if (mimeFromType === 'voice') mimeType = 'audio/*';

  if (!mimeType) {
    if (CHAT_IMAGE_EXT.test(filename)) mimeType = 'image/jpeg';
    else if (CHAT_VIDEO_EXT.test(filename)) mimeType = 'video/mp4';
  }

  return {
    id: att.id,
    fileId: att.fileId,
    filename,
    sizeBytes: att.sizeBytes,
    mimeType,
    url: att.url,
    previewUrl: att.previewUrl,
  };
}
