import { Fade } from '@/components/ui/fade';
import { SigmaRadius, SigmaTypo } from '@/constants/sigma';
import { useSemanticTheme } from '@/hooks/use-semantic-theme';
import { useI18n } from '@/i18n/context';

import { api, type NotificationPayload } from '@/lib/api';
import {
  ArrowLeft01Icon,
  CheckmarkCircle02Icon,
  Comment01Icon,
  Comment02Icon,
  MessageMultiple02Icon,
  Notification03Icon,
  Task01Icon,
  UserAdd01Icon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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

const VISUAL_META: Record<NotifVisualType, { color: string; icon: any }> = {
  mention: { color: '#8b5cf6', icon: Comment01Icon },
  comment: { color: '#06b6d4', icon: Comment02Icon },
  task: { color: '#22c55e', icon: Task01Icon },
  chat: { color: '#3b82f6', icon: MessageMultiple02Icon },
  invite: { color: '#f97316', icon: UserAdd01Icon },
  system: { color: '#6b7280', icon: Notification03Icon },
};

function formatRelative(iso: string, locale: 'en' | 'ru' | 'de'): string {
  try {
    const date = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const min = Math.floor(diffMs / 60000);
    const hr = Math.floor(min / 60);
    const day = Math.floor(hr / 24);
    if (locale === 'ru') {
      if (min < 1) return 'только что';
      if (min < 60) return `${min} мин`;
      if (hr < 24) return `${hr} ч`;
      if (day < 7) return `${day} дн`;
    } else if (locale === 'de') {
      if (min < 1) return 'gerade';
      if (min < 60) return `vor ${min} Min`;
      if (hr < 24) return `vor ${hr} Std`;
      if (day < 7) return `vor ${day} T`;
    } else {
      if (min < 1) return 'now';
      if (min < 60) return `${min}m`;
      if (hr < 24) return `${hr}h`;
      if (day < 7) return `${day}d`;
    }
    const tag = locale === 'ru' ? 'ru-RU' : locale === 'de' ? 'de-DE' : 'en-US';
    return date.toLocaleDateString(tag, { day: 'numeric', month: 'short' });
  } catch {
    return '';
  }
}

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const c = useSemanticTheme();
  const { locale } = useI18n();

  const [items, setItems] = useState<NotificationPayload[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const list = await api.getNotifications({ limit: 50 });
      setItems(list.filter((n) => !n.isArchived));
    } catch (e) {
      console.warn('Failed to load notifications', e);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await load();
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const handleMarkAllRead = useCallback(async () => {
    try {
      await api.markAllNotificationsRead();
      setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch { /* ignore */ }
  }, []);

  const handleNotifPress = useCallback(async (notif: NotificationPayload) => {
    // Optimistic mark-read
    if (!notif.isRead) {
      setItems((prev) => prev.map((n) => (n.id === notif.id ? { ...n, isRead: true } : n)));
      api.markNotificationRead(notif.id).catch(() => {});
    }

    const data = notif.data ?? {};
    const targetType = data.target_type as string | undefined;
    const targetId = data.target_id as string | undefined;
    const taskId =
      (data.task_id as string | undefined) ??
      (targetType === 'task' ? targetId : undefined);
    const projectId =
      (data.project_id as string | undefined) ??
      (targetType === 'project' ? targetId : undefined);
    const chatId = data.chat_id as string | undefined;

    if (chatId) {
      router.push(`/chat/${chatId}` as any);
      return;
    }
    if (taskId) {
      // Try fetch task to find its project, then navigate
      try {
        const task = await api.getTask(taskId);
        if (task?.projectId) {
          router.push(`/project/${task.projectId}?task=${taskId}` as any);
          return;
        }
      } catch { /* ignore */ }
    }
    if (projectId) {
      router.push(`/project/${projectId}` as any);
    }
  }, []);

  const unreadCount = items.filter((n) => !n.isRead).length;

  const title = locale === 'en' ? 'Notifications' : locale === 'de' ? 'Benachrichtigungen' : 'Уведомления';
  const emptyText = locale === 'en' ? 'No notifications yet' : locale === 'de' ? 'Keine Benachrichtigungen' : 'Уведомлений пока нет';
  const markAllText = locale === 'en' ? 'Mark all as read' : locale === 'de' ? 'Alle gelesen' : 'Прочитать все';

  return (
    <View style={[styles.fill, { backgroundColor: c.background }]}>
      <StatusBar barStyle={c.scheme === 'dark' ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8, borderBottomColor: c.border }]}>
        <Pressable
          onPress={() => router.back()}
          style={styles.backBtn}
          hitSlop={10}
          android_ripple={{ color: c.surfaceSecondary, borderless: true, radius: 22 }}
        >
          <HugeiconsIcon icon={ArrowLeft01Icon} size={22} color={c.foreground} strokeWidth={1.8} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: c.foreground }]} numberOfLines={1}>
            {title}
          </Text>
          {unreadCount > 0 && (
            <Text style={[styles.headerSub, { color: c.muted }]}>
              {unreadCount} {locale === 'en' ? 'unread' : locale === 'de' ? 'ungelesen' : 'непрочитанных'}
            </Text>
          )}
        </View>
        {unreadCount > 0 && (
          <Pressable onPress={handleMarkAllRead} style={[styles.markAllBtn, { backgroundColor: c.accent + '14' }]} hitSlop={6}>
            <HugeiconsIcon icon={CheckmarkCircle02Icon} size={14} color={c.accent} strokeWidth={2} />
            <Text style={[styles.markAllText, { color: c.accent }]}>{markAllText}</Text>
          </Pressable>
        )}
      </View>

      {/* List */}
      {loading ? (
        <View style={styles.centerPad}>
          <ActivityIndicator color={c.muted} />
        </View>
      ) : items.length === 0 ? (
        <View style={styles.centerPad}>
          <View style={[styles.emptyIcon, { backgroundColor: c.surface, borderColor: c.border }]}>
            <HugeiconsIcon icon={Notification03Icon} size={28} color={c.muted} strokeWidth={1.6} />
          </View>
          <Text style={[styles.emptyText, { color: c.muted }]}>{emptyText}</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(n) => n.id}
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24, gap: 8 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.foreground} colors={[c.accent]} />
          }
          renderItem={({ item, index }) => (
            <Fade delay={Math.min(index * 30, 240)} initialY={6}>
              <NotifRow notif={item} c={c} locale={locale} onPress={() => handleNotifPress(item)} />
            </Fade>
          )}
        />
      )}
    </View>
  );
}

