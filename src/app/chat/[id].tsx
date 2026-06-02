import { ChatAttachment } from '@/components/chats/chat-attachment';
import { chatColorFromId, chatInitials } from '@/components/chats/chat-avatar';
import type { ChatMemberProfile } from '@/hooks/use-chat-member-profiles';
import { ChatEmptyArt } from '@/components/chats/chat-empty-art';
import { ChatFloatingInput } from '@/components/chats/chat-floating-input';
import { ChatImagePreviewSheet, ChatLinkConfirmSheet } from '@/components/chats/chat-image-preview-sheet';
import { ChatVideoPreviewSheet } from '@/components/chats/chat-video-preview-sheet';
import { LinkifiedText } from '@/components/chats/linkified-text';
import {
  useChatKeyboardInsets,
  useScrollToEndOnKeyboardShow,
} from '@/components/chats/use-chat-keyboard-insets';
import { HeaderBlurBackground } from '@/components/header-blur-background';
import { SigmaRadius, SigmaTypo } from '@/constants/sigma';
import { useAuth } from '@/contexts/auth-context';
import { useWorkspace } from '@/contexts/workspace-context';
import { useChatMemberProfiles } from '@/hooks/use-chat-member-profiles';
import { useComposerAttachments } from '@/hooks/use-composer-attachments';
import { useSemanticTheme, type SemanticTheme } from '@/hooks/use-semantic-theme';
import { useI18n } from '@/i18n/context';
import type { FileDisplaySource } from '@/lib/chat-attachments';
import { api, type ChatPayload, type MessagePayload } from '@/lib/api';
import { cachedApi } from '@/lib/cache/cached-api';
import { useCacheSync } from '@/lib/cache/use-cache-sync';
import { setActiveChatId } from '@/lib/active-chat';
import { subscribeChat, subscribeWsEvent, unsubscribeChat } from '@/lib/ws-client';
import { getScreenTopGlowStops } from '@/lib/theme-surfaces';
import {
  ArrowLeft01Icon,
  UserMultiple02Icon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { BlurTargetView } from 'expo-blur';
import * as WebBrowser from 'expo-web-browser';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Linking,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  FadeInDown,
  FadeOut,
  LinearTransition,
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

function formatDayLabel(
  iso: string,
  locale: 'en' | 'ru' | 'de',
  labels: { today: string; yesterday: string },
): string {
  try {
    const d = new Date(iso);
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);

    const sameDay =
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear();
    if (sameDay) return labels.today;

    const isYesterday =
      d.getDate() === yesterday.getDate() &&
      d.getMonth() === yesterday.getMonth() &&
      d.getFullYear() === yesterday.getFullYear();
    if (isYesterday) return labels.yesterday;

    const tag = locale === 'ru' ? 'ru-RU' : locale === 'de' ? 'de-DE' : 'en-US';
    return d.toLocaleDateString(tag, { weekday: 'long', day: 'numeric', month: 'long' });
  } catch {
    return '';
  }
}

function isSameDay(a?: string, b?: string): boolean {
  if (!a || !b) return false;
  const da = new Date(a);
  const db = new Date(b);
  return (
    da.getDate() === db.getDate() &&
    da.getMonth() === db.getMonth() &&
    da.getFullYear() === db.getFullYear()
  );
}

function mergeMessageList(
  existing: MessagePayload[],
  incoming: MessagePayload[],
): MessagePayload[] {
  const byId = new Map<string, MessagePayload>();
  for (const msg of existing) byId.set(msg.id, msg);
  for (const msg of incoming) byId.set(msg.id, msg);
  return [...byId.values()].sort((a, b) => {
    const ta = a.createdAt ? Date.parse(a.createdAt) : 0;
    const tb = b.createdAt ? Date.parse(b.createdAt) : 0;
    return ta - tb;
  });
}

