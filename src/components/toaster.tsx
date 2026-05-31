/**
 * Julow Mobile — global toast layer.
 *
 * Two pieces:
 *  - `<Toaster />` — mount once at the root of the app. Renders the stack of
 *    visible toasts at the top of the screen.
 *  - `showToast(opts)` — imperative API callable from anywhere (event handlers,
 *    async flows, hooks). Returns the toast id so callers can `dismissToast(id)`
 *    early if they want.
 *
 * Behavior mirrors the web toast (see `julow-web/src/components/ui/toast.tsx`):
 * an optional title, body, kind-driven color accent, optional action button
 * and tap-to-go callback. Auto-dismisses after `duration` ms (default 5s).
 */

import { ToastSurface } from '@/components/toast-surface';
import { SigmaRadius, SigmaTypo } from '@/constants/sigma';
import { useSemanticTheme, type SemanticTheme } from '@/hooks/use-semantic-theme';
import {
  AlertCircleIcon,
  BubbleChatIcon,
  Cancel01Icon,
  CheckmarkCircle02Icon,
  Notification03Icon,
  Task01Icon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInUp, FadeOutUp, LinearTransition } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export type ToastKind =
  | 'notification'
  | 'message'
  | 'task'
  | 'success'
  | 'error'
  | 'info';

export interface ToastAction {
  label: string;
  onPress: () => void;
}

export interface ToastOptions {
  title: string;
  body?: string;
  kind?: ToastKind;
  onPress?: () => void;
  action?: ToastAction;
  duration?: number;
}

interface ToastItem extends ToastOptions {
  id: string;
}

type Listener = (toasts: ToastItem[]) => void;

const MAX_TOASTS = 3;
const DEFAULT_DURATION = 5000;

let toastsState: ToastItem[] = [];
const listeners = new Set<Listener>();

function emit(): void {
  const snap = toastsState;
  listeners.forEach((l) => l(snap));
}

function genId(): string {
  return `t_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function showToast(opts: ToastOptions): string {
  const id = genId();
  const item: ToastItem = { id, ...opts };
  toastsState = [item, ...toastsState].slice(0, MAX_TOASTS);
  emit();
  const duration = opts.duration ?? DEFAULT_DURATION;
  if (duration > 0) {
    setTimeout(() => dismissToast(id), duration);
  }
  return id;
}

export function dismissToast(id: string): void {
  const before = toastsState.length;
  toastsState = toastsState.filter((t) => t.id !== id);
  if (toastsState.length !== before) emit();
}

export function dismissAllToasts(): void {
  if (toastsState.length === 0) return;
  toastsState = [];
  emit();
}

// ── Visual mapping ────────────────────────────────────────────────

function kindMeta(kind: ToastKind | undefined, c: SemanticTheme) {
  switch (kind) {
    case 'message':
      return { icon: BubbleChatIcon, color: c.accent };
    case 'task':
      return { icon: Task01Icon, color: c.success };
    case 'success':
      return { icon: CheckmarkCircle02Icon, color: c.success };
    case 'error':
      return { icon: AlertCircleIcon, color: c.danger };
    case 'info':
      return { icon: Notification03Icon, color: c.accent };
    case 'notification':
    default:
      return { icon: Notification03Icon, color: c.accent };
  }
}

// ── Component ─────────────────────────────────────────────────────

export function Toaster() {
  const c = useSemanticTheme();
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<ToastItem[]>(toastsState);

  useEffect(() => {
    const l: Listener = (next) => setItems(next);
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  }, []);

  if (items.length === 0) return null;

  return (
    <View
      pointerEvents="box-none"
      style={[styles.root, { top: insets.top + 8 }]}
    >
      {items.map((t) => (
        <ToastCard key={t.id} item={t} c={c} />
      ))}
    </View>
  );
}

function ToastCard({ item, c }: { item: ToastItem; c: SemanticTheme }) {
  const { icon, color } = kindMeta(item.kind, c);
  const dismissed = useRef(false);

  const handleDismiss = () => {
    if (dismissed.current) return;
    dismissed.current = true;
    dismissToast(item.id);
  };

  const handlePress = () => {
    if (item.onPress) item.onPress();
    handleDismiss();
  };

  const handleAction = () => {
    if (item.action) item.action.onPress();
    handleDismiss();
  };

  return (
    <Animated.View
      entering={FadeInUp.springify().damping(20).stiffness(220)}
      exiting={FadeOutUp.duration(240)}
      layout={LinearTransition.springify().damping(20).stiffness(220)}
    >
      <ToastSurface c={c} accent={color}>
        <Pressable
          onPress={handlePress}
          style={({ pressed }) => [styles.pressArea, { opacity: pressed ? 0.88 : 1 }]}
        >
          <View
            style={[
              styles.iconWrap,
              {
                backgroundColor: color + (c.scheme === 'dark' ? '28' : '18'),
                borderColor: color + (c.scheme === 'dark' ? '55' : '35'),
              },
            ]}
          >
            <HugeiconsIcon icon={icon} size={20} color={color} strokeWidth={1.8} />
          </View>
          <View style={styles.content}>
            <Text
              numberOfLines={1}
              selectable
              style={[styles.title, { color: c.foreground }]}
            >
              {item.title}
            </Text>
            {item.body ? (
              <Text
                numberOfLines={2}
                selectable
                style={[styles.body, { color: c.muted }]}
              >
                {item.body}
              </Text>
            ) : null}
          </View>
          {item.action ? (
            <Pressable
              onPress={handleAction}
              hitSlop={8}
              style={({ pressed }) => [
                styles.actionBtn,
                {
                  backgroundColor: color + (c.scheme === 'dark' ? '38' : '22'),
                  borderColor: color + (c.scheme === 'dark' ? '55' : '40'),
                  opacity: pressed ? 0.72 : 1,
                },
              ]}
            >
              <Text style={[styles.actionLabel, { color }]} numberOfLines={1}>
                {item.action.label}
              </Text>
            </Pressable>
          ) : (
            <Pressable
              onPress={handleDismiss}
              hitSlop={10}
              style={({ pressed }) => [
                styles.closeBtn,
                {
                  backgroundColor: c.scheme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.05)',
                  opacity: pressed ? 0.65 : 1,
                },
              ]}
            >
              <HugeiconsIcon icon={Cancel01Icon} size={15} color={c.muted} strokeWidth={2} />
            </Pressable>
          )}
        </Pressable>
      </ToastSurface>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    left: 14,
    right: 14,
    zIndex: 9999,
    elevation: 9999,
    gap: 10,
  },
  pressArea: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    paddingLeft: 16,
    gap: 12,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    gap: 3,
  },
  title: {
    fontSize: SigmaTypo.body,
    fontWeight: '600',
    letterSpacing: -0.15,
  },
  body: {
    fontSize: SigmaTypo.caption,
    lineHeight: SigmaTypo.caption + 4,
  },
  actionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: SigmaRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  actionLabel: {
    fontSize: SigmaTypo.caption,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
