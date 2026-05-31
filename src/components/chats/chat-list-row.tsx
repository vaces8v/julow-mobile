import { ChatAvatar } from '@/components/chats/chat-avatar';
import { SigmaTypo } from '@/constants/sigma';
import { useSemanticTheme } from '@/hooks/use-semantic-theme';
import { type ChatPayload } from '@/lib/api';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

function formatPreviewTime(iso: string, locale: 'ru' | 'en' | 'de'): string {
  try {
    const d = new Date(iso);
    const n = new Date();
    const same =
      d.getDate() === n.getDate() &&
      d.getMonth() === n.getMonth() &&
      d.getFullYear() === n.getFullYear();
    const tag = locale === 'ru' ? 'ru-RU' : locale === 'de' ? 'de-DE' : 'en-US';
    if (same) return d.toLocaleTimeString(tag, { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString(tag, { day: 'numeric', month: 'short' });
  } catch {
    return '';
  }
}

type ChatListRowProps = {
  chat: ChatPayload;
  title: string;
  locale: 'ru' | 'en' | 'de';
  onPress: () => void;
  directLabel: string;
  membersLabel: (count: number) => string;
  unreadPreview: (count: number) => string;
  unreadCount?: number;
  showDivider?: boolean;
};

export const ChatListRow = React.memo(function ChatListRow({
  chat,
  title,
  locale,
  onPress,
  directLabel,
  membersLabel,
  unreadPreview,
  unreadCount = 0,
  showDivider = false,
}: ChatListRowProps) {
  const c = useSemanticTheme();

  const isDm = chat.chatType === 'dm';
  const chatName = title;
  const memberCount = chat.members?.length ?? 0;
  const hasUnread = unreadCount > 0;
  const metaLabel = isDm ? directLabel : membersLabel(memberCount);
  const previewLine = hasUnread ? unreadPreview(unreadCount) : metaLabel;

  return (
    <Pressable
      onPress={onPress}
      android_ripple={{ color: c.surfaceSecondary, borderless: false }}
      style={({ pressed }) => [pressed && styles.pressed]}
    >
      <View
        style={[
          styles.row,
          hasUnread && { backgroundColor: c.accent + '0A' },
        ]}
      >
        <View style={styles.avatarWrap}>
          <ChatAvatar
            id={chat.id}
            name={chatName}
            chatType={chat.chatType}
            color={chat.color}
            size={46}
            showRing={false}
          />
          {hasUnread ? (
            <View style={[styles.unreadDot, { backgroundColor: c.accent, borderColor: c.surface }]} />
          ) : null}
        </View>

        <View style={styles.body}>
          <View style={styles.topLine}>
            <Text
              style={[
                styles.title,
                { color: c.foreground },
                hasUnread && styles.titleUnread,
              ]}
              numberOfLines={1}
            >
              {chatName}
            </Text>
            {chat.lastMessageAt ? (
              <Text
                style={[
                  styles.time,
                  { color: hasUnread ? c.accent : c.muted },
                ]}
              >
                {formatPreviewTime(chat.lastMessageAt, locale)}
              </Text>
            ) : null}
          </View>

          <View style={styles.bottomLine}>
            <Text
              style={[
                styles.preview,
                { color: hasUnread ? c.foreground : c.muted },
                hasUnread && styles.previewUnread,
              ]}
              numberOfLines={1}
            >
              {previewLine}
            </Text>
            {hasUnread ? (
              <View style={[styles.badge, { backgroundColor: c.accent }]}>
                <Text style={[styles.badgeText, { color: c.accentForeground }]}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Text>
              </View>
            ) : null}
          </View>
        </View>
      </View>
      {showDivider ? (
        <View style={[styles.divider, { backgroundColor: c.separator }]} />
      ) : null}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  pressed: {
    opacity: 0.72,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 13,
    paddingHorizontal: 14,
  },
  avatarWrap: {
    position: 'relative',
  },
  unreadDot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 11,
    height: 11,
    borderRadius: 6,
    borderWidth: 2,
  },
  body: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  topLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bottomLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    flex: 1,
    fontSize: SigmaTypo.bodySmall + 1,
    fontWeight: '600',
    letterSpacing: 0.05,
  },
  titleUnread: {
    fontWeight: '800',
  },
  time: {
    fontSize: 11,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  preview: {
    flex: 1,
    fontSize: SigmaTypo.caption,
    fontWeight: '500',
    lineHeight: 16,
  },
  previewUnread: {
    fontWeight: '700',
  },
  badge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 72,
  },
});
