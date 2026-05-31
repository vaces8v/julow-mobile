/** Локальная часть email (до @), без домена. */
export function emailLocalPart(email?: string | null): string | undefined {
  if (!email) return undefined;
  const part = email.split('@')[0]?.trim();
  return part || undefined;
}

/** Короткий фолбэк по UUID — первые 8 символов. */
export function shortUserId(userId: string): string {
  return userId.slice(0, 8);
}

/**
 * Имя участника чата: displayName → local-part email → короткий id.
 * Используется только в UI чатов.
 */
export function resolveChatParticipantName(params: {
  displayName?: string | null;
  email?: string | null;
  userId: string;
}): string {
  const displayName = params.displayName?.trim();
  if (displayName) return displayName;
  const local = emailLocalPart(params.email);
  if (local) return local;
  return shortUserId(params.userId);
}

export function chatParticipantInitials(name: string): string {
  return name.slice(0, 2).toUpperCase();
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Проверка, что строка похожа на UUID (identity LiveKit). */
export function isUuidLike(value: string): boolean {
  return UUID_RE.test(value.trim());
}

/** LiveKit name часто равен identity, если бэкенд не нашёл displayName. */
export function isLivekitNameFallback(
  livekitName: string | null | undefined,
  identity: string,
): boolean {
  const trimmed = livekitName?.trim();
  if (!trimmed) return true;
  if (trimmed === identity) return true;
  if (isUuidLike(trimmed)) return true;
  return false;
}

/**
 * Имя участника встречи: валидный LiveKit name → displayName → email local-part → короткий id.
 */
export function resolveMeetingParticipantName(params: {
  livekitName?: string | null;
  identity: string;
  displayName?: string | null;
  email?: string | null;
}): string {
  const trimmedLivekit = params.livekitName?.trim();
  if (
    trimmedLivekit &&
    !isLivekitNameFallback(trimmedLivekit, params.identity)
  ) {
    return trimmedLivekit;
  }

  return resolveChatParticipantName({
    displayName: params.displayName,
    email: params.email,
    userId: params.identity,
  });
}

export function meetingParticipantInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return parts
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('');
  }
  return chatParticipantInitials(name);
}
