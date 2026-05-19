import { Fade } from '@/components/ui/fade';
import { SigmaRadius, SigmaTypo } from '@/constants/sigma';
import { useAuth } from '@/contexts/auth-context';
import { useWorkspace } from '@/contexts/workspace-context';
import { useSemanticTheme } from '@/hooks/use-semantic-theme';
import { useI18n } from '@/i18n/context';
import { api, type ChatPayload } from '@/lib/api';
import { subscribeWsEvent } from '@/lib/ws-client';
import {
  Search01Icon,
  UserMultiple02Icon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { BlurTargetView, BlurView } from 'expo-blur';
import { router } from 'expo-router';
import { Skeleton } from 'heroui-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function formatPreviewTime(iso: string, locale: 'ru' | 'en' | 'de'): string {
  try {
    const d = new Date(iso);
    const n = new Date();
    const same = d.getDate() === n.getDate() && d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear();
    const tag = locale === 'ru' ? 'ru-RU' : locale === 'de' ? 'de-DE' : 'en-US';
    if (same) return d.toLocaleTimeString(tag, { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString(tag, { day: 'numeric', month: 'short' });
  } catch { return ''; }
}

const FALLBACK_COLORS = ['#3b82f6', '#8b5cf6', '#f97316', '#06b6d4', '#22c55e', '#ec4899'];

export default function ChatsListScreen() {
  const c = useSemanticTheme();
  const { t, locale } = useI18n();
  const { user } = useAuth();
  // Local blur target: must be a SIBLING of the BlurView, not an ancestor,
  // to avoid an Android dimezisBlurViewSdk31Plus native crash.
  const blurTargetRef = useRef<View>(null);
  const { activeWorkspaceId } = useWorkspace();
  const insets = useSafeAreaInsets();
  const cc = t.chats;

  const [query, setQuery] = useState('');
  const [chats, setChats] = useState<ChatPayload[]>([]);
  const [loading, setLoading] = useState(true);

  const loadChats = useCallback(async () => {
    try {
      const list = activeWorkspaceId
        ? await api.getChats(activeWorkspaceId)
        : await api.listChats();
      list.sort((a, b) => {
        const ta = a.lastMessageAt ? Date.parse(a.lastMessageAt) : 0;
        const tb = b.lastMessageAt ? Date.parse(b.lastMessageAt) : 0;
        return tb - ta;
      });
      setChats(list);
    } catch (e) { console.error('Failed to load chats:', e); }
    finally { setLoading(false); }
  }, [activeWorkspaceId]);

  useEffect(() => { loadChats(); }, [loadChats]);

  // Real-time: when a new message arrives, bump the chat to the top
  useEffect(() => {
    const unsub = subscribeWsEvent('chat.message.created', (payload) => {
      const chatId = payload.chat_id as string;
      if (!chatId) return;
      setChats((prev) => {
        const idx = prev.findIndex(ch => ch.id === chatId);
        if (idx === -1) {
          // Unknown chat — reload list
          loadChats();
          return prev;
        }
        const updated = [...prev];
        updated[idx] = { ...updated[idx], lastMessageAt: new Date().toISOString() };
        updated.sort((a, b) => {
          const ta = a.lastMessageAt ? Date.parse(a.lastMessageAt) : 0;
          const tb = b.lastMessageAt ? Date.parse(b.lastMessageAt) : 0;
          return tb - ta;
        });
        return updated;
      });
    });
    return unsub;
  }, [loadChats]);

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

  const groupChats = useMemo(() => {
    const q = query.trim().toLowerCase();
    return chats
      .filter(ch => ch.chatType === 'group' || ch.chatType === 'channel')
      .filter(ch => !q || (ch.name ?? '').toLowerCase().includes(q));
  }, [chats, query]);

  const dmChats = useMemo(() => {
    const q = query.trim().toLowerCase();
    return chats
      .filter(ch => ch.chatType === 'dm')
      .filter(ch => !q || (ch.name ?? '').toLowerCase().includes(q));
  }, [chats, query]);

  const openChat = (id: string) => {
    router.push(`/chat/${id}` as any);
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <StatusBar barStyle={c.scheme === 'dark' ? 'light-content' : 'dark-content'} />

      {/* Sticky blur header */}
      <View
        style={[styles.fixedHeader, { height: HEADER_H, paddingTop: insets.top }]}
        pointerEvents="box-none"
      >
        <Animated.View style={[StyleSheet.absoluteFill, headerBgStyle]} pointerEvents="none">
          <BlurView
            {...(blurTargetRef ? { blurTarget: blurTargetRef } : {})}
            blurMethod={Platform.OS === 'android' ? 'dimezisBlurViewSdk31Plus' : undefined}
            intensity={c.scheme === 'dark' ? 60 : 70}
            tint={c.scheme === 'dark' ? 'dark' : 'prominent'}
            blurReductionFactor={Platform.OS === 'android' ? 0.5 : 1}
            style={StyleSheet.absoluteFill}
          />
          <View style={[styles.headerBorder, { backgroundColor: c.border }]} />
        </Animated.View>
        <View style={styles.headerContent} pointerEvents="box-none">
          <Animated.Text
            style={[styles.headerTitleSmall, { color: c.foreground }, smallTitleStyle]}
            numberOfLines={1}
          >
            {cc.title}
          </Animated.Text>
        </View>
      </View>

      <BlurTargetView ref={blurTargetRef} style={{ flex: 1 }}>
      <Animated.ScrollView
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: insets.top + 10,
          paddingBottom: insets.bottom + 100,
          paddingHorizontal: 16,
        }}
      >
        {/* Large title */}
        <Animated.View style={[styles.largeTitleWrap, largeTitleStyle]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.largeTitle, { color: c.foreground }]}>{cc.title}</Text>
            <Text style={[styles.largeSubtitle, { color: c.muted }]}>{cc.subtitle}</Text>
          </View>

        </Animated.View>

        {/* Search */}
        <Fade delay={40} initialY={6}>
          <View
            style={[
              styles.searchBox,
              {
                backgroundColor: c.surfaceSecondary,
                borderColor: c.border,
              },
            ]}
          >
            <HugeiconsIcon icon={Search01Icon} size={17} color={c.muted} strokeWidth={1.8} />
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

        {loading ? (
          <View style={{ gap: 12, marginTop: 8 }}>
            {[0, 1, 2, 3, 4].map(i => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 }}>
                <Skeleton style={{ width: 42, height: 42, borderRadius: 13 }} />
                <View style={{ flex: 1, gap: 6 }}>
                  <Skeleton style={{ width: '60%', height: 14, borderRadius: 6 }} />
                  <Skeleton style={{ width: '40%', height: 12, borderRadius: 6 }} />
                </View>
              </View>
            ))}
          </View>
        ) : (
          <>
            {/* Group / Channel chats */}
            {groupChats.length > 0 && (
              <>
                <Fade delay={80} initialY={8}>
                  <Text style={[styles.sectionLabel, { color: c.muted }]}>
                    {cc.sectionProjects}
                  </Text>
                </Fade>
                <View style={[styles.sectionCard, { backgroundColor: c.surface, borderColor: c.border }]}>
                  {groupChats.map((ch, i) => (
                    <Fade key={ch.id} delay={100 + i * 45} initialY={8}>
                      <ChatRow
                        chat={ch}
                        locale={locale}
                        userId={user?.id}
                        onPress={() => openChat(ch.id)}
                        showBottomBorder={i < groupChats.length - 1}
                      />
                    </Fade>
                  ))}
                </View>
              </>
            )}

            {/* Direct chats */}
            {dmChats.length > 0 && (
              <>
                <Fade delay={150} initialY={8}>
                  <Text style={[styles.sectionLabel, { color: c.muted, marginTop: 22 }]}>
                    {cc.sectionDirect}
                  </Text>
                </Fade>
                <View style={[styles.sectionCard, { backgroundColor: c.surface, borderColor: c.border }]}>
                  {dmChats.map((ch, i) => (
                    <Fade key={ch.id} delay={170 + i * 45} initialY={8}>
                      <ChatRow
                        chat={ch}
                        locale={locale}
                        userId={user?.id}
                        onPress={() => openChat(ch.id)}
                        showBottomBorder={i < dmChats.length - 1}
                      />
                    </Fade>
                  ))}
                </View>
              </>
            )}

            {groupChats.length === 0 && dmChats.length === 0 && (
              <View style={{ padding: 40, alignItems: 'center' }}>
                <Text style={{ color: c.muted, fontSize: SigmaTypo.bodySmall }}>{cc.noMessages ?? 'No chats yet'}</Text>
              </View>
            )}
          </>
        )}
      </Animated.ScrollView>
      </BlurTargetView>
    </View>
  );
}

