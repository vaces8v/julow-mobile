import { HeaderBlurBackground } from '@/components/header-blur-background';
import { ChatFloatingInput } from '@/components/chats/chat-floating-input';
import {
  useChatKeyboardInsets,
  useScrollToEndOnKeyboardShow,
} from '@/components/chats/use-chat-keyboard-insets';
import { SigmaRadius, SigmaTypo } from '@/constants/sigma';
import { useSemanticTheme, type SemanticTheme } from '@/hooks/use-semantic-theme';
import { useI18n } from '@/i18n/context';
import { ArrowLeft01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { useChat, useLocalParticipant } from '@livekit/react-native';
import { BlurTargetView } from 'expo-blur';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { router } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const IOS_GLASS = Platform.OS === 'ios' && isLiquidGlassAvailable();

type ChatRow = {
  id: string;
  fromId: string;
  displayName: string;
  text: string;
  timestamp: number;
  isSelf: boolean;
};

type Props = {
  meetingTitle: string;
};

export function MeetingChatView({ meetingTitle }: Props) {
  const c = useSemanticTheme();
  const { t } = useI18n();
  const m = t.meetings;
  const insets = useSafeAreaInsets();
  const blurTargetRef = useRef<View>(null);
  const listRef = useRef<FlatList<ChatRow>>(null);

  const { localParticipant } = useLocalParticipant();
  const { chatMessages, send: sendChat } = useChat();
  const [draft, setDraft] = useState('');

  const chatRows = useMemo((): ChatRow[] => {
    return chatMessages.map((msg, index) => {
      const fromId = msg.from?.identity ?? '?';
      const displayName =
        msg.from?.name?.trim() ||
        (fromId === localParticipant.identity ? m.roomYou : fromId);
      return {
        id: `${msg.timestamp}-${index}`,
        fromId,
        displayName,
        text: msg.message,
        timestamp: msg.timestamp,
        isSelf: fromId === localParticipant.identity,
      };
    });
  }, [chatMessages, localParticipant.identity, m.roomYou]);

  const handleSend = useCallback(() => {
    const text = draft.trim();
    if (!text) return;
    sendChat(text);
    setDraft('');
    requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
  }, [draft, sendChat]);

  const HEADER_H = insets.top + 64;

  return (
    <View style={[styles.fill, { backgroundColor: c.background }]}>
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle={c.scheme === 'dark' ? 'light-content' : 'dark-content'}
      />

      <BlurTargetView ref={blurTargetRef} style={styles.fill} collapsable={false}>
        <MeetingChatList
          listRef={listRef}
          rows={chatRows}
          tone={c}
          emptyLabel={t.chats.noMessages}
          headerHeight={HEADER_H}
          bottomInset={insets.bottom}
        />
      </BlurTargetView>

      <MeetingChatHeader
        tone={c}
        insetsTop={insets.top}
        eyebrow={m.chat}
        title={meetingTitle || m.chatTitle}
        subtitle={m.chatTitle}
        messageCount={chatRows.length}
        blurTargetRef={blurTargetRef}
      />

      <ChatFloatingInput
        tone={c}
        bottomInset={insets.bottom}
        value={draft}
        onChange={setDraft}
        placeholder={m.chatPlaceholder}
        onSend={handleSend}
        sendLabel={t.chats.send}
        hasDraft={Boolean(draft.trim())}
        blurTargetRef={blurTargetRef}
      />
    </View>
  );
}

function MeetingChatHeader({
  tone,
  insetsTop,
  eyebrow,
  title,
  subtitle,
  messageCount,
  blurTargetRef,
}: {
  tone: SemanticTheme;
  insetsTop: number;
  eyebrow: string;
  title: string;
  subtitle: string;
  messageCount: number;
  blurTargetRef: React.RefObject<View | null>;
}) {
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
          style={[styles.backBtn, { backgroundColor: tone.surfaceSecondary }]}
          onPress={() => router.back()}
          hitSlop={12}
          android_ripple={{ color: tone.surfaceTertiary, borderless: true, radius: 18 }}
        >
          <HugeiconsIcon icon={ArrowLeft01Icon} size={18} color={tone.foreground} strokeWidth={2} />
        </Pressable>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[styles.eyebrow, { color: tone.accent }]} numberOfLines={1}>
            {eyebrow}
          </Text>
          <Text style={[styles.title, { color: tone.foreground }]} numberOfLines={1}>
            {title}
          </Text>
          <Text style={[styles.subtitle, { color: tone.muted }]} numberOfLines={1}>
            {messageCount > 0 ? `${messageCount} · ${subtitle}` : subtitle}
          </Text>
        </View>
      </View>
    </View>
  );
}

