import { ChatEmptyArt } from '@/components/chats/chat-empty-art';
import { ChatListRow } from '@/components/chats/chat-list-row';
import { HeaderBlurBackground } from '@/components/header-blur-background';
import { Fade } from '@/components/ui/fade';
import { SigmaRadius, SigmaTypo } from '@/constants/sigma';
import { useAuth } from '@/contexts/auth-context';
import { useWorkspace } from '@/contexts/workspace-context';
import { useChatMemberProfiles } from '@/hooks/use-chat-member-profiles';
import { useCollapsibleHeaderScroll } from '@/hooks/use-collapsible-header-scroll';
import { useCollapsibleHeaderStyles } from '@/hooks/use-collapsible-header-styles';
import { useCollapsibleRefreshControl } from '@/hooks/use-collapsible-refresh-control';
import { useSemanticTheme } from '@/hooks/use-semantic-theme';
import { useI18n } from '@/i18n/context';
import { api, type ChatPayload } from '@/lib/api';
import { cachedApi } from '@/lib/cache/cached-api';
import { useCacheSync } from '@/lib/cache/use-cache-sync';
import { subscribeWsEvent } from '@/lib/ws-client';
import { getScreenTopGlowStops } from '@/lib/theme-surfaces';
import { Search01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { BlurTargetView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import { Skeleton } from 'heroui-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function sortChats(list: ChatPayload[], unreadMap: Record<string, number>): ChatPayload[] {
  return [...list].sort((a, b) => {
    const unreadA = unreadMap[a.id] ?? 0;
    const unreadB = unreadMap[b.id] ?? 0;
    if (unreadA > 0 && unreadB === 0) return -1;
    if (unreadB > 0 && unreadA === 0) return 1;
    const ta = a.lastMessageAt ? Date.parse(a.lastMessageAt) : 0;
    const tb = b.lastMessageAt ? Date.parse(b.lastMessageAt) : 0;
    return tb - ta;
  });
}

export default function ChatsListScreen() {
  const c = useSemanticTheme();
  const { t, locale } = useI18n();
  const { user } = useAuth();
  const blurTargetRef = useRef<View>(null);
  const { activeWorkspaceId } = useWorkspace();
  const { resolveDmChatTitle } = useChatMemberProfiles(activeWorkspaceId, user?.id);
  const insets = useSafeAreaInsets();
  const cc = t.chats;

  const [query, setQuery] = useState('');
  const [chats, setChats] = useState<ChatPayload[]>(() =>
    activeWorkspaceId ? cachedApi.getChatsSync(activeWorkspaceId) : cachedApi.getChatsSync(),
  );
  const [unreadMap, setUnreadMap] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadChats = useCallback(async (options?: { showLoading?: boolean; force?: boolean }) => {
    const showLoading = options?.showLoading ?? true;
    const force = options?.force ?? false;
    if (!user) {
      setChats([]);
      setUnreadMap({});
      setLoading(false);
      return;
    }
    if (showLoading) setLoading(true);
    try {
      const list = activeWorkspaceId
        ? await cachedApi.getChats(activeWorkspaceId, { force })
        : await cachedApi.listChats({ force });

      setChats(sortChats(list, {}));

      if (showLoading) setLoading(false);

      const counts = await Promise.all(
        list.map(async (ch) => {
          try {
            const n = await api.getChatUnreadCount(ch.id);
            return [ch.id, n] as const;
          } catch {
            return [ch.id, 0] as const;
          }
        }),
      );
      const map = Object.fromEntries(counts);
      setUnreadMap(map);
      setChats(sortChats(list, map));
    } catch (e) {
      console.error('Failed to load chats:', e);
    } finally {
      setLoading(false);
    }
  }, [activeWorkspaceId, user]);

  const syncFromCache = useCallback(() => {
    const list = activeWorkspaceId
      ? cachedApi.getChatsSync(activeWorkspaceId)
      : cachedApi.getChatsSync();
    if (list.length > 0) setChats(sortChats(list, unreadMap));
  }, [activeWorkspaceId, unreadMap]);

  useCacheSync(syncFromCache);

  useEffect(() => {
    void loadChats({ showLoading: true });
  }, [loadChats]);

  useFocusEffect(
    useCallback(() => {
      void loadChats({ showLoading: false });
    }, [loadChats]),
  );

  useEffect(() => {
    const unsub = subscribeWsEvent('chat.message.created', (payload) => {
      const chatId = payload.chat_id as string;
      if (!chatId) return;

      setUnreadMap((prev) => {
        const next = { ...prev, [chatId]: (prev[chatId] ?? 0) + 1 };
        setChats((list) => {
          const idx = list.findIndex((ch) => ch.id === chatId);
          if (idx === -1) {
            loadChats({ showLoading: false });
            return list;
          }
          const updated = [...list];
          updated[idx] = { ...updated[idx], lastMessageAt: new Date().toISOString() };
          return sortChats(updated, next);
        });
        return next;
      });
    });
    return unsub;
  }, [loadChats]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadChats({ showLoading: false, force: true });
    } finally {
      setRefreshing(false);
    }
  }, [loadChats]);

  const refreshControl = useCollapsibleRefreshControl({ refreshing, onRefresh, c });

  const { scrollRef, headerProgress, scrollHandler } = useCollapsibleHeaderScroll('chats');
  const HEADER_H = insets.top + 54;
  const { headerBgStyle, smallTitleStyle, largeTitleStyle } = useCollapsibleHeaderStyles(headerProgress);

  const visibleChats = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return chats;
    return chats.filter((ch) => resolveDmChatTitle(ch).toLowerCase().includes(q));
  }, [chats, query, resolveDmChatTitle]);

  const totalUnread = useMemo(
    () => Object.values(unreadMap).reduce((sum, n) => sum + n, 0),
    [unreadMap],
  );

  const unreadChatsCount = useMemo(
    () => visibleChats.filter((ch) => (unreadMap[ch.id] ?? 0) > 0).length,
    [visibleChats, unreadMap],
  );

  const membersLabel = useCallback(
    (count: number) => cc.membersCount.replace('{{count}}', String(count)),
    [cc.membersCount],
  );

  const unreadPreview = useCallback(
    (count: number) => cc.unreadPreview.replace('{{count}}', String(count)),
    [cc.unreadPreview],
  );

  const openChat = (id: string) => {
    setUnreadMap((prev) => {
      const next = { ...prev, [id]: 0 };
      setChats((list) => sortChats(list, next));
      return next;
    });
    router.push(`/chat/${id}` as any);
  };

  const renderChatRow = useCallback(
    ({ item, index }: { item: ChatPayload; index: number }) => (
      <ChatListRow
        chat={item}
        title={resolveDmChatTitle(item)}
        locale={locale}
        onPress={() => openChat(item.id)}
        directLabel={cc.directLabel}
        membersLabel={membersLabel}
        unreadPreview={unreadPreview}
        unreadCount={unreadMap[item.id] ?? 0}
        showDivider={index < visibleChats.length - 1}
      />
    ),
    [locale, cc.directLabel, membersLabel, unreadPreview, unreadMap, visibleChats.length, openChat, resolveDmChatTitle],
  );

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <StatusBar barStyle={c.scheme === 'dark' ? 'light-content' : 'dark-content'} />

      <LinearGradient
        colors={getScreenTopGlowStops(c.scheme, c.accent)}
        style={styles.topGlow}
        pointerEvents="none"
      />

      <View
        style={[styles.fixedHeader, { height: HEADER_H, paddingTop: insets.top }]}
        pointerEvents="box-none"
      >
        <Animated.View style={[StyleSheet.absoluteFill, headerBgStyle]} pointerEvents="none">
          <HeaderBlurBackground blurTargetRef={blurTargetRef} />
          <View style={[styles.headerBorder, { backgroundColor: c.border }]} />
        </Animated.View>
        <View style={styles.headerContent} pointerEvents="box-none">
          <Animated.Text
            style={[styles.headerTitleSmall, { color: c.foreground }, smallTitleStyle]}
            numberOfLines={1}
          >
            {cc.title}
          </Animated.Text>
          {totalUnread > 0 && (
            <View style={[styles.headerBadge, { backgroundColor: c.accent }]}>
              <Text style={[styles.headerBadgeText, { color: c.accentForeground }]}>
                {totalUnread > 99 ? '99+' : totalUnread}
              </Text>
            </View>
          )}
        </View>
      </View>

      <BlurTargetView ref={blurTargetRef} style={{ flex: 1 }} collapsable={false}>
        <Animated.ScrollView
          ref={scrollRef}
          onScroll={scrollHandler}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingTop: insets.top + 10,
            paddingBottom: insets.bottom + 100,
            paddingHorizontal: 16,
            gap: 12,
          }}
          refreshControl={refreshControl}
        >
          <Animated.View style={[styles.largeTitleWrap, largeTitleStyle]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.largeTitle, { color: c.foreground }]}>{cc.title}</Text>
              <Text style={[styles.largeSubtitle, { color: c.muted }]}>{cc.subtitle}</Text>
            </View>
          </Animated.View>

          <Fade delay={40} initialY={6}>
            <View
              style={[
                styles.searchBox,
                {
                  backgroundColor: c.surface,
                  borderColor: c.border,
                  borderCurve: 'continuous',
                },
              ]}
            >
              <HugeiconsIcon icon={Search01Icon} size={18} color={c.muted} strokeWidth={1.8} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder={cc.searchPlaceholder}
                placeholderTextColor={c.muted}
                style={[styles.searchInput, { color: c.foreground }]}
                returnKeyType="search"
                autoCorrect={false}
                autoCapitalize="none"
              />
            </View>
          </Fade>

          {!loading && totalUnread > 0 && (
            <Fade delay={55} initialY={4}>
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
                <Text style={[styles.unreadBannerText, { color: c.foreground }]}>
                  {cc.unreadBanner
                    .replace('{{messages}}', String(totalUnread))
                    .replace('{{chats}}', String(unreadChatsCount))}
                </Text>
              </View>
            </Fade>
          )}

          {loading ? (
            <View
              style={[
                styles.inboxCard,
                { backgroundColor: c.surface, borderColor: c.border, borderCurve: 'continuous' },
              ]}
            >
              {[0, 1, 2, 3, 4].map((i) => (
                <View key={i}>
                  <View style={styles.skeletonRow}>
                    <Skeleton style={{ width: 46, height: 46, borderRadius: 23 }} />
                    <View style={{ flex: 1, gap: 8 }}>
                      <Skeleton style={{ width: '55%', height: 14, borderRadius: 6 }} />
                      <Skeleton style={{ width: '40%', height: 12, borderRadius: 6 }} />
                    </View>
                  </View>
                  {i < 4 ? (
                    <View style={[styles.skeletonDivider, { backgroundColor: c.separator }]} />
                  ) : null}
                </View>
              ))}
            </View>
          ) : visibleChats.length > 0 ? (
            <View
              style={[
                styles.inboxCard,
                {
                  backgroundColor: c.surface,
                  borderColor: c.border,
                  borderCurve: 'continuous',
                },
              ]}
            >
              <FlatList
                data={visibleChats}
                keyExtractor={(ch) => ch.id}
                scrollEnabled={false}
                removeClippedSubviews={Platform.OS === 'android'}
                windowSize={9}
                maxToRenderPerBatch={12}
                initialNumToRender={14}
                renderItem={renderChatRow}
              />
            </View>
          ) : (
            <Fade delay={80} initialY={10}>
              <View style={styles.emptyWrap}>
                <ChatEmptyArt />
                <Text style={[styles.emptyTitle, { color: c.foreground }]}>
                  {query ? cc.noResults : cc.emptyTitle}
                </Text>
                <Text style={[styles.emptySubtitle, { color: c.muted }]}>
                  {query ? cc.noResultsHint : cc.emptyHint}
                </Text>
              </View>
            </Fade>
          )}
        </Animated.ScrollView>
      </BlurTargetView>
    </View>
  );
}