/* ─── ChatRow ─────────────────────────────────────────────────────────────── */

function ChatRow({
  chat,
  locale,
  userId,
  onPress,
  showBottomBorder,
}: {
  chat: ChatPayload;
  locale: 'ru' | 'en' | 'de';
  userId?: string;
  onPress: () => void;
  showBottomBorder: boolean;
}) {
  const c = useSemanticTheme();
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(scale.value, { damping: 16, stiffness: 320 }) }],
  }));

  const isDm = chat.chatType === 'dm';
  const chatColor = chat.color ?? FALLBACK_COLORS[chat.id.charCodeAt(0) % FALLBACK_COLORS.length];
  const chatName = chat.name ?? (isDm ? 'Direct Message' : 'Group');
  const initials = chatName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const memberCount = chat.members?.length ?? 0;

  return (
    <Pressable
      onPressIn={() => { scale.value = 0.985; }}
      onPressOut={() => { scale.value = 1; }}
      onPress={onPress}
      android_ripple={{ color: c.surfaceSecondary, borderless: false }}
    >
      <Animated.View
        style={[
          styles.row,
          showBottomBorder && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border },
          animStyle,
        ]}
      >
        {isDm ? (
          <View style={[styles.peerAvatar, { backgroundColor: chatColor }]}>
            <Text style={styles.peerInitials}>{initials}</Text>
          </View>
        ) : (
          <View style={[styles.groupAvatar, { backgroundColor: chatColor }]}>
            <HugeiconsIcon icon={UserMultiple02Icon} size={20} color="#fff" strokeWidth={1.8} />
          </View>
        )}
        <View style={styles.rowBody}>
          <View style={styles.rowTopLine}>
            <Text style={[styles.rowTitle, { color: c.foreground }]} numberOfLines={1}>
              {chatName}
            </Text>
            {chat.lastMessageAt && (
              <Text style={[styles.rowTime, { color: c.muted }]}>
                {formatPreviewTime(chat.lastMessageAt, locale)}
              </Text>
            )}
          </View>
          <View style={styles.rowBottomLine}>
            <Text style={[styles.rowSubtitle, { color: c.muted }]} numberOfLines={1}>
              {isDm ? 'Direct' : `${memberCount} members`}
            </Text>
          </View>
        </View>
      </Animated.View>
    </Pressable>
  );
}