function NotifRow({
  notif,
  c,
  locale,
  onPress,
}: {
  notif: NotificationPayload;
  c: ReturnType<typeof useSemanticTheme>;
  locale: 'en' | 'ru' | 'de';
  onPress: () => void;
}) {
  const visual = classifyNotifType(notif.notificationType);
  const meta = VISUAL_META[visual];
  const isUnread = !notif.isRead;

  return (
    <Animated.View entering={FadeIn.duration(220)} exiting={FadeOut.duration(140)} layout={LinearTransition.springify().damping(22)}>
      <Pressable
        onPress={onPress}
        style={[
          styles.row,
          {
            backgroundColor: isUnread ? meta.color + '0d' : c.surface,
            borderColor: isUnread ? meta.color + '30' : c.border,
          },
        ]}
        android_ripple={{ color: c.surfaceSecondary }}
      >
        <View style={[styles.icon, { backgroundColor: meta.color + '22' }]}>
          <HugeiconsIcon icon={meta.icon} size={18} color={meta.color} strokeWidth={1.8} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={styles.rowHead}>
            <Text style={[styles.rowTitle, { color: c.foreground }]} numberOfLines={1}>
              {notif.title}
            </Text>
            {isUnread && <View style={[styles.unreadDot, { backgroundColor: meta.color }]} />}
          </View>
          {!!notif.body && (
            <Text style={[styles.rowBody, { color: c.muted }]} numberOfLines={2}>
              {notif.body}
            </Text>
          )}
          <Text style={[styles.rowDate, { color: c.muted }]}>
            {formatRelative(notif.createdAt, locale)}
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  header: {
    paddingHorizontal: 12,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: SigmaTypo.headline, fontWeight: '800', letterSpacing: -0.2 },
  headerSub: { fontSize: SigmaTypo.captionSmall, fontWeight: '500', marginTop: 1 },
  markAllBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 10, paddingVertical: 7, borderRadius: 10,
  },
  markAllText: { fontSize: SigmaTypo.captionSmall, fontWeight: '700' },

  centerPad: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 24 },
  emptyIcon: { width: 64, height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  emptyText: { fontSize: SigmaTypo.bodySmall, fontWeight: '500', textAlign: 'center' },

  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 14,
    borderRadius: SigmaRadius.lg,
    borderWidth: 1,
  },
  icon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  rowHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowTitle: { flex: 1, fontSize: SigmaTypo.bodySmall, fontWeight: '700' },
  unreadDot: { width: 8, height: 8, borderRadius: 4 },
  rowBody: { fontSize: SigmaTypo.caption, fontWeight: '500', marginTop: 4, lineHeight: 18 },
  rowDate: { fontSize: SigmaTypo.captionSmall, fontWeight: '500', marginTop: 6 },
});
