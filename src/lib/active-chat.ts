/**
 * Track which chat the user is currently looking at.
 *
 * Used by the toast layer to suppress `chat_message` notifications when the
 * user is already viewing that chat — the new message is already visible in
 * the chat feed, so an extra toast would just be noise.
 *
 * This is intentionally module-level (not React state): the chat screen and
 * the toast layer live in different components/contexts, and we want
 * synchronous reads from event handlers (`subscribeWsEvent`).
 */

let activeChatId: string | null = null;

export function setActiveChatId(id: string | null): void {
  activeChatId = id;
}

export function getActiveChatId(): string | null {
  return activeChatId;
}
