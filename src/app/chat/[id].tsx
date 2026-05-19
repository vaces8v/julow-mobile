import { SigmaRadius, SigmaTypo } from '@/constants/sigma';
import { useAuth } from '@/contexts/auth-context';
import { useSemanticTheme, type SemanticTheme } from '@/hooks/use-semantic-theme';
import { useI18n } from '@/i18n/context';
import { api, buildFileContentUrl, type ChatPayload, type MessagePayload, type MessageAttachmentShape } from '@/lib/api';
import { getAccessToken } from '@/lib/api-client';
import { subscribeChat, subscribeWsEvent, unsubscribeChat } from '@/lib/ws-client';
import {
  ArrowLeft01Icon,
  File01Icon,
  PlayIcon,
  SentIcon,
  UserMultiple02Icon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { BlurTargetView, BlurView } from 'expo-blur';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Keyboard,
  Linking,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  FadeOut,
  LinearTransition,
  interpolate,
  interpolateColor,
  useAnimatedKeyboard,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const IOS_GLASS = Platform.OS === 'ios' && isLiquidGlassAvailable();

function formatTime(iso: string, loc: 'en' | 'ru' | 'de') {
  try {
    const d = new Date(iso);
    const now = new Date();
    const sameDay =
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear();
    const tag = loc === 'ru' ? 'ru-RU' : loc === 'de' ? 'de-DE' : 'en-US';
    if (sameDay) return d.toLocaleTimeString(tag, { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString(tag, { day: 'numeric', month: 'short' });
  } catch {
    return '';
  }
}

const FALLBACK_COLORS = ['#3b82f6', '#8b5cf6', '#f97316', '#06b6d4', '#22c55e', '#ec4899'];

export default function ChatThreadScreen() {
  const c = useSemanticTheme();
  const insets = useSafeAreaInsets();
  const { t, locale } = useI18n();
  const { user } = useAuth();
  const cc = t.chats;
  const params = useLocalSearchParams<{ id: string }>();
  const chatId = Array.isArray(params.id) ? params.id[0] : params.id;

  const [chat, setChat] = useState<ChatPayload | null>(null);
  const [messages, setMessages] = useState<MessagePayload[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList<MessagePayload>>(null);
  // Target view for Android's dimezisBlurViewSdk31Plus. Both the header and
  // the floating input blur against this wrapper, which contains the message
  // list (i.e. the content actually visible behind the blur).
  const blurTargetRef = useRef<View>(null);

  useEffect(() => {
    if (!chatId) return;
    let cancelled = false;
    (async () => {
      try {
        const [chatData, msgData] = await Promise.all([
          api.getChat(chatId),
          api.getChatMessages(chatId, 100),
        ]);
        if (cancelled) return;
        setChat(chatData);
        setMessages(msgData);
        api.markChatRead(chatId).catch(() => {});
      } catch (e) { console.error('Failed to load chat:', e); }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [chatId]);

  // WebSocket: subscribe to chat presence & listen for new messages
  useEffect(() => {
    if (!chatId) return;
    subscribeChat(chatId);

    const unsub = subscribeWsEvent('chat.message.created', (payload) => {
      const msgChatId = payload.chat_id as string;
      const senderId = payload.sender_id as string;
      if (msgChatId !== chatId) return;
      // Don't duplicate messages we just sent ourselves
      if (senderId === user?.id) return;

      // Fetch recent messages and merge any new ones
      api.listMessages(chatId, { limit: 10 })
        .then(({ items }) => {
          if (items.length === 0) return;
          setMessages((prev) => {
            const existing = new Set(prev.map(m => m.id));
            const newMsgs = items.filter(m => !existing.has(m.id));
            if (newMsgs.length === 0) return prev;
            const merged = [...prev, ...newMsgs];
            merged.sort((a, b) => {
              const ta = a.createdAt ? Date.parse(a.createdAt) : 0;
              const tb = b.createdAt ? Date.parse(b.createdAt) : 0;
              return ta - tb;
            });
            return merged;
          });
          requestAnimationFrame(() => {
            listRef.current?.scrollToEnd({ animated: true });
          });
        })
        .catch(() => {});
    });

    return () => {
      unsubscribeChat(chatId);
      unsub();
    };
  }, [chatId, user?.id]);

  const hasDraft = draft.trim().length > 0;

  const handleSend = useCallback(async () => {
    const text = draft.trim();
    if (!text || !chatId || sending) return;
    setSending(true);
    try {
      const newMsg = await api.sendMessage(chatId, text);
      setMessages((prev) => [...prev, newMsg]);
      setDraft('');
      requestAnimationFrame(() => {
        listRef.current?.scrollToEnd({ animated: true });
      });
    } catch (e) { console.error('Failed to send message:', e); }
    finally { setSending(false); }
  }, [chatId, draft, sending]);

  const HEADER_H = insets.top + 64;

  if (loading || !chat) {
    return (
      <View style={[styles.fill, { backgroundColor: c.background, paddingTop: insets.top + 40 }]}>
        <Text style={[styles.empty, { color: c.muted }]}>{loading ? '' : (cc.emptySelect ?? 'Chat not found')}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.fill, { backgroundColor: c.background }]}>
      <StatusBar barStyle={c.scheme === 'dark' ? 'light-content' : 'dark-content'} />

      <BlurTargetView ref={blurTargetRef} style={styles.fill}>
        <ChatList
          listRef={listRef}
          messages={messages}
          tone={c}
          userId={user?.id}
          locale={locale}
          emptyLabel={cc.noMessages}
          headerHeight={HEADER_H}
          bottomInset={insets.bottom}
        />
      </BlurTargetView>

      <ThreadHeader
        chat={chat}
        insetsTop={insets.top}
        tone={c}
        hint={cc.defaultGroupHint}
        directLabel={cc.directLabel}
        blurTargetRef={blurTargetRef}
      />

      <FloatingInput
        tone={c}
        bottomInset={insets.bottom}
        value={draft}
        onChange={setDraft}
        placeholder={cc.typeMessage}
        onSend={handleSend}
        sendLabel={cc.send}
        hasDraft={hasDraft}
        blurTargetRef={blurTargetRef}
      />
    </View>
  );
}

/* ─── ChatList ──────────────────────────────────────────────────────────── */

function ChatList({
  listRef,
  messages,
  tone,
  userId,
  locale,
  emptyLabel,
  headerHeight,
  bottomInset,
}: {
  listRef: React.RefObject<FlatList<MessagePayload> | null>;
  messages: MessagePayload[];
  tone: SemanticTheme;
  userId: string | undefined;
  locale: 'en' | 'ru' | 'de';
  emptyLabel: string;
  headerHeight: number;
  bottomInset: number;
}) {
  /* Reserve space for the floating input + dynamic keyboard via an
   * animated footer spacer.  FlatList's `contentContainerStyle` is applied
   * to an internal (non-animated) View, so we can't drive it from a
   * shared value directly; the footer trick is the canonical workaround. */
  const keyboard = useAnimatedKeyboard();
  const baseInset = Math.max(bottomInset, 12);
  const PILL_HEIGHT = 64;

  const footerStyle = useAnimatedStyle(() => ({
    height: baseInset + PILL_HEIGHT + keyboard.height.value,
  }));

  /* Whenever the keyboard opens, snap to the bottom of the list.
   * We use a plain JS Keyboard listener rather than `useAnimatedReaction`
   * because that would capture `listRef` inside a worklet — Reanimated
   * then "freezes" the ref object and warns when FlatList later writes
   * to `.current`. The animated footer height above is purely visual and
   * doesn't touch the ref, so it stays on the UI thread happily. */
  useEffect(() => {
    const evt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const sub = Keyboard.addListener(evt, () => {
      requestAnimationFrame(() => {
        listRef.current?.scrollToEnd({ animated: true });
      });
    });
    return () => sub.remove();
  }, [listRef]);

  return (
    <FlatList
      ref={listRef}
      data={messages}
      keyExtractor={(m: MessagePayload) => m.id}
      keyboardDismissMode="interactive"
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{
        paddingTop: headerHeight + 16,
        paddingHorizontal: 14,
        gap: 8,
      }}
      style={styles.fill}
      showsVerticalScrollIndicator={false}
      onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
      ListEmptyComponent={
        <View style={styles.listEmpty}>
          <Text style={[styles.listEmptyText, { color: tone.muted }]}>{emptyLabel}</Text>
        </View>
      }
      ListFooterComponent={<Animated.View style={footerStyle} />}
      renderItem={({ item, index }: { item: MessagePayload; index: number }) => {
        const prev = messages[index - 1];
        const sameAuthorAsPrev = prev?.senderId === item.senderId;
        return (
          <Bubble
            msg={item}
            tone={tone}
            isMe={item.senderId === userId}
            isLocal={item.id.startsWith('local-')}
            groupWithPrev={sameAuthorAsPrev}
            locale={locale}
          />
        );
      }}
    />
  );
}

/* ─── Header ────────────────────────────────────────────────────────────── */

function ThreadHeader({
  chat,
  insetsTop,
  tone,
  hint,
  directLabel,
  blurTargetRef,
}: {
  chat: ChatPayload;
  insetsTop: number;
  tone: SemanticTheme;
  hint: string;
  directLabel: string;
  blurTargetRef: React.RefObject<View | null>;
}) {
  const isDm = chat.chatType === 'dm';
  const chatColor = chat.color ?? FALLBACK_COLORS[chat.id.charCodeAt(0) % FALLBACK_COLORS.length];
  const title = chat.name ?? (isDm ? 'Direct Message' : 'Group');
  const subtitle = isDm ? directLabel : `${chat.members?.length ?? 0} members · ${hint}`;
  const initials = title.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <View
      style={[styles.headerAbs, { paddingTop: insetsTop, height: insetsTop + 64 }]}
      pointerEvents="box-none"
    >
      {IOS_GLASS ? (
        <GlassView
          glassEffectStyle="regular"
          colorScheme={tone.scheme}
          style={StyleSheet.absoluteFill}
        />
      ) : (
        <BlurView
          {...(Platform.OS === 'android' ? { blurTarget: blurTargetRef, blurMethod: 'dimezisBlurViewSdk31Plus' as const } : {})}
          intensity={tone.scheme === 'dark' ? 60 : 70}
          tint={tone.scheme === 'dark' ? 'dark' : 'prominent'}
          blurReductionFactor={Platform.OS === 'android' ? 0.5 : 1}
          style={StyleSheet.absoluteFill}
        />
      )}
      <View style={[styles.headerBorder, { backgroundColor: tone.border }]} />
      <View style={styles.headerRow}>
        <Pressable
          style={styles.iconBtn}
          onPress={() => router.back()}
          hitSlop={10}
          android_ripple={{ color: tone.surfaceSecondary, borderless: true, radius: 22 }}
        >
          <HugeiconsIcon icon={ArrowLeft01Icon} size={22} color={tone.foreground} strokeWidth={1.8} />
        </Pressable>

        {isDm ? (
          <View style={[styles.headerPeerAvatar, { backgroundColor: chatColor }]}>
            <Text style={styles.headerPeerInitials}>{initials}</Text>
          </View>
        ) : (
          <View style={[styles.headerGroupAvatar, { backgroundColor: chatColor }]}>
            <HugeiconsIcon icon={UserMultiple02Icon} size={18} color="#fff" strokeWidth={1.9} />
          </View>
        )}

        <View style={styles.headerTitles}>
          <Text style={[styles.headerTitle, { color: tone.foreground }]} numberOfLines={1}>
            {title}
          </Text>
          <Text style={[styles.headerSubtitle, { color: tone.muted }]} numberOfLines={1}>
            {subtitle}
          </Text>
        </View>

      </View>
    </View>
  );
}

/* ─── Bubble ────────────────────────────────────────────────────────────── */

function Bubble({
  msg,
  tone,
  isMe,
  isLocal,
  groupWithPrev,
  locale,
}: {
  msg: MessagePayload;
  tone: SemanticTheme;
  isMe: boolean;
  isLocal: boolean;
  groupWithPrev: boolean;
  locale: 'ru' | 'en' | 'de';
}) {
  const myBg = tone.accent;
  const peerBg = tone.surfaceSecondary;
  const myFg = tone.accentForeground;
  const peerFg = tone.foreground;

  const senderInitial = msg.senderId?.slice(0, 1).toUpperCase() ?? '?';
  const senderColor = FALLBACK_COLORS[msg.senderId.charCodeAt(0) % FALLBACK_COLORS.length];
  const showAvatar = !isMe && !groupWithPrev;

  return (
    <Animated.View
      entering={
        isLocal
          ? FadeInDown.springify().damping(22).stiffness(260)
          : FadeIn.duration(220).easing(Easing.out(Easing.quad))
      }
      exiting={FadeOut.duration(120)}
      layout={LinearTransition.springify().damping(22)}
      style={[
        styles.bubbleRow,
        isMe ? styles.bubbleRowMe : styles.bubbleRowPeer,
        groupWithPrev && { marginTop: -2 },
      ]}
    >
      {!isMe && (
        <View style={styles.avatarSlot}>
          {showAvatar && (
            <View style={[styles.msgAvatar, { backgroundColor: senderColor }]}>
              <Text style={styles.msgAvatarInitials}>{senderInitial}</Text>
            </View>
          )}
        </View>
      )}
      <View
        style={[
          styles.bubble,
          isMe
            ? {
              backgroundColor: myBg,
              borderTopRightRadius: groupWithPrev ? 14 : 6,
              borderTopLeftRadius: 18,
              borderBottomLeftRadius: 18,
              borderBottomRightRadius: 18,
            }
            : {
              backgroundColor: peerBg,
              borderTopLeftRadius: groupWithPrev ? 14 : 6,
              borderTopRightRadius: 18,
              borderBottomLeftRadius: 18,
              borderBottomRightRadius: 18,
            },
        ]}
      >
        {!!msg.content && (
          <Text style={[styles.bubbleText, { color: isMe ? myFg : peerFg }]}>{msg.content}</Text>
        )}
        {msg.attachments?.length > 0 && (
          <View style={{ gap: 6, marginTop: msg.content ? 6 : 0 }}>
            {msg.attachments.map((att) => (
              <Attachment key={att.id} att={att} tone={tone} isMe={isMe} />
            ))}
          </View>
        )}
        {msg.createdAt && (
          <Text
            style={[styles.bubbleTime, { color: isMe ? myFg + 'B8' : tone.muted }]}
          >
            {formatTime(msg.createdAt, locale)}
          </Text>
        )}
      </View>
    </Animated.View>
  );
}

/* ─── FloatingInput ─────────────────────────────────────────────────────── */

function FloatingInput({
  tone,
  bottomInset,
  value,
  onChange,
  placeholder,
  onSend,
  sendLabel,
  hasDraft,
  blurTargetRef,
}: {
  tone: SemanticTheme;
  bottomInset: number;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  onSend: () => void;
  sendLabel: string;
  hasDraft: boolean;
  blurTargetRef: React.RefObject<View | null>;
}) {
  /* Animated progress 0 → 1 for send button color/scale */
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withSpring(hasDraft ? 1 : 0, { damping: 16, stiffness: 280, mass: 0.7 });
  }, [hasDraft, p]);

  const pulse = useSharedValue(1);
  useEffect(() => {
    if (hasDraft) {
      pulse.value = withSpring(1.08, { damping: 10, stiffness: 260, mass: 0.4 }, () => {
        pulse.value = withSpring(1, { damping: 14, stiffness: 240, mass: 0.5 });
      });
    }
  }, [hasDraft, pulse]);

  /* Synchronous keyboard tracking via Reanimated.
   * `keyboard.height` is a shared value that updates every frame in lock-step
   * with the keyboard animation — no more stale-listener lag on first focus. */
  const keyboard = useAnimatedKeyboard();

  const sendBgStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      p.value,
      [0, 1],
      [tone.surfaceTertiary, tone.accent],
    ),
    transform: [{ scale: pulse.value }],
  }));

  /* Icon color is resolved on JS thread (can't animate SVG color via shared value). */
  const sendIconColor = hasDraft ? '#ffffff' : tone.muted;

  /* When keyboard is open we drop the navbar gesture inset (kb covers it).
   * When closed we restore it so the pill doesn't sit on the gesture bar. */
  const baseInset = Math.max(bottomInset, 12);
  const pillStyle = useAnimatedStyle(() => {
    // Smoothly collapse the bottom padding as the keyboard grows past ~40px.
    const compact = interpolate(keyboard.height.value, [0, 40], [baseInset, 6], 'clamp');

    // The host is anchored at the screen bottom (styles.floatingHost). We lift
    // it by the live keyboard height so the pill sits flush above the
    // keyboard on both iOS and Android — frame-accurate, no first-focus lag.
    const lift = -keyboard.height.value;

    return {
      paddingBottom: compact,
      transform: [{ translateY: lift }],
    };
  });

  const content = (
    <Animated.View
      style={[
        styles.floatingHost,
        styles.pillOuter,
        {
          paddingHorizontal: IOS_GLASS ? 10 : 0,
          paddingTop: IOS_GLASS ? 4 : 6,
        },
        pillStyle,
      ]}
      pointerEvents="box-none"
    >
      {/* Non-glass: blur background strip behind the pill */}
      {!IOS_GLASS && (
        <>
          <BlurView
            {...(Platform.OS === 'android' ? { blurTarget: blurTargetRef, blurMethod: 'dimezisBlurViewSdk31Plus' as const } : {})}
            intensity={70}
            tint={tone.scheme === 'dark' ? 'dark' : 'light'}
            blurReductionFactor={Platform.OS === 'android' ? 0.5 : 1}
            style={StyleSheet.absoluteFill}
          />
          <View style={[styles.pillTopBorder, { backgroundColor: tone.border }]} />
        </>
      )}

      <View style={styles.pillRow}>
        {/* The pill itself */}
        <View
          style={[
            styles.pill,
            IOS_GLASS
              ? { backgroundColor: 'transparent' }
              : { backgroundColor: tone.surfaceSecondary, borderColor: tone.border, borderWidth: StyleSheet.hairlineWidth },
          ]}
        >
          {IOS_GLASS && (
            <GlassView
              glassEffectStyle="regular"
              colorScheme={tone.scheme}
              isInteractive
              style={[StyleSheet.absoluteFill, { borderRadius: 28, overflow: 'hidden' }]}
            />
          )}

          <TextInput
            value={value}
            onChangeText={onChange}
            placeholder={placeholder}
            placeholderTextColor={tone.muted}
            style={[styles.pillInput, { color: tone.foreground }]}
            multiline
            returnKeyType="default"
            blurOnSubmit={false}
            textAlignVertical="center"
          />

          <Pressable
            accessibilityLabel={sendLabel}
            onPress={onSend}
            disabled={!hasDraft}
            hitSlop={6}
            style={({ pressed }) => [styles.sendWrap, { opacity: pressed && hasDraft ? 0.85 : 1 }]}
          >
            <Animated.View style={[styles.sendBtn, sendBgStyle]}>
              <HugeiconsIcon icon={SentIcon} size={18} color={sendIconColor} strokeWidth={2.2} />
            </Animated.View>
          </Pressable>
        </View>
      </View>
    </Animated.View>
  );

  return content;
}

