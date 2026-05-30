import { chatColorFromId, chatInitials } from '@/components/chats/chat-avatar';
import { SigmaRadius, SigmaTypo } from '@/constants/sigma';
import { useSemanticTheme, type SemanticTheme } from '@/hooks/use-semantic-theme';
import { useI18n } from '@/i18n/context';
import {
  ArrowLeft01Icon,
  BubbleChatIcon,
  CallEnd02Icon,
  Cancel01Icon,
  ComputerScreenShareIcon,
  Mic01Icon,
  MicOff01Icon,
  SentIcon,
  VideoReplayIcon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import {
  AudioSession,
  VideoTrack,
  useChat,
  useConnectionState,
  useIsSpeaking,
  useLocalParticipant,
  useParticipantInfo,
  useParticipants,
  useTracks,
  useTrackMutedIndicator,
  isTrackReference,
  type TrackReferenceOrPlaceholder,
} from '@livekit/react-native';
import { BlurTargetView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { ConnectionState, Track, VideoPresets } from 'livekit-client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppBottomSheetContent, BottomSheet, sheetSnapPercent } from '@/components/app-bottom-sheet';

type Props = {
  meetingTitle: string;
  onLeave: () => void;
};

const PAGE_GUTTER = 10;
const CHAT_SHEET_SNAP_POINTS = [sheetSnapPercent(0.62), sheetSnapPercent(0.88)] as const;

type ChatRow = {
  id: string;
  fromId: string;
  displayName: string;
  text: string;
  timestamp: number;
  isSelf: boolean;
};

function hasActiveVideo(trackRef: TrackReferenceOrPlaceholder): boolean {
  if (!isTrackReference(trackRef)) return false;
  const pub = trackRef.publication;
  const track = pub?.track;
  if (!pub || !track || pub.isMuted || track.isMuted) return false;
  const dims = track.dimensions;
  if (dims && dims.width > 0 && dims.height > 0) return true;
  return track.mediaStream != null;
}

function participantDisplayName(name: string | undefined, identity: string, fallback: string) {
  const trimmed = name?.trim();
  if (trimmed && trimmed !== identity) return trimmed;
  return identity || fallback;
}

export function MeetingRoomView({ meetingTitle, onLeave }: Props) {
  const c = useSemanticTheme();
  const { t } = useI18n();
  const m = t.meetings;
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const blurTargetRef = useRef<View>(null);

  const connectionState = useConnectionState();
  const {
    localParticipant,
    isMicrophoneEnabled,
    isCameraEnabled,
    isScreenShareEnabled,
  } = useLocalParticipant();
  const participants = useParticipants();

  const [chatOpen, setChatOpen] = useState(false);
  const [chatDraft, setChatDraft] = useState('');
  const listRef = useRef<FlatList<ChatRow>>(null);
  const cameraPromptedRef = useRef(false);

  const { chatMessages, send: sendChat } = useChat();

  useEffect(() => {
    void AudioSession.startAudioSession();
    return () => {
      void AudioSession.stopAudioSession();
    };
  }, []);

  useEffect(() => {
    if (connectionState !== ConnectionState.Connected) return;
    if (cameraPromptedRef.current) return;
    cameraPromptedRef.current = true;
    Alert.alert(m.cameraPromptTitle, m.cameraPromptMessage, [
      { text: m.cameraPromptNo, style: 'cancel' },
      {
        text: m.cameraPromptYes,
        onPress: () => {
          void localParticipant.setCameraEnabled(true);
        },
      },
    ]);
  }, [connectionState, localParticipant, m]);

  const cameraTracks = useTracks(
    [{ source: Track.Source.Camera, withPlaceholder: true }],
    { onlySubscribed: false },
  );
  const screenTracks = useTracks(
    [{ source: Track.Source.ScreenShare, withPlaceholder: true }],
    { onlySubscribed: false },
  );

  const pinnedScreen = useMemo(
    () => screenTracks.find((tr) => hasActiveVideo(tr)),
    [screenTracks],
  );

  const tiles = useMemo(() => {
    const refs = cameraTracks.filter(
      (tr) =>
        tr.source === Track.Source.Camera &&
        (!pinnedScreen || tr.participant.identity !== pinnedScreen.participant.identity),
    );
    return refs;
  }, [cameraTracks, pinnedScreen]);

  const tileWidth = width >= 700 ? (width - 48) / 3 : (width - 40) / 2;
  const controlsBottom = Math.max(insets.bottom, 12) + 64;

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

  const handleSendChat = useCallback(() => {
    const text = chatDraft.trim();
    if (!text) return;
    sendChat(text);
    setChatDraft('');
    requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
  }, [chatDraft, sendChat]);

  const toggleMic = useCallback(async () => {
    await localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled);
  }, [localParticipant, isMicrophoneEnabled]);

  const toggleCam = useCallback(async () => {
    await localParticipant.setCameraEnabled(!isCameraEnabled);
  }, [localParticipant, isCameraEnabled]);

  const toggleScreen = useCallback(async () => {
    try {
      if (isScreenShareEnabled) {
        await localParticipant.setScreenShareEnabled(false);
      } else {
        await localParticipant.setScreenShareEnabled(true, { audio: false });
      }
    } catch (err) {
      console.error('[meeting] screen share failed', err);
    }
  }, [localParticipant, isScreenShareEnabled]);

  const connecting =
    connectionState === ConnectionState.Connecting ||
    connectionState === ConnectionState.Reconnecting;

  return (
    <View style={[styles.root, { backgroundColor: c.background }]}>
      <BlurTargetView ref={blurTargetRef} style={styles.fill} collapsable={false}>
        <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
          <Pressable
            style={[styles.backBtn, { backgroundColor: c.surfaceSecondary }]}
            onPress={onLeave}
            hitSlop={10}
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} size={18} color={c.foreground} strokeWidth={2} />
          </Pressable>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[styles.title, { color: c.foreground }]} numberOfLines={1}>
              {meetingTitle}
            </Text>
            <Text style={[styles.meta, { color: c.muted }]} numberOfLines={1}>
              {connecting
                ? m.reconnectingTitle ?? 'Connecting…'
                : `${participants.length} ${m.participants}`}
            </Text>
          </View>
        </View>

        {connecting ? (
          <View style={styles.center}>
            <ActivityIndicator color={c.accent} size="large" />
          </View>
        ) : (
          <ScrollView
            style={styles.stageScroll}
            contentContainerStyle={[
              styles.stageContent,
              { paddingBottom: controlsBottom + 16 },
            ]}
            showsVerticalScrollIndicator={false}
          >
            {pinnedScreen ? (
              <View style={[styles.screenTile, { borderColor: c.border }]}>
                <ParticipantTile
                  trackRef={pinnedScreen}
                  tone={c}
                  fallbackLabel={m.share}
                  large
                  isScreenShare
                />
              </View>
            ) : null}
            <View style={[styles.grid, pinnedScreen ? { marginTop: 10 } : null]}>
              {tiles.map((tr) => (
                <View
                  key={`${tr.participant.identity}-${tr.source}`}
                  style={[styles.tile, { width: tileWidth, borderColor: c.border }]}
                >
                  <ParticipantTile
                    trackRef={tr}
                    tone={c}
                    fallbackLabel={m.roomParticipant}
                    youLabel={m.roomYou}
                  />
                </View>
              ))}
            </View>
          </ScrollView>
        )}

        <View style={[styles.controls, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <ControlButton
            tone={c}
            active={isMicrophoneEnabled}
            onPress={() => void toggleMic()}
            iconOn={Mic01Icon}
            iconOff={MicOff01Icon}
            label={m.mute}
          />
          <ControlButton
            tone={c}
            active={isCameraEnabled}
            onPress={() => void toggleCam()}
            iconOn={VideoReplayIcon}
            iconOff={VideoReplayIcon}
            label={m.video}
          />
          {Platform.OS === 'android' ? (
            <ControlButton
              tone={c}
              active={isScreenShareEnabled}
              onPress={() => void toggleScreen()}
              iconOn={ComputerScreenShareIcon}
              iconOff={ComputerScreenShareIcon}
              label={m.share}
            />
          ) : null}
          <ControlButton
            tone={c}
            active={chatOpen}
            onPress={() => setChatOpen((v) => !v)}
            iconOn={BubbleChatIcon}
            iconOff={BubbleChatIcon}
            label={m.chat}
          />
          <Pressable
            style={[styles.leaveBtn, { backgroundColor: c.danger }]}
            onPress={onLeave}
            accessibilityLabel={m.leave}
          >
            <HugeiconsIcon icon={CallEnd02Icon} size={20} color="#fff" strokeWidth={2} />
          </Pressable>
        </View>
      </BlurTargetView>

      <BottomSheet isOpen={chatOpen} onOpenChange={setChatOpen}>
          <BottomSheet.Portal>
            <BottomSheet.Overlay />
            <AppBottomSheetContent
              snapPoints={[...CHAT_SHEET_SNAP_POINTS]}
              contentContainerClassName="p-0"
              keyboardBehavior="interactive"
              android_keyboardInputMode="adjustResize"
            >
              <View style={styles.chatSheetInner}>
                <View style={styles.chatSheetHeader}>
                  <Text style={[styles.chatSheetTitle, { color: c.foreground }]}>{m.chatTitle}</Text>
                  <Pressable
                    onPress={() => setChatOpen(false)}
                    style={[styles.chatCloseBtn, { backgroundColor: c.surfaceSecondary }]}
                    hitSlop={8}
                  >
                    <HugeiconsIcon icon={Cancel01Icon} size={16} color={c.foreground} strokeWidth={1.9} />
                  </Pressable>
                </View>
                <FlatList
                  ref={listRef}
                  data={chatRows}
                  keyExtractor={(item) => item.id}
                  style={styles.chatList}
                  contentContainerStyle={styles.chatListContent}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                  renderItem={({ item, index }) => {
                    const prev = index > 0 ? chatRows[index - 1] : null;
                    const showName = !prev || prev.fromId !== item.fromId;
                    return (
                      <MeetingChatBubble
                        row={item}
                        tone={c}
                        showName={showName}
                      />
                    );
                  }}
                  onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
                  ListEmptyComponent={
                    <Text style={[styles.chatEmpty, { color: c.muted }]}>{t.chats.noMessages}</Text>
                  }
                />
                <View style={[styles.chatComposer, { borderTopColor: c.border, backgroundColor: c.surface }]}>
                  <TextInput
                    value={chatDraft}
                    onChangeText={setChatDraft}
                    placeholder={m.chatPlaceholder}
                    placeholderTextColor={c.muted}
                    style={[
                      styles.chatInput,
                      {
                        color: c.foreground,
                        backgroundColor: c.surfaceSecondary,
                        borderColor: c.border,
                      },
                    ]}
                    multiline
                    maxLength={2000}
                    onSubmitEditing={() => handleSendChat()}
                  />
                  <Pressable
                    onPress={() => handleSendChat()}
                    disabled={!chatDraft.trim()}
                    style={[
                      styles.chatSendBtn,
                      {
                        backgroundColor: chatDraft.trim() ? c.accent : c.surfaceSecondary,
                      },
                    ]}
                    accessibilityLabel={t.chats.send}
                  >
                    <HugeiconsIcon
                      icon={SentIcon}
                      size={18}
                      color={chatDraft.trim() ? c.accentForeground : c.muted}
                      strokeWidth={2}
                    />
                  </Pressable>
                </View>
              </View>
            </AppBottomSheetContent>
          </BottomSheet.Portal>
        </BottomSheet>
    </View>
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

function ParticipantTile({
  trackRef,
  tone,
  fallbackLabel,
  youLabel,
  large,
  isScreenShare,
}: {
  trackRef: TrackReferenceOrPlaceholder;
  tone: SemanticTheme;
  fallbackLabel: string;
  youLabel?: string;
  large?: boolean;
  isScreenShare?: boolean;
}) {
  const { identity, name } = useParticipantInfo({ participant: trackRef.participant });
  const isSpeaking = useIsSpeaking(trackRef.participant);
  const micRef = useMemo<TrackReferenceOrPlaceholder>(
    () => ({
      participant: trackRef.participant,
      source: Track.Source.Microphone,
      publication: trackRef.participant.getTrackPublication(Track.Source.Microphone),
    }),
    [trackRef.participant],
  );
  const { isMuted: micMuted } = useTrackMutedIndicator(micRef);

  const displayName = participantDisplayName(name, identity, fallbackLabel);
  const initials = chatInitials(displayName);
  const avatarColor = chatColorFromId(identity);
  const showVideo = hasActiveVideo(trackRef);
  const height = large ? 220 : 148;
  const isLocal = trackRef.participant.isLocal;
  const label = isLocal && youLabel ? youLabel : displayName;

  return (
    <View
      style={[
        styles.tileOuter,
        {
          height,
          borderColor: isSpeaking ? '#34d399' : tone.border,
          shadowColor: isSpeaking ? '#10b981' : 'transparent',
        },
      ]}
    >
      {showVideo ? (
        <VideoTrack
          trackRef={trackRef}
          style={StyleSheet.absoluteFill}
          objectFit={isScreenShare ? 'contain' : 'cover'}
          mirror={isLocal && !isScreenShare}
          zOrder={isLocal ? 1 : 0}
        />
      ) : (
        <LinearGradient
          colors={[`${avatarColor}55`, '#0f172a']}
          style={StyleSheet.absoluteFill}
        >
          <View style={styles.avatarCenter}>
            <View
              style={[
                styles.avatarCircle,
                {
                  borderColor: isSpeaking ? '#34d399' : 'rgba(255,255,255,0.2)',
                  backgroundColor: avatarColor,
                },
              ]}
            >
              <Text style={styles.avatarInitials}>{initials}</Text>
            </View>
          </View>
        </LinearGradient>
      )}

      {showVideo && !isScreenShare ? (
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.75)']}
          style={styles.tileGradient}
          pointerEvents="none"
        />
      ) : null}

      <View style={styles.tileFooter}>
        <View style={[styles.tileFooterInner, { backgroundColor: 'rgba(15,23,42,0.72)' }]}>
          <View
            style={[
              styles.tileFooterAvatar,
              { backgroundColor: avatarColor, borderColor: isSpeaking ? '#34d399' : 'rgba(255,255,255,0.15)' },
            ]}
          >
            <Text style={styles.tileFooterInitials}>{initials}</Text>
          </View>
          <Text style={styles.tileFooterName} numberOfLines={1}>
            {label}
          </Text>
          <View
            style={[
              styles.micBadge,
              micMuted ? styles.micBadgeMuted : isSpeaking ? styles.micBadgeSpeaking : styles.micBadgeIdle,
            ]}
          >
            <HugeiconsIcon
              icon={micMuted ? MicOff01Icon : Mic01Icon}
              size={14}
              color={micMuted ? '#fca5a5' : isSpeaking ? '#6ee7b7' : 'rgba(255,255,255,0.75)'}
              strokeWidth={2}
            />
          </View>
        </View>
      </View>
    </View>
  );
}

function ControlButton({
  tone,
  active,
  onPress,
  iconOn,
  iconOff,
  label,
}: {
  tone: SemanticTheme;
  active: boolean;
  onPress: () => void;
  iconOn: typeof Mic01Icon;
  iconOff: typeof MicOff01Icon;
  label: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.ctrlBtn,
        { backgroundColor: active ? tone.accent + '22' : tone.surfaceSecondary, borderColor: tone.border },
      ]}
      accessibilityLabel={label}
    >
      <HugeiconsIcon icon={active ? iconOn : iconOff} size={20} color={active ? tone.accent : tone.muted} strokeWidth={2} />
    </Pressable>
  );
}

