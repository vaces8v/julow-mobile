import { ChatAttachment } from '@/components/chats/chat-attachment';
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
import { useSemanticTheme, type SemanticTheme } from '@/hooks/use-semantic-theme';
import { useI18n } from '@/i18n/context';
import { formatAppDateTime } from '@/i18n/format';
import {
  api,
  type CommentPayload,
  type TaskDetailPayload,
} from '@/lib/api';
import { cachedApi } from '@/lib/cache/cached-api';
import { useCacheSync } from '@/lib/cache/use-cache-sync';
import type { FileDisplaySource } from '@/lib/chat-attachments';
import { commentAttachmentToMessageShape } from '@/lib/chat-attachments';
import { useComposerAttachments } from '@/hooks/use-composer-attachments';
import {
  ArrowLeft01Icon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { BlurTargetView } from 'expo-blur';
import * as WebBrowser from 'expo-web-browser';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Linking,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const IOS_GLASS = Platform.OS === 'ios' && isLiquidGlassAvailable();

export default function TaskCommentsScreen() {
  const c = useSemanticTheme();
  const { user } = useAuth();
  const { t, locale } = useI18n();
  const cc = t.chats;
  const pd = t.projectDetail;
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id: string; title?: string }>();
  const taskId = Array.isArray(params.id) ? params.id[0] : params.id;
  const initialTitle = Array.isArray(params.title) ? params.title[0] : params.title;

  const [task, setTask] = useState<TaskDetailPayload | null>(null);
  const [comments, setComments] = useState<CommentPayload[]>(() =>
    taskId ? cachedApi.getTaskCommentsSync(taskId) : [],
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
  const [loading, setLoading] = useState(() =>
    taskId ? cachedApi.getTaskCommentsSync(taskId).length === 0 : true,
  );
  const [imagePreview, setImagePreview] = useState<{ source: FileDisplaySource; filename: string } | null>(null);
  const [videoPreview, setVideoPreview] = useState<{ source: FileDisplaySource; filename: string } | null>(null);
  const [linkConfirmUrl, setLinkConfirmUrl] = useState<string | null>(null);
  const listRef = useRef<FlatList<CommentPayload>>(null);
  const blurTargetRef = useRef<View>(null);

  const load = useCallback(async () => {
    if (!taskId) return;
    setLoading(true);
    try {
      const [tk, cm] = await Promise.all([
        api.getTask(taskId).catch(() => null),
        cachedApi.listComments('task', taskId).catch(() => [] as CommentPayload[]),
      ]);
      if (tk) setTask(tk);
      setComments(cm);
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  const syncFromCache = useCallback(() => {
    if (!taskId) return;
    setComments(cachedApi.getTaskCommentsSync(taskId));
  }, [taskId]);

  useCacheSync(syncFromCache);

  useEffect(() => {
    void load();
  }, [load]);

  const canSend = canSendComposer(draft);

  const handleSend = useCallback(async () => {
    const value = draft.trim();
    const filesDraft = pendingFiles;
    if (!canSendComposer(draft) || sending || !taskId) return;

    setSending(true);
    setUploadingName(null);
    const textDraft = draft;

    try {
      const next = await cachedApi.addComment({
        targetType: 'task',
        targetId: taskId,
        content: value,
        authorId: user?.id,
      });

      let enriched = next;
      for (const file of filesDraft) {
        setUploadingName(file.name);
        try {
          const added = await api.addCommentAttachment(
            next.id,
            { uri: file.uri, name: file.name, mimeType: file.mimeType },
            inferType(file),
          );
          enriched = {
            ...enriched,
            attachments: [...enriched.attachments, added],
          };
        } catch (err) {
          console.warn('[comments] failed to upload attachment', file.name, err);
        }
      }

      setDraft('');
      clearPending();
      setComments((prev) => [...prev, enriched]);
      requestAnimationFrame(() => {
        listRef.current?.scrollToEnd({ animated: true });
      });
    } catch (err) {
      console.error('Failed to send comment:', err);
      setDraft(textDraft);
    } finally {
      setSending(false);
      setUploadingName(null);
    }
  }, [draft, pendingFiles, sending, taskId, canSendComposer, clearPending, inferType, setSending, setUploadingName, user?.id]);

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
          console.warn('[comments] failed to open file', e);
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
      console.warn('[comments] failed to open link', url, e);
      await Linking.openURL(url).catch(() => {});
    }
  }, []);

  const headerTitle = task?.title ?? initialTitle ?? '';
  const HEADER_H = insets.top + 64;

  if (loading && comments.length === 0) {
    return (
      <View style={[styles.fill, styles.centered, { backgroundColor: c.background, paddingTop: HEADER_H }]}>
        <ActivityIndicator color={c.accent} />
      </View>
    );
  }

  return (
    <View style={[styles.fill, { backgroundColor: c.background }]}>
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle={c.scheme === 'dark' ? 'light-content' : 'dark-content'}
      />

      <BlurTargetView ref={blurTargetRef} style={styles.fill} collapsable={false}>
        <CommentsList
          listRef={listRef}
          comments={comments}
          tone={c}
          userId={user?.id}
          locale={locale}
          emptyLabel={pd.noComments}
          headerHeight={HEADER_H}
          bottomInset={insets.bottom}
          onLinkPress={mediaHandlers.onLinkPress}
          onImagePress={mediaHandlers.onImagePress}
          onVideoPress={mediaHandlers.onVideoPress}
          onFilePress={mediaHandlers.onFilePress}
        />
      </BlurTargetView>

      <CommentsHeader
        tone={c}
        insetsTop={insets.top}
        eyebrow={pd.taskEyebrow}
        title={headerTitle || pd.comments}
        subtitle={pd.commentsScreenSubtitle.replace('{n}', String(comments.length))}
        blurTargetRef={blurTargetRef}
      />

      <ChatFloatingInput
        tone={c}
        bottomInset={insets.bottom}
        value={draft}
        onChange={setDraft}
        placeholder={pd.writeComment}
        onSend={() => void handleSend()}
        sendLabel={pd.sendComment}
        hasDraft={canSend && !sending}
        blurTargetRef={blurTargetRef}
        onAttachPress={() => void pickAttachments(sending)}
        attachLabel={pd.attachFile}
        attachDisabled={sending}
        pendingFiles={pendingFiles}
        onRemovePendingFile={removePendingFile}
        sending={sending}
        sendingLabel={pd.sendingFiles}
        uploadingLabel={
          uploadingName
            ? pd.uploadingFile.replace('{name}', uploadingName)
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

function CommentsHeader({
  tone,
  insetsTop,
  eyebrow,
  title,
  subtitle,
  blurTargetRef,
}: {
  tone: SemanticTheme;
  insetsTop: number;
  eyebrow: string;
  title: string;
  subtitle: string;
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
            {subtitle}
          </Text>
        </View>
      </View>
    </View>
  );
}

function CommentsList({
  listRef,
  comments,
  tone,
  userId,
  locale,
  emptyLabel,
  headerHeight,
  bottomInset,
  onLinkPress,
  onImagePress,
  onVideoPress,
  onFilePress,
}: {
  listRef: React.RefObject<FlatList<CommentPayload> | null>;
  comments: CommentPayload[];
  tone: SemanticTheme;
  userId: string | undefined;
  locale: 'en' | 'ru' | 'de';
  emptyLabel: string;
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
      data={comments}
      keyExtractor={(item) => item.id}
      keyboardDismissMode="interactive"
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{
        paddingTop: headerHeight + 16,
        paddingHorizontal: 14,
        gap: 10,
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
      renderItem={({ item }) => {
        const isOwn = item.authorId === userId;
        return (
          <View
            style={[
              styles.bubble,
              isOwn ? styles.bubbleOwn : styles.bubbleOther,
              {
                backgroundColor: isOwn ? tone.accent + '18' : tone.surface,
                borderColor: isOwn ? tone.accent + '33' : tone.border,
              },
            ]}
          >
            <View style={styles.bubbleHeader}>
              <View
                style={[
                  styles.avatar,
                  { backgroundColor: isOwn ? tone.accent : tone.accent + '30' },
                ]}
              >
                <Text style={[styles.avatarText, { color: isOwn ? '#fff' : tone.accent }]}>
                  {item.authorId?.slice(0, 1).toUpperCase() ?? '?'}
                </Text>
              </View>
              <Text style={[styles.bubbleDate, { color: tone.muted }]}>
                {formatAppDateTime(item.createdAt, locale)}
              </Text>
            </View>
            {!!item.content && (
              <LinkifiedText
                text={item.content}
                style={[styles.bubbleText, { color: tone.foreground }]}
                linkStyle={{
                  color: isOwn ? tone.accent : tone.accent,
                  textDecorationLine: 'underline',
                  fontWeight: '600',
                }}
                onLinkPress={onLinkPress}
              />
            )}
            {item.attachments?.length > 0 ? (
              <View style={[styles.attachmentsCol, { marginTop: item.content ? 8 : 0 }]}>
                {item.attachments.map((att) => (
                  <ChatAttachment
                    key={att.id}
                    att={commentAttachmentToMessageShape(att)}
                    tone={tone}
                    isMe={isOwn}
                    onImagePress={onImagePress}
                    onVideoPress={onVideoPress}
                    onFilePress={onFilePress}
                  />
                ))}
              </View>
            ) : null}
          </View>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  centered: { alignItems: 'center', justifyContent: 'center' },
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

  bubble: {
    borderRadius: SigmaRadius.lg,
    borderWidth: 1,
    padding: 12,
    gap: 8,
    maxWidth: '92%',
  },
  bubbleOwn: { alignSelf: 'flex-end' },
  bubbleOther: { alignSelf: 'flex-start' },
  bubbleHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 10, fontWeight: '700' },
  bubbleDate: { fontSize: SigmaTypo.captionSmall },
  bubbleText: { fontSize: SigmaTypo.bodySmall, lineHeight: 20, fontWeight: '500' },
  attachmentsCol: {
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
    gap: 6,
    width: '100%',
  },
});