/* ─── Attachment ────────────────────────────────────────────────────────── */

const IMAGE_EXT = /\.(jpe?g|png|gif|webp|heic|heif|bmp|avif)$/i;
const VIDEO_EXT = /\.(mp4|mov|webm|mkv|avi|m4v)$/i;


function classifyAttachment(att: MessageAttachmentShape): 'image' | 'video' | 'file' {
  const mime = (att.mimeType ?? '').toLowerCase();
  // Prefix-match handles real MIMEs ("image/png") AND wildcards ("image/*")
  // that the backend may send via the `attachment_type` shortcut.
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/')) return 'video';
  const name = att.filename ?? '';
  if (IMAGE_EXT.test(name)) return 'image';
  if (VIDEO_EXT.test(name)) return 'video';
  return 'file';
}

function formatFileSize(bytes?: number): string {
  if (!bytes || bytes <= 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileExt(name: string): string {
  const dot = name.lastIndexOf('.');
  return dot >= 0 ? name.slice(dot + 1).toUpperCase().slice(0, 4) : 'FILE';
}

function Attachment({ att, tone, isMe }: { att: MessageAttachmentShape; tone: SemanticTheme; isMe: boolean }) {
  const kind = classifyAttachment(att);

  // Inline image/video preview is fetched via the auth-aware web proxy:
  // `${WEB_BASE_URL}/api/proxy/files/{id}/content`. The proxy forwards to
  // backend `/files/{id}/content`, which streams the bytes (Bearer-authed).
  // We deliberately do NOT use `att.url` / `att.previewUrl`: those point at
  // the Docker-internal MinIO host (`http://minio:9000/...`), which is
  // unreachable from devices.
  const contentUrl = buildFileContentUrl(att.fileId);

  const [authHeader, setAuthHeader] = useState<string | null>(null);
  const [resolveError, setResolveError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getAccessToken()
      .then((token) => {
        if (cancelled) return;
        setAuthHeader(token ? `Bearer ${token}` : null);
      })
      .catch((e) => {
        console.warn('[chat] failed to read access token for attachment', att.fileId, e);
        if (!cancelled) setResolveError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [att.fileId]);

  // For tap-to-open we still need a publicly fetchable URL because the system
  // browser / OS share sheet won't have our Bearer token. We fall back to the
  // presigned URL endpoint here — if MinIO is publicly reachable in the deploy
  // it will work; if not, this just no-ops with a warning.
  const handlePress = async () => {
    try {
      const dl = await api.getFileDownloadUrl(att.fileId);
      await Linking.openURL(dl.url);
    } catch (e) {
      console.warn('[chat] failed to open attachment', att.fileId, att.filename, e);
    }
  };

  const onImageError = () => {
    console.warn('[chat] Image failed to load via proxy', att.fileId, att.filename, contentUrl);
    setResolveError(true);
  };

  const imageSource = authHeader
    ? { uri: contentUrl, headers: { Authorization: authHeader } }
    : null;

  if (kind === 'image') {
    return (
      <Pressable onPress={handlePress} style={[styles.attImageWrap, { backgroundColor: tone.surfaceSecondary }]}>
        {imageSource && !resolveError ? (
          <Image
            source={imageSource}
            style={styles.attImage}
            resizeMode="cover"
            onError={onImageError}
          />
        ) : (
          <View style={styles.attMediaPlaceholder}>
            {resolveError ? (
              <Text style={[styles.attMediaPlaceholderText, { color: tone.muted }]}>{att.filename || 'Image'}</Text>
            ) : (
              <ActivityIndicator color={tone.muted} />
            )}
          </View>
        )}
      </Pressable>
    );
  }

  if (kind === 'video') {
    return (
      <Pressable onPress={handlePress} style={[styles.attImageWrap, { backgroundColor: '#000' }]}>
        {imageSource && !resolveError && (
          <Image
            source={imageSource}
            style={styles.attImage}
            resizeMode="cover"
            onError={onImageError}
          />
        )}
        <View style={styles.attVideoOverlay}>
          <View style={styles.attPlayBtn}>
            <HugeiconsIcon icon={PlayIcon} size={22} color="#fff" strokeWidth={2} />
          </View>
        </View>
      </Pressable>
    );
  }

  // Generic file
  const fg = isMe ? tone.accentForeground : tone.foreground;
  const subFg = isMe ? tone.accentForeground + 'B8' : tone.muted;
  const surface = isMe ? 'rgba(255,255,255,0.18)' : tone.background;
  const border = isMe ? 'rgba(255,255,255,0.12)' : tone.border;
  return (
    <Pressable onPress={handlePress} style={[styles.attFile, { backgroundColor: surface, borderColor: border }]}>
      <View style={[styles.attFileIcon, { backgroundColor: isMe ? 'rgba(255,255,255,0.15)' : tone.surface }]}>
        <HugeiconsIcon icon={File01Icon} size={18} color={isMe ? '#fff' : tone.accent} strokeWidth={1.7} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[styles.attFileName, { color: fg }]} numberOfLines={1}>
          {att.filename || 'File'}
        </Text>
        <Text style={[styles.attFileMeta, { color: subFg }]} numberOfLines={1}>
          {[fileExt(att.filename ?? ''), formatFileSize(att.sizeBytes)].filter(Boolean).join(' • ')}
        </Text>
      </View>
    </Pressable>
  );
}

/* ─── styles ────────────────────────────────────────────────────────────── */

const styles = StyleSheet.create({
  fill: { flex: 1 },
  empty: {
    textAlign: 'center',
    fontSize: SigmaTypo.bodySmall,
  },

  /* Header */
  headerAbs: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 50,
    overflow: 'hidden',
  },
  headerBorder: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
  },
  headerRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 8,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitles: { flex: 1, minWidth: 0 },
  headerTitle: {
    fontSize: SigmaTypo.headline,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
  headerSubtitle: {
    marginTop: 1,
    fontSize: 11,
    fontWeight: '500',
  },
  headerGroupAvatar: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerPeerAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerPeerInitials: { color: '#fff', fontWeight: '700', fontSize: 13 },

  /* Empty state */
  listEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  listEmptyText: { fontSize: SigmaTypo.bodySmall },

  /* Bubbles */
  bubbleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    maxWidth: '100%',
  },
  bubbleRowMe: { justifyContent: 'flex-end' },
  bubbleRowPeer: { justifyContent: 'flex-start' },
  avatarSlot: { width: 28 },
  msgAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  msgAvatarInitials: { color: '#fff', fontSize: 11, fontWeight: '700' },

  bubble: {
    maxWidth: '78%',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 4,
  },
  bubbleText: {
    fontSize: SigmaTypo.bodySmall + 1,
    lineHeight: 20,
    fontWeight: '500',
  },
  bubbleTime: {
    fontSize: 10,
    fontWeight: '500',
    alignSelf: 'flex-end',
    fontVariant: ['tabular-nums'],
  },

  /* Attachments */
  attImageWrap: {
    width: 220,
    height: 160,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  attImage: {
    width: '100%',
    height: '100%',
  },
  attMediaPlaceholder: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  attMediaPlaceholderText: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  attVideoOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  attPlayBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  attFile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    minWidth: 200,
    maxWidth: 260,
  },
  attFileIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attFileName: {
    fontSize: SigmaTypo.captionSmall + 1,
    fontWeight: '700',
  },
  attFileMeta: {
    marginTop: 2,
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 0.3,
  },

  /* Floating input */
  floatingHost: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  pillOuter: {
    width: '100%',
  },
  pillTopBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
  },
  pillRow: {
    paddingHorizontal: IOS_GLASS ? 2 : 10,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
    borderRadius: 28,
    paddingLeft: 18,
    paddingRight: 5,
    paddingVertical: 5,
    minHeight: 44,
    overflow: 'hidden',
    ...Platform.select({
      ios: IOS_GLASS
        ? {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.18,
          shadowRadius: 20,
        }
        : {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.06,
          shadowRadius: 6,
        },
      android: {
        elevation: 4,
      },
    }),
  },
  pillInput: {
    flex: 1,
    fontSize: SigmaTypo.bodySmall + 1,
    lineHeight: 20,
    paddingVertical: 9,
    maxHeight: 120,
  },
  sendWrap: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

/* Unused keeping */
const _radiusRef = SigmaRadius; // keep ref so tree-shaking doesn't complain
void _radiusRef;