export const MEETING_ROOM_OPTIONS = {
  adaptiveStream: true,
  dynacast: true,
  disconnectOnPageLeave: false,
  audioCaptureDefaults: {
    autoGainControl: true,
    echoCancellation: true,
    noiseSuppression: true,
  },
  publishDefaults: {
    videoEncoding: VideoPresets.h540.encoding,
    videoSimulcastLayers: [VideoPresets.h216],
    simulcast: true,
    degradationPreference: 'balanced' as const,
  },
  videoCaptureDefaults: {
    resolution: VideoPresets.h540.resolution,
  },
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  fill: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: PAGE_GUTTER,
    paddingBottom: 10,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: SigmaTypo.body, fontWeight: '700' },
  meta: { fontSize: SigmaTypo.captionSmall, marginTop: 2 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  stageScroll: { flex: 1 },
  stageContent: { paddingHorizontal: PAGE_GUTTER, paddingTop: 4 },
  screenTile: {
    borderRadius: SigmaRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  tile: {
    borderRadius: SigmaRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  tileOuter: {
    borderRadius: SigmaRadius.lg,
    borderWidth: 2,
    overflow: 'hidden',
    backgroundColor: '#0f172a',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 4,
  },
  avatarCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    color: '#fff',
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: 1,
  },
  tileGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 72,
  },
  tileFooter: {
    position: 'absolute',
    left: 8,
    right: 8,
    bottom: 8,
  },
  tileFooterInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  tileFooterAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileFooterInitials: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  tileFooterName: {
    flex: 1,
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  micBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  micBadgeMuted: { backgroundColor: 'rgba(239,68,68,0.2)' },
  micBadgeSpeaking: { backgroundColor: 'rgba(16,185,129,0.2)' },
  micBadgeIdle: { backgroundColor: 'rgba(255,255,255,0.1)' },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: PAGE_GUTTER,
    paddingTop: 8,
  },
  ctrlBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  leaveBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  chatSheetInner: {
    flex: 1,
    minHeight: 200,
    paddingHorizontal: 4,
    paddingBottom: 8,
  },
  chatSheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingBottom: 10,
  },
  chatSheetTitle: {
    fontSize: SigmaTypo.headline,
    fontWeight: '700',
  },
  chatCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatList: { flex: 1 },
  chatListContent: {
    gap: 8,
    paddingHorizontal: 12,
    paddingBottom: 12,
    flexGrow: 1,
  },
  chatEmpty: {
    textAlign: 'center',
    fontSize: SigmaTypo.bodySmall,
    paddingVertical: 24,
  },
  chatComposer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  chatInput: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: SigmaTypo.bodySmall,
  },
  chatSendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
