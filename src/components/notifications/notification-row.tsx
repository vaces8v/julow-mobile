import { SigmaTypo } from '@/constants/sigma';
import type { SemanticTheme } from '@/hooks/use-semantic-theme';
import type { NotificationPayload } from '@/lib/api';
import type { Translations } from '@/i18n/translations';
import {
  CheckmarkCircle02Icon,
  Comment01Icon,
  Comment02Icon,
  MessageMultiple02Icon,
  Notification03Icon,
  Task01Icon,
  UserAdd01Icon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import React, { memo, useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import ReanimatedSwipeable, { SwipeDirection } from 'react-native-gesture-handler/ReanimatedSwipeable';

type NotifVisualType = 'mention' | 'comment' | 'task' | 'chat' | 'invite' | 'system';

function classifyNotifType(rawType: string | undefined): NotifVisualType {
  const t = (rawType ?? '').toLowerCase();
  if (t.includes('mention')) return 'mention';
  if (t.includes('comment')) return 'comment';
  if (t.includes('chat') || t.includes('message')) return 'chat';
  if (t.includes('invit') || t.includes('member')) return 'invite';
  if (t.includes('task')) return 'task';
  return 'system';
}

const VISUAL_META: Record<NotifVisualType, { color: string; icon: typeof Notification03Icon }> = {
  mention: { color: '#8b5cf6', icon: Comment01Icon },
  comment: { color: '#06b6d4', icon: Comment02Icon },
  task: { color: '#22c55e', icon: Task01Icon },
  chat: { color: '#3b82f6', icon: MessageMultiple02Icon },
  invite: { color: '#f97316', icon: UserAdd01Icon },
  system: { color: '#6b7280', icon: Notification03Icon },
};

export function formatNotifRelativeTime(iso: string, nn: Translations['notifications']): string {
  try {
    const date = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const min = Math.floor(diffMs / 60000);
    const hr = Math.floor(min / 60);
    const day = Math.floor(hr / 24);

    if (min < 1) return nn.timeNow;
    if (min < 60) return nn.timeMinutes.replace('{{n}}', String(min));
    if (hr < 24) return nn.timeHours.replace('{{n}}', String(hr));
    if (day < 7) return nn.timeDays.replace('{{n}}', String(day));

    return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
  } catch {
    return '';
  }
}

type Props = {
  notif: NotificationPayload;
  c: SemanticTheme;
  labels: Translations['notifications'];
  onPress: () => void;
  onMarkRead: () => void;
  showDivider: boolean;
};

function SwipeMarkReadAction({
  c,
  label,
  color,
}: {
  c: SemanticTheme;
  label: string;
  color: string;
}) {
  return (
    <View style={[styles.swipeAction, { backgroundColor: color }]}>
      <HugeiconsIcon icon={CheckmarkCircle02Icon} size={20} color={c.accentForeground} strokeWidth={2} />
      <Text style={[styles.swipeActionText, { color: c.accentForeground }]}>{label}</Text>
    </View>
  );
}

function NotificationRowInner({ notif, c, labels, onPress, onMarkRead, showDivider }: Props) {
  const visual = classifyNotifType(notif.notificationType);
  const meta = VISUAL_META[visual];
  const isUnread = !notif.isRead;
  const body = notif.body ?? notif.message;

  const renderRightActions = useCallback(
    () => <SwipeMarkReadAction c={c} label={labels.swipeMarkRead} color={c.success} />,
    [c, labels.swipeMarkRead],
  );

  const handleSwipeOpen = useCallback(
    (direction: SwipeDirection.LEFT | SwipeDirection.RIGHT) => {
      if (direction === SwipeDirection.RIGHT && isUnread) onMarkRead();
    },
    [isUnread, onMarkRead],
  );

  const row = (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: pressed ? c.surfaceSecondary : 'transparent',
          borderLeftColor: isUnread ? meta.color : 'transparent',
        },
      ]}
      android_ripple={{ color: c.surfaceSecondary }}
    >
      <View style={[styles.icon, { backgroundColor: meta.color + '18' }]}>
        <HugeiconsIcon icon={meta.icon} size={19} color={meta.color} strokeWidth={1.8} />
      </View>
      <View style={styles.content}>
        <View style={styles.rowHead}>
          <Text style={[styles.rowTitle, { color: c.foreground, fontWeight: isUnread ? '700' : '600' }]} numberOfLines={1}>
            {notif.title}
          </Text>
          <Text style={[styles.rowTime, { color: c.muted }]}>
            {formatNotifRelativeTime(notif.createdAt, labels)}
          </Text>
        </View>
        {!!body && (
          <Text style={[styles.rowBody, { color: c.muted }]} numberOfLines={2}>
            {body}
          </Text>
        )}
      </View>
      {isUnread ? <View style={[styles.unreadDot, { backgroundColor: meta.color }]} /> : null}
    </Pressable>
  );

  return (
    <View>
      {isUnread ? (
        <ReanimatedSwipeable
          renderRightActions={renderRightActions}
          onSwipeableOpen={handleSwipeOpen}
          overshootRight={false}
          friction={2}
          rightThreshold={48}
        >
          {row}
        </ReanimatedSwipeable>
      ) : (
        row
      )}
      {showDivider ? <View style={[styles.divider, { backgroundColor: c.separator }]} /> : null}
    </View>
  );
}

export const NotificationRow = memo(NotificationRowInner);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderLeftWidth: 3,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { flex: 1, minWidth: 0 },
  rowHead: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  rowTitle: { flex: 1, fontSize: SigmaTypo.bodySmall, letterSpacing: -0.1 },
  rowTime: { fontSize: SigmaTypo.captionSmall, fontWeight: '500' },
  rowBody: { fontSize: SigmaTypo.caption, fontWeight: '500', marginTop: 4, lineHeight: 17 },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
  },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 66 },
  swipeAction: {
    width: 88,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  swipeActionText: {
    fontSize: SigmaTypo.captionSmall,
    fontWeight: '700',
  },
});