function MeetingChatList({
  listRef,
  rows,
  tone,
  emptyLabel,
  headerHeight,
  bottomInset,
}: {
  listRef: React.RefObject<FlatList<ChatRow> | null>;
  rows: ChatRow[];
  tone: SemanticTheme;
  emptyLabel: string;
  headerHeight: number;
  bottomInset: number;
}) {
  const { footerStyle } = useChatKeyboardInsets(bottomInset);
  useScrollToEndOnKeyboardShow(listRef);

  return (
    <FlatList
      ref={listRef}
      data={rows}
      keyExtractor={(item) => item.id}
      keyboardDismissMode="interactive"
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{
        paddingTop: headerHeight + 16,
        paddingHorizontal: 14,
        gap: 8,
        flexGrow: 1,
      }}
      style={styles.fill}
      showsVerticalScrollIndicator={false}
      onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
      ListEmptyComponent={
        <View style={styles.listEmpty}>
          <View
            style={[
              styles.emptyCard,
              { backgroundColor: tone.surfaceSecondary, borderColor: tone.border },
            ]}
          >
            <Text style={[styles.emptyText, { color: tone.muted }]}>{emptyLabel}</Text>
          </View>
        </View>
      }
      ListFooterComponent={<Animated.View style={footerStyle} />}
      renderItem={({ item, index }) => {
        const prev = index > 0 ? rows[index - 1] : null;
        const showName = !prev || prev.fromId !== item.fromId;
        return <MeetingChatBubble row={item} tone={tone} showName={showName} />;
      }}
    />
  );
}

function MeetingChatBubble({
  row,
  tone,
  showName,
}: {
  row: ChatRow;
  tone: SemanticTheme;
  showName: boolean;
}) {
  const accent = tone.accent;
  return (
    <Animated.View
      entering={FadeInDown.duration(180)}
      style={[styles.chatRow, row.isSelf ? styles.chatRowSelf : styles.chatRowPeer]}
    >
      <View
        style={[
          styles.chatBubble,
          row.isSelf
            ? {
                backgroundColor: accent,
                borderTopRightRadius: 6,
                borderColor: accent + '55',
              }
            : {
                backgroundColor: tone.surfaceSecondary,
                borderTopLeftRadius: 6,
                borderColor: tone.border,
              },
        ]}
      >
        {showName ? (
          <Text
            style={[
              styles.chatName,
              { color: row.isSelf ? 'rgba(255,255,255,0.75)' : tone.muted },
            ]}
          >
            {row.displayName}
          </Text>
        ) : null}
        <Text style={[styles.chatBody, { color: row.isSelf ? '#fff' : tone.foreground }]}>
          {row.text}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  headerAbs: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
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
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 2,
  },
  title: { fontSize: SigmaTypo.body, fontWeight: '700' },
  subtitle: { fontSize: SigmaTypo.captionSmall, marginTop: 1 },
  listEmpty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 24,
  },
  emptyCard: {
    paddingVertical: 30,
    paddingHorizontal: 24,
    borderRadius: SigmaRadius.lg,
    borderWidth: 1,
    alignItems: 'center',
  },
  emptyText: { fontSize: SigmaTypo.bodySmall, fontStyle: 'italic' },
  chatRow: { maxWidth: '86%' },
  chatRowSelf: { alignSelf: 'flex-end' },
  chatRowPeer: { alignSelf: 'flex-start' },
  chatBubble: {
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chatName: {
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 3,
    letterSpacing: 0.2,
  },
  chatBody: {
    fontSize: SigmaTypo.bodySmall,
    lineHeight: 20,
  },
});