/* ─── styles ───────────────────────────────────────────────────────────────── */

const styles = StyleSheet.create({
  fixedHeader: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100 },
  headerBorder: { position: 'absolute', bottom: 0, left: 0, right: 0, height: StyleSheet.hairlineWidth },
  headerContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 10,
  },
  headerTitleSmall: {
    flex: 1,
    fontSize: SigmaTypo.headline,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
  headerAddBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },

  largeTitleWrap: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 12,
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
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },

  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: SigmaRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    height: 42,
    marginBottom: 18,
  },
  searchInput: {
    flex: 1,
    fontSize: SigmaTypo.bodySmall,
    paddingVertical: Platform.OS === 'android' ? 6 : 0,
    textAlignVertical: 'center',
    includeFontPadding: false,
  },

  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 8,
    marginLeft: 4,
  },
  sectionCard: {
    borderRadius: SigmaRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  rowBody: { flex: 1, minWidth: 0 },
  rowTopLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rowBottomLine: {
    marginTop: 2,
  },
  rowTitle: {
    flex: 1,
    fontSize: SigmaTypo.bodySmall,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
  rowTime: {
    fontSize: 11,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
  },
  rowSubtitle: {
    fontSize: SigmaTypo.caption,
    fontWeight: '500',
    lineHeight: 16,
  },

  groupAvatar: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  peerAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  peerInitials: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
});