const styles = StyleSheet.create({
  topGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 200,
    zIndex: 0,
  },
  fixedHeader: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100 },
  headerBorder: { position: 'absolute', bottom: 0, left: 0, right: 0, height: StyleSheet.hairlineWidth },
  headerContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 8,
  },
  headerTitleSmall: {
    flex: 1,
    fontSize: SigmaTypo.headline,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
  headerBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  largeTitleWrap: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 2,
  },
  largeTitle: {
    fontSize: SigmaTypo.largeTitle,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  largeSubtitle: {
    marginTop: 4,
    fontSize: SigmaTypo.bodySmall,
    fontWeight: '500',
    lineHeight: 19,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: SigmaRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    height: 46,
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
  },
  searchInput: {
    flex: 1,
    fontSize: SigmaTypo.bodySmall,
    paddingVertical: Platform.OS === 'android' ? 6 : 0,
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
  unreadBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: SigmaRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  unreadBannerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  unreadBannerText: {
    flex: 1,
    fontSize: SigmaTypo.caption,
    fontWeight: '700',
    lineHeight: 16,
  },
  inboxCard: {
    borderRadius: SigmaRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    boxShadow: '0 4px 16px rgba(0,0,0,0.05)',
  },
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 13,
    paddingHorizontal: 14,
  },
  skeletonDivider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 72,
  },
  emptyWrap: {
    paddingVertical: 48,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: SigmaTypo.title3,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.2,
  },
  emptySubtitle: {
    marginTop: 8,
    fontSize: SigmaTypo.bodySmall,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
  },
});
