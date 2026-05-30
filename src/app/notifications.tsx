import { HeaderBlurBackground } from '@/components/header-blur-background';
import { NotificationEmptyArt } from '@/components/notifications/notification-empty-art';
import { NotificationRow } from '@/components/notifications/notification-row';
import { Fade } from '@/components/ui/fade';
import { SigmaRadius, SigmaTypo } from '@/constants/sigma';
import { useSemanticTheme } from '@/hooks/use-semantic-theme';
import { useI18n } from '@/i18n/context';
import { api, type NotificationPayload } from '@/lib/api';
import { cachedApi } from '@/lib/cache/cached-api';
import { useCacheSync } from '@/lib/cache/use-cache-sync';
import {
  ArrowLeft01Icon,
  CheckmarkCircle02Icon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { BlurTargetView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Button, Skeleton } from 'heroui-native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Platform,
  Pressable,
  RefreshControl,
  SectionList,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type DateGroup = 'today' | 'yesterday' | 'earlier';

type NotifSection = {
  key: DateGroup;
  title: string;
  data: NotificationPayload[];
};

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function getDateGroup(iso: string): DateGroup {
  try {
    const date = startOfDay(new Date(iso));
    const today = startOfDay(new Date());
    const diffDays = Math.round((today.getTime() - date.getTime()) / 86400000);
    if (diffDays <= 0) return 'today';
    if (diffDays === 1) return 'yesterday';
    return 'earlier';
  } catch {
    return 'earlier';
  }
}

function buildSections(
  items: NotificationPayload[],
  labels: { today: string; yesterday: string; earlier: string },
): NotifSection[] {
  const sorted = [...items].sort(
    (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt),
  );
  const buckets: Record<DateGroup, NotificationPayload[]> = {
    today: [],
    yesterday: [],
    earlier: [],
  };
  for (const item of sorted) {
    buckets[getDateGroup(item.createdAt)].push(item);
  }
  const order: Array<{ key: DateGroup; title: string }> = [
    { key: 'today', title: labels.today },
    { key: 'yesterday', title: labels.yesterday },
    { key: 'earlier', title: labels.earlier },
  ];
  return order
    .filter(({ key }) => buckets[key].length > 0)
    .map(({ key, title }) => ({ key, title, data: buckets[key] }));
}

const AnimatedSectionList = Animated.createAnimatedComponent(SectionList<NotificationPayload, NotifSection>);

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const c = useSemanticTheme();
  const { t } = useI18n();
  const nn = t.notifications;
  const tc = t.common;
  const blurTargetRef = useRef<View>(null);

  const [items, setItems] = useState<NotificationPayload[]>(() =>
    cachedApi.getNotificationsSync().filter((n) => !n.isArchived),
  );
  const [loading, setLoading] = useState(
    () => cachedApi.getNotificationsSync().filter((n) => !n.isArchived).length === 0,
  );
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const list = await cachedApi.getNotifications({ limit: 50 });
      setItems(list.filter((n) => !n.isArchived));
    } catch (e) {
      console.warn('Failed to load notifications', e);
    }
  }, []);

  const syncFromCache = useCallback(() => {
    setItems(cachedApi.getNotificationsSync().filter((n) => !n.isArchived));
  }, []);

  useCacheSync(syncFromCache);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await load();
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const handleMarkAllRead = useCallback(async () => {
    try {
      await cachedApi.markAllNotificationsRead();
      setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch {
      /* ignore */
    }
  }, []);

  const handleMarkRead = useCallback((id: string) => {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    cachedApi.markNotificationRead(id).catch(() => {});
  }, []);

  const handleNotifPress = useCallback(async (notif: NotificationPayload) => {
    if (!notif.isRead) {
      handleMarkRead(notif.id);
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
      try {
        const task = await api.getTask(taskId);
        if (task?.projectId) {
          router.push(`/project/${task.projectId}?task=${taskId}` as any);
          return;
        }
      } catch {
        /* ignore */
      }
    }
    if (projectId) {
      router.push(`/project/${projectId}` as any);
    }
  }, [handleMarkRead]);

  const unreadCount = useMemo(() => items.filter((n) => !n.isRead).length, [items]);

  const sections = useMemo(
    () =>
      buildSections(items, {
        today: tc.today,
        yesterday: tc.yesterday,
        earlier: nn.sectionEarlier,
      }),
    [items, tc.today, tc.yesterday, nn.sectionEarlier],
  );

  const scrollY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (e) => {
      scrollY.value = e.contentOffset.y;
    },
  });
  const HEADER_H = insets.top + 54;

  const headerBgStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [10, 50], [0, 1], Extrapolation.CLAMP),
  }));
  const smallTitleStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [30, 60], [0, 1], Extrapolation.CLAMP),
    transform: [{ translateY: interpolate(scrollY.value, [30, 60], [10, 0], Extrapolation.CLAMP) }],
  }));
  const largeTitleStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [0, 40], [1, 0], Extrapolation.CLAMP),
    transform: [
      { scale: interpolate(scrollY.value, [-50, 0, 40], [1.04, 1, 0.94], Extrapolation.CLAMP) },
      { translateY: interpolate(scrollY.value, [0, 40], [0, -10], Extrapolation.CLAMP) },
    ],
  }));

  const unreadBannerText = useMemo(
    () => nn.unreadBanner.replace('{{count}}', String(unreadCount)),
    [nn.unreadBanner, unreadCount],
  );

  const renderItem = useCallback(
    ({ item, index, section }: { item: NotificationPayload; index: number; section: NotifSection }) => {
      const isFirst = index === 0;
      const isLast = index === section.data.length - 1;
      return (
        <View
          style={[
            isFirst || isLast ? styles.sectionCard : null,
            isFirst && styles.sectionCardTop,
            isLast && styles.sectionCardBottom,
            {
              backgroundColor: c.surface,
              borderColor: c.border,
              borderCurve: 'continuous',
            },
          ]}
        >
          <NotificationRow
            notif={item}
            c={c}
            labels={nn}
            onPress={() => handleNotifPress(item)}
            onMarkRead={() => handleMarkRead(item.id)}
            showDivider={!isLast}
          />
        </View>
      );
    },
    [c, nn, handleNotifPress, handleMarkRead],
  );

  const renderSectionHeader = useCallback(
    ({ section }: { section: NotifSection }) => (
      <Text style={[styles.sectionLabel, { color: c.muted }]}>{section.title}</Text>
    ),
    [c.muted],
  );

  const keyExtractor = useCallback((item: NotificationPayload) => item.id, []);

  const listHeader = useMemo(
    () => (
      <View style={styles.listHeader}>
        <Animated.View style={[styles.largeTitleBlock, largeTitleStyle]}>
          <Text style={[styles.largeTitle, { color: c.foreground }]}>{nn.title}</Text>
          <Text style={[styles.largeSubtitle, { color: c.muted }]}>{nn.subtitle}</Text>
        </Animated.View>

        {!loading && unreadCount > 0 ? (
          <Fade delay={40} initialY={4}>
            <View
              style={[
                styles.unreadBanner,
                {
                  backgroundColor: c.accent + '14',
                  borderColor: c.accent + '33',
                  borderCurve: 'continuous',
                },
              ]}
            >
              <View style={[styles.unreadBannerDot, { backgroundColor: c.accent }]} />
              <Text style={[styles.unreadBannerText, { color: c.foreground }]}>{unreadBannerText}</Text>
            </View>
          </Fade>
        ) : null}
      </View>
    ),
    [largeTitleStyle, c, nn.title, nn.subtitle, loading, unreadCount, unreadBannerText],
  );

  return (
    <View style={[styles.fill, { backgroundColor: c.background }]}>
      <StatusBar barStyle={c.scheme === 'dark' ? 'light-content' : 'dark-content'} />

      <LinearGradient
        colors={[c.accent + '12', 'transparent']}
        style={styles.topGlow}
        pointerEvents="none"
      />

      <View style={[styles.fixedHeader, { height: HEADER_H, paddingTop: insets.top }]} pointerEvents="box-none">
        <Animated.View style={[StyleSheet.absoluteFill, headerBgStyle]} pointerEvents="none">
          <HeaderBlurBackground blurTargetRef={blurTargetRef} />
          <View style={[styles.headerBorder, { backgroundColor: c.border }]} />
        </Animated.View>

        <View style={styles.headerContent} pointerEvents="box-none">
          <View style={styles.headerLeft}>
            <Pressable
              style={styles.iconBtn}
              onPress={() => router.back()}
              hitSlop={10}
              android_ripple={{ color: c.surfaceSecondary, borderless: true, radius: 22 }}
            >
              <HugeiconsIcon icon={ArrowLeft01Icon} size={22} color={c.foreground} strokeWidth={1.8} />
            </Pressable>
            <Animated.Text
              numberOfLines={1}
              style={[styles.headerTitleSmall, { color: c.foreground }, smallTitleStyle]}
            >
              {nn.title}
            </Animated.Text>
          </View>

          {unreadCount > 0 ? (
            <Pressable
              onPress={handleMarkAllRead}
              style={[styles.markAllBtn, { backgroundColor: c.accent + '14' }]}
              hitSlop={6}
              android_ripple={{ color: c.surfaceSecondary, borderless: true, radius: 16 }}
            >
              <HugeiconsIcon icon={CheckmarkCircle02Icon} size={15} color={c.accent} strokeWidth={2} />
              <Text style={[styles.markAllText, { color: c.accent }]}>{tc.markAllRead}</Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      <BlurTargetView ref={blurTargetRef} style={StyleSheet.absoluteFill} collapsable={false}>
        {loading ? (
          <View
            style={[
              styles.scrollPad,
              {
                paddingTop: HEADER_H + 8,
                paddingBottom: insets.bottom + 24,
              },
            ]}
          >
            <Text style={[styles.largeTitle, { color: c.foreground, marginBottom: 4 }]}>{nn.title}</Text>
            <Text style={[styles.largeSubtitle, { color: c.muted, marginBottom: 20 }]}>{nn.subtitle}</Text>
            <View
              style={[
                styles.inboxCard,
                { backgroundColor: c.surface, borderColor: c.border, borderCurve: 'continuous' },
              ]}
            >
              {[0, 1, 2, 3, 4].map((i) => (
                <View key={i}>
                  <View style={styles.skeletonRow}>
                    <Skeleton style={{ width: 40, height: 40, borderRadius: 13 }} />
                    <View style={{ flex: 1, gap: 8 }}>
                      <Skeleton style={{ width: '62%', height: 14, borderRadius: 6 }} />
                      <Skeleton style={{ width: '88%', height: 12, borderRadius: 6 }} />
                    </View>
                  </View>
                  {i < 4 ? (
                    <View style={[styles.skeletonDivider, { backgroundColor: c.separator }]} />
                  ) : null}
                </View>
              ))}
            </View>
          </View>
        ) : items.length === 0 ? (
          <View style={[styles.emptyWrap, { paddingTop: insets.top + 72, paddingBottom: insets.bottom + 32 }]}>
            <Fade delay={60} initialY={10}>
              <NotificationEmptyArt />
              <Text style={[styles.emptyTitle, { color: c.foreground }]}>{nn.emptyTitle}</Text>
              <Text style={[styles.emptySubtitle, { color: c.muted }]}>{nn.emptyHint}</Text>
              <Button
                variant="primary"
                size="md"
                onPress={() => router.replace('/(tabs)/(home)' as any)}
                style={{ marginTop: 20 }}
              >
                {nn.emptyCta}
              </Button>
            </Fade>
          </View>
        ) : (
          <AnimatedSectionList
            sections={sections}
            keyExtractor={keyExtractor}
            renderItem={renderItem}
            renderSectionHeader={renderSectionHeader}
            ListHeaderComponent={listHeader}
            onScroll={scrollHandler}
            scrollEventThrottle={16}
            showsVerticalScrollIndicator={false}
            stickySectionHeadersEnabled={false}
            removeClippedSubviews={Platform.OS === 'android'}
            windowSize={7}
            maxToRenderPerBatch={10}
            initialNumToRender={12}
            contentContainerStyle={{
              paddingTop: HEADER_H + 8,
              paddingBottom: insets.bottom + 32,
              paddingHorizontal: 20,
            }}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={c.foreground}
                colors={[c.accent]}
                progressViewOffset={insets.top + 12}
              />
            }
          />
        )}
      </BlurTargetView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  topGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 220,
    zIndex: 0,
  },
  fixedHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
  },
  headerBorder: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
  },
  headerContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 8,
  },
  headerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minWidth: 0,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleSmall: {
    flex: 1,
    fontSize: SigmaTypo.headline,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
  markAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: SigmaRadius.sm,
  },
  markAllText: {
    fontSize: SigmaTypo.captionSmall,
    fontWeight: '700',
  },
  scrollPad: { paddingHorizontal: 20 },
  largeTitleBlock: { marginBottom: 16, paddingRight: 48 },
  largeTitle: {
    fontSize: SigmaTypo.largeTitle,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  largeSubtitle: {
    marginTop: 4,
    fontSize: SigmaTypo.bodySmall,
    fontWeight: '500',
  },
  listHeader: { marginBottom: 8 },
  unreadBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: SigmaRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 12,
  },
  unreadBannerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  unreadBannerText: {
    flex: 1,
    fontSize: SigmaTypo.caption,
    fontWeight: '600',
  },
  inboxCard: {
    borderRadius: SigmaRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  skeletonDivider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 66,
  },
  sectionLabel: {
    fontSize: SigmaTypo.captionSmall,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginTop: 12,
    marginBottom: 6,
    paddingHorizontal: 2,
  },
  sectionCard: {
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderRightWidth: StyleSheet.hairlineWidth,
  },
  sectionCardTop: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopLeftRadius: SigmaRadius.lg,
    borderTopRightRadius: SigmaRadius.lg,
    overflow: 'hidden',
  },
  sectionCardBottom: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomLeftRadius: SigmaRadius.lg,
    borderBottomRightRadius: SigmaRadius.lg,
    overflow: 'hidden',
    marginBottom: 4,
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: SigmaTypo.title3,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: -0.2,
  },
  emptySubtitle: {
    marginTop: 8,
    fontSize: SigmaTypo.bodySmall,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 300,
  },
});
