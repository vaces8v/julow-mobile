/**
 * Модель модуля «Сегодня» (см. apps/web) — данные по workspaceId.
 */

import type { TaskPayload } from './api';

export const TODAY_FOCUS_MAX = 3;
export const LOCAL_USER_ID = 'local-user';

export type FocusSlots = [string | null, string | null, string | null];

export type PresencePreset = 'deep_work' | 'meeting' | 'need_help' | 'available';

export type FocusSessionState = {
  taskId: string;
  targetSeconds: number;
  accumulatedSeconds: number;
  segmentStartedAt: number | null;
};

export type StandUpPost = {
  id: string;
  workspaceId: string;
  dayKey: string;
  userId: string;
  userName: string;
  yesterday: string;
  today: string;
  blockers: string;
  createdAt: string;
};

export type PresenceEntry = {
  userId: string;
  userName: string;
  preset: PresencePreset;
  taskId?: string;
  updatedAt: number;
};

export type TodayDayState = {
  focusSlots: FocusSlots;
  dayNote: string;
  myStandUp?: { yesterday: string; today: string; blockers: string };
  presence?: { preset: PresencePreset; taskId?: string };
  focusSession: FocusSessionState | null;
};

export type TodayWorkspaceBundle = {
  days: Record<string, TodayDayState>;
  standUps: StandUpPost[];
  presence: PresenceEntry[];
};

export function dayKeyFromDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function emptyFocusSlots(): FocusSlots {
  return [null, null, null];
}

export function defaultDayState(): TodayDayState {
  return {
    focusSlots: emptyFocusSlots(),
    dayNote: '',
    focusSession: null,
  };
}

export type TaskOption = TaskPayload & { projectName: string };