export default function ChatThreadScreen() {
  const c = useSemanticTheme();
  const insets = useSafeAreaInsets();
  const { t, locale } = useI18n();
  const { user } = useAuth();
  const { activeWorkspaceId } = useWorkspace();
  const { memberOf, resolveDmChatTitle } = useChatMemberProfiles(
    activeWorkspaceId,
    user?.id,
  );
  const cc = t.chats;
  const params = useLocalSearchParams<{ id: string }>();
  const chatId = Array.isArray(params.id) ? params.id[0] : params.id;

  const [chat, setChat] = useState<ChatPayload | null>(() =>
    chatId ? cachedApi.getChatSync(chatId) : null,
  );
  const [messages, setMessages] = useState<MessagePayload[]>(() =>
    chatId ? cachedApi.getChatMessagesSync(chatId) : [],
  );
  const [loading, setLoading] = useState(() =>
    chatId ? cachedApi.getChatMessagesSync(chatId).length === 0 : true,
  );
  const [draft, setDraft] = useState('');
  const {
    pendingFiles,
    sending,
    setSending,
    uploadingName,
    setUploadingName,
    canSend: canSendComposer,
    pickAttachments,
    removePendingFile,
    clearPending,
    inferType,
  } = useComposerAttachments();
  const [imagePreview, setImagePreview] = useState<{ source: FileDisplaySource; filename: string } | null>(null);
  const [videoPreview, setVideoPreview] = useState<{ source: FileDisplaySource; filename: string } | null>(null);
  const [linkConfirmUrl, setLinkConfirmUrl] = useState<string | null>(null);
  const listRef = useRef<FlatList<MessagePayload>>(null);
  const messagesRef = useRef<MessagePayload[]>([]);
  const sendingRef = useRef(false);
  const blurTargetRef = useRef<View>(null);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    if (!chatId) return;
    const cachedChat = cachedApi.getChatSync(chatId);
    const cachedMessages = cachedApi.getChatMessagesSync(chatId);
    setChat(cachedChat);
    setMessages(cachedMessages);
    setLoading(cachedMessages.length === 0);
    setLinkConfirmUrl(null);
    setImagePreview(null);
    setVideoPreview(null);

    let cancelled = false;
    (async () => {
      try {
        const [chatData, msgData] = await Promise.all([
          cachedApi.getChat(chatId),
          cachedApi.getChatMessages(chatId, 100),
        ]);
        if (cancelled) return;
        setChat(chatData);
        setMessages(msgData);
        api.markChatRead(chatId).catch(() => {});
      } catch (e) {
        console.error('Failed to load chat:', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [chatId]);

  const syncFromCache = useCallback(() => {
    if (!chatId) return;
    const cachedChat = cachedApi.getChatSync(chatId);
    const cachedMessages = cachedApi.getChatMessagesSync(chatId);
    if (cachedChat) setChat(cachedChat);
    if (cachedMessages.length > 0) {
      setMessages((prev) => mergeMessageList(prev, cachedMessages));
    }
  }, [chatId]);

  useCacheSync(syncFromCache);

  useEffect(() => {
    if (!chatId) return;
    subscribeChat(chatId);
    setActiveChatId(chatId);

    const unsub = subscribeWsEvent('chat.message.created', (payload) => {
      const msgChatId = payload.chat_id as string;
      const senderId = payload.sender_id as string;
      const messageId = payload.message_id as string | undefined;
      if (msgChatId !== chatId) return;
      if (senderId === user?.id) return;
      if (messageId && messagesRef.current.some((m) => m.id === messageId)) return;

      api
        .listMessages(chatId, { limit: 5 })
        .then(({ items }) => {
          const incoming = messageId
            ? items.filter((m) => m.id === messageId)
            : items.filter((m) => m.senderId !== user?.id);
          if (incoming.length === 0) return;

          setMessages((prev) => mergeMessageList(prev, newMsgs));
          requestAnimationFrame(() => {
            listRef.current?.scrollToEnd({ animated: true });
          });
        })
        .catch(() => {});
    });

    return () => {
      unsubscribeChat(chatId);
      setActiveChatId(null);
      unsub();
    };
  }, [chatId, user?.id]);

  const hasDraft = canSendComposer(draft);

  const handleSend = useCallback(async () => {
    const text = draft.trim();
    const filesDraft = pendingFiles;
    if (!canSendComposer(draft) || !chatId || sending || sendingRef.current) return;

    sendingRef.current = true;
    setSending(true);
    setUploadingName(null);
    const textDraft = draft;

    try {
      const newMsg = await cachedApi.sendMessage(chatId, text, { senderId: user?.id });
      let enriched = newMsg;
      for (const file of filesDraft) {
        setUploadingName(file.name);
        try {
          const added = await api.addMessageAttachment(
            newMsg.id,
            { uri: file.uri, name: file.name, mimeType: file.mimeType },
            inferType(file),
          );
          enriched = {
            ...enriched,
            attachments: [...enriched.attachments, added],
          };
        } catch (err) {
          console.warn('[chat] failed to upload attachment', file.name, err);
        }
      }

      setDraft('');
      clearPending();
      setMessages((prev) => mergeMessageList(prev, [enriched]));
      requestAnimationFrame(() => {
        listRef.current?.scrollToEnd({ animated: true });
      });
    } catch (e) {
      console.error('Failed to send message:', e);
      setDraft(textDraft);
    } finally {
      sendingRef.current = false;
      setSending(false);
      setUploadingName(null);
    }
  }, [
    chatId,
    draft,
    pendingFiles,
    sending,
    canSendComposer,
    clearPending,
    inferType,
    setSending,
    setUploadingName,
    user?.id,
  ]);

  const HEADER_H = insets.top + 64;

  const mediaHandlers = useMemo(
    () => ({
      onLinkPress: (url: string) => setLinkConfirmUrl(url),
      onImagePress: (source: FileDisplaySource, filename: string) =>
        setImagePreview({ source, filename }),
      onVideoPress: (source: FileDisplaySource, filename: string) =>
        setVideoPreview({ source, filename }),
      onFilePress: async (source: FileDisplaySource) => {
        try {
          await Linking.openURL(source.uri);
        } catch (e) {
          console.warn('[chat] failed to open file', e);
        }
      },
    }),
    [],
  );

  const handleConfirmLink = useCallback(async (url: string) => {
    setLinkConfirmUrl(null);
    try {
      await WebBrowser.openBrowserAsync(url);
    } catch (e) {
      console.warn('[chat] failed to open link', url, e);
      await Linking.openURL(url).catch(() => {});
    }
  }, []);

  if (loading || !chat) {
    return (
      <View style={[styles.fill, { backgroundColor: c.background, paddingTop: insets.top + 40 }]}>
        <Text style={[styles.empty, { color: c.muted }]}>
          {loading ? '' : (cc.emptySelect ?? 'Chat not found')}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.fill, { backgroundColor: c.background }]}>
      <StatusBar barStyle={c.scheme === 'dark' ? 'light-content' : 'dark-content'} />

      {c.scheme === 'dark' ? (
        <LinearGradient
          colors={getScreenTopGlowStops(c.scheme, c.accent, c.background)}
          style={styles.threadGlow}
          pointerEvents="none"
        />
      ) : null}

      <BlurTargetView ref={blurTargetRef} style={styles.fill} collapsable={false}>
        <ChatList
          listRef={listRef}
          messages={messages}
          tone={c}
          userId={user?.id}
          memberOf={memberOf}
          locale={locale}
          emptyLabel={cc.noMessages}
          dayLabels={{ today: cc.today, yesterday: cc.yesterday }}
          headerHeight={HEADER_H}
          bottomInset={insets.bottom}
          onLinkPress={mediaHandlers.onLinkPress}
          onImagePress={mediaHandlers.onImagePress}
          onVideoPress={mediaHandlers.onVideoPress}
          onFilePress={mediaHandlers.onFilePress}
        />
      </BlurTargetView>

      <ThreadHeader
        chat={chat}
        title={resolveDmChatTitle(chat)}
        insetsTop={insets.top}
        tone={c}
        hint={cc.defaultGroupHint}
        directLabel={cc.directLabel}
        blurTargetRef={blurTargetRef}
      />

      <ChatFloatingInput
        tone={c}
        bottomInset={insets.bottom}
        value={draft}
        onChange={setDraft}
        placeholder={cc.typeMessage}
        onSend={() => void handleSend()}
        sendLabel={cc.send}
        hasDraft={hasDraft}
        blurTargetRef={blurTargetRef}
        onAttachPress={() => void pickAttachments(sending)}
        attachLabel={cc.attachFile}
        attachDisabled={sending}
        pendingFiles={pendingFiles}
        onRemovePendingFile={removePendingFile}
        sending={sending}
        sendingLabel={cc.sendingFiles}
        uploadingLabel={
          uploadingName
            ? cc.uploadingFile.replace('{name}', uploadingName)
            : undefined
        }
      />

      <ChatImagePreviewSheet
        open={imagePreview !== null}
        onOpenChange={(open) => { if (!open) setImagePreview(null); }}
        source={imagePreview?.source ?? null}
        filename={imagePreview?.filename ?? ''}
        tone={c}
      />

      <ChatVideoPreviewSheet
        open={videoPreview !== null}
        onOpenChange={(open) => { if (!open) setVideoPreview(null); }}
        source={videoPreview?.source ?? null}
        filename={videoPreview?.filename ?? ''}
        tone={c}
      />

      <ChatLinkConfirmSheet
        open={linkConfirmUrl !== null}
        url={linkConfirmUrl}
        tone={c}
        title={cc.linkConfirmTitle}
        description={cc.linkConfirmDesc}
        cancelLabel={cc.linkConfirmCancel}
        openLabel={cc.linkConfirmOpen}
        onCancel={() => setLinkConfirmUrl(null)}
        onConfirm={handleConfirmLink}
      />
    </View>
  );
}

function ChatList({
  listRef,
  messages,
  tone,
  userId,
  memberOf,
  locale,
  emptyLabel,
  dayLabels,
  headerHeight,
  bottomInset,
  onLinkPress,
  onImagePress,
  onVideoPress,
  onFilePress,
}: {
  listRef: React.RefObject<FlatList<MessagePayload> | null>;
  messages: MessagePayload[];
  tone: SemanticTheme;
  userId: string | undefined;
  memberOf: (userId: string) => ChatMemberProfile;
  locale: 'en' | 'ru' | 'de';
  emptyLabel: string;
  dayLabels: { today: string; yesterday: string };
  headerHeight: number;
  bottomInset: number;
  onLinkPress: (url: string) => void;
  onImagePress: (source: FileDisplaySource, filename: string) => void;
  onVideoPress: (source: FileDisplaySource, filename: string) => void;
  onFilePress: (source: FileDisplaySource, filename: string) => void;
}) {
  const { footerStyle } = useChatKeyboardInsets(bottomInset);
  useScrollToEndOnKeyboardShow(listRef);

  return (
    <FlatList
      ref={listRef}
      data={messages}
      keyExtractor={(m: MessagePayload, index) => m.id || `msg-${index}`}
      keyboardDismissMode="interactive"
      keyboardShouldPersistTaps="handled"
      removeClippedSubviews
      windowSize={7}
      maxToRenderPerBatch={10}
      initialNumToRender={15}
      contentContainerStyle={{
        paddingTop: headerHeight + 16,
        paddingHorizontal: 14,
        gap: 6,
        flexGrow: 1,
      }}
      style={styles.fill}
      showsVerticalScrollIndicator={false}
      onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
      ListEmptyComponent={
        <View style={styles.listEmpty}>
          <ChatEmptyArt />
          <Text style={[styles.listEmptyTitle, { color: tone.foreground }]}>{emptyLabel}</Text>
        </View>
      }
      ListFooterComponent={<Animated.View style={footerStyle} />}
      renderItem={({ item, index }: { item: MessagePayload; index: number }) => (
        <MessageRow
          item={item}
          index={index}
          messages={messages}
          tone={tone}
          userId={userId}
          memberOf={memberOf}
          locale={locale}
          dayLabels={dayLabels}
          onLinkPress={onLinkPress}
          onImagePress={onImagePress}
          onVideoPress={onVideoPress}
          onFilePress={onFilePress}
        />
      )}
    />
  );
}

const MessageRow = React.memo(function MessageRow({
  item,
  index,
  messages,
  tone,
  userId,
  memberOf,
  locale,
  dayLabels,
  onLinkPress,
  onImagePress,
  onVideoPress,
  onFilePress,
}: {
  item: MessagePayload;
  index: number;
  messages: MessagePayload[];
  tone: SemanticTheme;
  userId: string | undefined;
  memberOf: (userId: string) => ChatMemberProfile;
  locale: 'ru' | 'en' | 'de';
  dayLabels: { today: string; yesterday: string };
  onLinkPress: (url: string) => void;
  onImagePress: (source: FileDisplaySource, filename: string) => void;
  onVideoPress: (source: FileDisplaySource, filename: string) => void;
  onFilePress: (source: FileDisplaySource, filename: string) => void;
}) {
  const prev = messages[index - 1];
  const sameAuthorAsPrev = prev?.senderId === item.senderId;
  const showDay = !prev || !isSameDay(prev.createdAt, item.createdAt);

  return (
    <View>
      {showDay && item.createdAt ? (
        <DaySeparator
          label={formatDayLabel(item.createdAt, locale, dayLabels)}
          tone={tone}
        />
      ) : null}
      <Bubble
        msg={item}
        tone={tone}
        isMe={item.senderId === userId}
        isLocal={item.id.startsWith('local-')}
        groupWithPrev={sameAuthorAsPrev && !showDay}
        senderProfile={memberOf(item.senderId)}
        locale={locale}
        onLinkPress={onLinkPress}
        onImagePress={onImagePress}
        onVideoPress={onVideoPress}
        onFilePress={onFilePress}
      />
    </View>
  );
});

function DaySeparator({ label, tone }: { label: string; tone: SemanticTheme }) {
  return (
    <View style={styles.dayRow}>
      <View style={[styles.dayLine, { backgroundColor: tone.border }]} />
      <View style={[styles.dayPill, { backgroundColor: tone.surfaceSecondary, borderColor: tone.border }]}>
        <Text style={[styles.dayText, { color: tone.muted }]}>{label}</Text>
      </View>
      <View style={[styles.dayLine, { backgroundColor: tone.border }]} />
    </View>
  );
}

function ThreadHeader({
  chat,
  title,
  insetsTop,
  tone,
  hint,
  directLabel,
  blurTargetRef,
}: {
  chat: ChatPayload;
  title: string;
  insetsTop: number;
  tone: SemanticTheme;
  hint: string;
  directLabel: string;
  blurTargetRef: React.RefObject<View | null>;
}) {
  const isDm = chat.chatType === 'dm';
  const chatColor = chatColorFromId(chat.id, chat.color);
  const subtitle = isDm ? directLabel : `${chat.members?.length ?? 0} members · ${hint}`;
  const initials = chatInitials(title);

  return (
    <View
      style={[styles.headerAbs, { paddingTop: insetsTop, height: insetsTop + 64 }]}
      pointerEvents="box-none"
    >
      {IOS_GLASS ? (
        <GlassView glassEffectStyle="regular" colorScheme={tone.scheme} style={StyleSheet.absoluteFill} />
      ) : (
        <HeaderBlurBackground blurTargetRef={blurTargetRef} />
      )}
      <View style={[styles.headerBorder, { backgroundColor: tone.border }]} />
      <View style={styles.headerRow}>
        <Pressable
          style={[styles.iconBtn, { backgroundColor: tone.surfaceSecondary }]}
          onPress={() => router.back()}
          hitSlop={10}
          android_ripple={{ color: tone.surfaceTertiary, borderless: true, radius: 22 }}
        >
          <HugeiconsIcon icon={ArrowLeft01Icon} size={22} color={tone.foreground} strokeWidth={1.8} />
        </Pressable>

        {isDm ? (
          <LinearGradient
            colors={[chatColor, `${chatColor}CC`]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.headerPeerAvatar, { borderCurve: 'continuous' }]}
          >
            <Text style={styles.headerPeerInitials}>{initials}</Text>
          </LinearGradient>
        ) : (
          <LinearGradient
            colors={[chatColor, `${chatColor}CC`]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.headerGroupAvatar, { borderCurve: 'continuous' }]}
          >
            <HugeiconsIcon icon={UserMultiple02Icon} size={18} color="#fff" strokeWidth={1.9} />
          </LinearGradient>
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

const Bubble = React.memo(function Bubble({
  msg,
  tone,
  isMe,
  isLocal,
  groupWithPrev,
  senderProfile,
  locale,
  onLinkPress,
  onImagePress,
  onVideoPress,
  onFilePress,
}: {
  msg: MessagePayload;
  tone: SemanticTheme;
  isMe: boolean;
  isLocal: boolean;
  groupWithPrev: boolean;
  senderProfile: ChatMemberProfile;
  locale: 'ru' | 'en' | 'de';
  onLinkPress: (url: string) => void;
  onImagePress: (source: FileDisplaySource, filename: string) => void;
  onVideoPress: (source: FileDisplaySource, filename: string) => void;
  onFilePress: (source: FileDisplaySource, filename: string) => void;
}) {
  const myBg = tone.accent;
  const peerBg = tone.surface;
  const myFg = tone.accentForeground;
  const peerFg = tone.foreground;

  const senderInitial = senderProfile.initials;
  const senderColor = senderProfile.color;
  const showAvatar = !isMe && !groupWithPrev;

  const rowStyle = [
    styles.bubbleRow,
    isMe ? styles.bubbleRowMe : styles.bubbleRowPeer,
    groupWithPrev && { marginTop: -2 },
  ];

  if (!isLocal) {
    return (
      <View style={rowStyle}>
        {!isMe && (
          <View style={styles.avatarSlot}>
            {showAvatar && (
              <LinearGradient
                colors={[senderColor, `${senderColor}CC`]}
                style={[styles.msgAvatar, { borderCurve: 'continuous' }]}
              >
                <Text style={styles.msgAvatarInitials}>{senderInitial}</Text>
              </LinearGradient>
            )}
          </View>
        )}
        <View
          style={[
            styles.bubble,
            isMe
              ? {
                  backgroundColor: myBg,
                  borderTopRightRadius: groupWithPrev ? 16 : 8,
                  borderTopLeftRadius: 20,
                  borderBottomLeftRadius: 20,
                  borderBottomRightRadius: 20,
                  borderCurve: 'continuous',
                  boxShadow: '0 4px 14px rgba(37,99,235,0.22)',
                }
              : {
                  backgroundColor: peerBg,
                  borderColor: tone.border,
                  borderWidth: StyleSheet.hairlineWidth,
                  borderTopLeftRadius: groupWithPrev ? 16 : 8,
                  borderTopRightRadius: 20,
                  borderBottomLeftRadius: 20,
                  borderBottomRightRadius: 20,
                  borderCurve: 'continuous',
                  boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
                },
          ]}
        >
          {!!msg.content && (
            <LinkifiedText
              text={msg.content}
              style={[styles.bubbleText, { color: isMe ? myFg : peerFg }]}
              linkStyle={{
                color: isMe ? myFg : tone.accent,
                textDecorationLine: 'underline',
                fontWeight: '600',
              }}
              onLinkPress={onLinkPress}
            />
          )}
          {msg.attachments?.length > 0 && (
            <View style={[styles.attachmentsCol, { marginTop: msg.content ? 6 : 0 }]}>
              {msg.attachments.map((att) => (
                <ChatAttachment
                  key={att.id}
                  att={att}
                  tone={tone}
                  isMe={isMe}
                  onImagePress={onImagePress}
                  onVideoPress={onVideoPress}
                  onFilePress={onFilePress}
                />
              ))}
            </View>
          )}
          {msg.createdAt && (
            <Text style={[styles.bubbleTime, { color: isMe ? myFg + 'B8' : tone.muted }]}>
              {formatTime(msg.createdAt, locale)}
            </Text>
          )}
        </View>
      </View>
    );
  }

  return (
    <Animated.View
      entering={FadeInDown.springify().damping(22).stiffness(260)}
      exiting={FadeOut.duration(120)}
      layout={LinearTransition.springify().damping(22)}
      style={rowStyle}
    >
      {!isMe && (
        <View style={styles.avatarSlot}>
          {showAvatar && (
            <LinearGradient
              colors={[senderColor, `${senderColor}CC`]}
              style={[styles.msgAvatar, { borderCurve: 'continuous' }]}
            >
              <Text style={styles.msgAvatarInitials}>{senderInitial}</Text>
            </LinearGradient>
          )}
        </View>
      )}
      <View
        style={[
          styles.bubble,
          isMe
            ? {
                backgroundColor: myBg,
                borderTopRightRadius: groupWithPrev ? 16 : 8,
                borderTopLeftRadius: 20,
                borderBottomLeftRadius: 20,
                borderBottomRightRadius: 20,
                borderCurve: 'continuous',
                boxShadow: '0 4px 14px rgba(37,99,235,0.22)',
              }
            : {
                backgroundColor: peerBg,
                borderColor: tone.border,
                borderWidth: StyleSheet.hairlineWidth,
                borderTopLeftRadius: groupWithPrev ? 16 : 8,
                borderTopRightRadius: 20,
                borderBottomLeftRadius: 20,
                borderBottomRightRadius: 20,
                borderCurve: 'continuous',
                boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
              },
        ]}
      >
        {!!msg.content && (
          <LinkifiedText
            text={msg.content}
            style={[styles.bubbleText, { color: isMe ? myFg : peerFg }]}
            linkStyle={{
              color: isMe ? myFg : tone.accent,
              textDecorationLine: 'underline',
              fontWeight: '600',
            }}
            onLinkPress={onLinkPress}
          />
        )}
        {msg.attachments?.length > 0 && (
          <View style={[styles.attachmentsCol, { marginTop: msg.content ? 6 : 0 }]}>
            {msg.attachments.map((att) => (
              <ChatAttachment
                key={att.id}
                att={att}
                tone={tone}
                isMe={isMe}
                onImagePress={onImagePress}
                onVideoPress={onVideoPress}
                onFilePress={onFilePress}
              />
            ))}
          </View>
        )}
        {msg.createdAt && (
          <Text style={[styles.bubbleTime, { color: isMe ? myFg + 'B8' : tone.muted }]}>
            {formatTime(msg.createdAt, locale)}
          </Text>
        )}
      </View>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  fill: { flex: 1 },
  threadGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 280,
    zIndex: 0,
  },
  empty: {
    textAlign: 'center',
    fontSize: SigmaTypo.bodySmall,
  },
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
    paddingHorizontal: 10,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderCurve: 'continuous',
  },
  headerTitles: { flex: 1, minWidth: 0 },
  headerTitle: {
    fontSize: SigmaTypo.headline,
    fontWeight: '800',
    letterSpacing: 0.1,
  },
  headerSubtitle: {
    marginTop: 1,
    fontSize: 11,
    fontWeight: '500',
  },
  headerGroupAvatar: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerPeerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerPeerInitials: { color: '#fff', fontWeight: '800', fontSize: 13 },
  listEmpty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 24,
  },
  listEmptyTitle: {
    marginTop: 12,
    fontSize: SigmaTypo.bodySmall,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 260,
  },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 10,
  },
  dayLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  dayPill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderCurve: 'continuous',
  },
  dayText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'capitalize',
  },
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
  msgAvatarInitials: { color: '#fff', fontSize: 11, fontWeight: '800' },
  bubble: {
    maxWidth: '78%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 4,
  },
  bubbleText: {
    fontSize: SigmaTypo.bodySmall + 1,
    lineHeight: 21,
    fontWeight: '500',
  },
  bubbleTime: {
    fontSize: 10,
    fontWeight: '600',
    alignSelf: 'flex-end',
    fontVariant: ['tabular-nums'],
    marginTop: 2,
  },
  attachmentsCol: {
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
    gap: 6,
    width: '100%',
  },
});

const _radiusRef = SigmaRadius;
void _radiusRef;
