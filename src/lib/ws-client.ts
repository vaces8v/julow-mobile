/**
 * Julow Mobile — WebSocket client for real-time events.
 *
 * Connects to the backend WS endpoint (`/ws/notifications?token=<jwt>`)
 * and dispatches incoming events to subscribers.
 *
 * Features:
 *  - Exponential backoff reconnect (1s → 2s → … → 30s max)
 *  - Heartbeat ping/pong every `heartbeatIntervalSec` seconds
 *  - Chat subscribe/unsubscribe for presence tracking
 *  - Survives reconnect: replays `chat.subscribe` for active chats
 *
 * Protocol (matches backend `ws.py`):
 *  - Server → Client: JSON `{ "event_type": "...", "payload": {...} }`
 *  - Client → Server: `"ping"` for heartbeat (server replies `"pong"`)
 *  - Client → Server: JSON `{ "action": "chat.subscribe", "chat_id": "..." }`
 *  - Client → Server: JSON `{ "action": "chat.unsubscribe", "chat_id": "..." }`
 */

import { api } from '@/lib/api';
import { ensureFreshAccessToken } from '@/lib/api-client';

// ── Types ────────────────────────────────────────────────────────

export interface WsEvent {
  type: string;
  payload: Record<string, unknown>;
}

type WsEventHandler = (payload: Record<string, unknown>) => void;

// ── State ────────────────────────────────────────────────────────

const handlers = new Map<string, Set<WsEventHandler>>();
const subscribedChats = new Set<string>();

let ws: WebSocket | null = null;
let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let attempts = 0;
let enabled = false;
let destroyed = false;

// ── Public API ───────────────────────────────────────────────────

/**
 * Subscribe to a specific WS event type. Returns an unsubscribe function.
 *
 * Example:
 * ```ts
 * const unsub = subscribeWsEvent('chat.message.created', (payload) => {
 *   console.log('new message in chat', payload.chat_id);
 * });
 * ```
 */
export function subscribeWsEvent(
  eventType: string,
  handler: WsEventHandler,
): () => void {
  let set = handlers.get(eventType);
  if (!set) {
    set = new Set();
    handlers.set(eventType, set);
  }
  set.add(handler);

  return () => {
    const s = handlers.get(eventType);
    if (!s) return;
    s.delete(handler);
    if (s.size === 0) handlers.delete(eventType);
  };
}

/**
 * Dispatch an incoming event to all matching subscribers.
 */
function dispatchEvent(eventType: string, payload: Record<string, unknown>): void {
  const set = handlers.get(eventType);
  if (!set) return;
  set.forEach((h) => {
    try {
      h(payload);
    } catch (err) {
      console.error('[ws-client] handler threw', { eventType, err });
    }
  });
}

/**
 * Tell the backend "I'm currently viewing this chat" — suppresses
 * persisted notifications for new messages in this chat.
 */
export function subscribeChat(chatId: string): void {
  if (!chatId || subscribedChats.has(chatId)) return;
  subscribedChats.add(chatId);
  sendJson({ action: 'chat.subscribe', chat_id: chatId });
}

/**
 * Unsubscribe from chat presence (left chat screen / switched chat).
 */
export function unsubscribeChat(chatId: string): void {
  if (!chatId || !subscribedChats.has(chatId)) return;
  subscribedChats.delete(chatId);
  sendJson({ action: 'chat.unsubscribe', chat_id: chatId });
}

/**
 * Start the WebSocket connection. Safe to call multiple times.
 * Typically called once when user is authenticated.
 */
export function startWsClient(): void {
  if (enabled) return;
  enabled = true;
  destroyed = false;
  void connect();
}

/**
 * Stop and close the WebSocket connection. Clears all state.
 * Call on logout.
 */
export function stopWsClient(): void {
  enabled = false;
  destroyed = true;
  clearTimers();
  if (ws) {
    try { ws.close(); } catch { /* noop */ }
    ws = null;
  }
  handlers.clear();
  subscribedChats.clear();
  attempts = 0;
}

// ── Internals ────────────────────────────────────────────────────

function clearTimers(): void {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
}

function scheduleReconnect(): void {
  if (!enabled || destroyed) return;
  attempts++;
  const delay = Math.min(30_000, 1000 * 2 ** (attempts - 1));
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    void connect();
  }, delay);
}

function sendJson(data: unknown): void {
  if (!ws || ws.readyState !== WebSocket.OPEN) return;
  try {
    ws.send(JSON.stringify(data));
  } catch {
    /* WS may have closed between check and send */
  }
}

async function connect(): Promise<void> {
  if (!enabled || destroyed) return;

  try {
    await ensureFreshAccessToken();
    const [info, token] = await Promise.all([
      api.getNotificationsConnectionInfo(),
      api.getWsToken(),
    ]);
    if (!enabled || destroyed) return;

    const sep = info.websocketUrl.includes('?') ? '&' : '?';
    const url = `${info.websocketUrl}${sep}${info.authParam}=${encodeURIComponent(token)}`;

    ws = new WebSocket(url);

    ws.onopen = () => {
      attempts = 0;
      // Start heartbeat
      const intervalMs = Math.max(5, info.heartbeatIntervalSec) * 1000;
      heartbeatTimer = setInterval(() => {
        try { ws?.send('ping'); } catch { /* onclose handles it */ }
      }, intervalMs);

      // Replay chat subscriptions (survived reconnect)
      subscribedChats.forEach((chatId) => {
        sendJson({ action: 'chat.subscribe', chat_id: chatId });
      });
    };

    ws.onmessage = (event) => {
      if (typeof event.data === 'string' && event.data === 'pong') return;
      if (typeof event.data !== 'string') return;
      try {
        const parsed = JSON.parse(event.data) as { event_type?: unknown; payload?: unknown };
        if (typeof parsed.event_type !== 'string') return;
        dispatchEvent(
          parsed.event_type,
          (parsed.payload as Record<string, unknown>) ?? {},
        );
      } catch {
        // Ignore non-JSON
      }
    };

    ws.onclose = () => {
      clearTimers();
      ws = null;
      if (!destroyed) scheduleReconnect();
    };

    ws.onerror = () => {
      // onclose will fire after onerror — let it handle reconnect
    };
  } catch (err) {
    console.warn('[ws-client] connect failed:', err);
    clearTimers();
    scheduleReconnect();
  }
}
