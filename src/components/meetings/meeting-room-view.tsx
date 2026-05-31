import { chatColorFromId } from '@/components/chats/chat-avatar';
import { SigmaRadius, SigmaTypo } from '@/constants/sigma';
import { useLiveMeeting } from '@/contexts/live-meeting-context';
import { useSemanticTheme, type SemanticTheme } from '@/hooks/use-semantic-theme';
import { useI18n } from '@/i18n/context';
import {
  ArrowLeft01Icon,
  AudioWave01Icon,
  BubbleChatIcon,
  CallEnd02Icon,
  ComputerScreenShareIcon,
  FilterHorizontalIcon,
  Mic01Icon,
  MicOff01Icon,
  VideoReplayIcon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import {
  VideoTrack,
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
import { router } from 'expo-router';
import { useMeetingNoiseSuppressionApplier } from '@/hooks/use-meeting-noise-suppression';
import { useMeetingParticipantDisplayName } from '@/hooks/use-meeting-participant-profile';
import {
  buildMeetingAudioCaptureOptions,
  buildMeetingRoomOptions,
  isNoiseSuppressionEnabled,
  modeFromToggleEnabled,
  type NoiseSuppressionMode,
} from '@/lib/meeting-audio';
import { ConnectionState, Track } from 'livekit-client';
import { useCallback, useMemo, useRef } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Props = {
  meetingTitle: string;
  onMinimize: () => void;
  onLeave: () => void;
  noiseSuppressionMode: NoiseSuppressionMode;
  onNoiseSuppressionModeChange: (mode: NoiseSuppressionMode) => void;
  /** @deprecated Prefer noiseSuppressionMode. */
  noiseSuppressionEnabled?: boolean;
  /** @deprecated Prefer onNoiseSuppressionModeChange. */
  onNoiseSuppressionChange?: (enabled: boolean) => void;
};

const PAGE_GUTTER = 10;

function hasActiveVideo(trackRef: TrackReferenceOrPlaceholder): boolean {
  if (!isTrackReference(trackRef)) return false;
  const pub = trackRef.publication;
  const track = pub?.track;
  if (!pub || !track || pub.isMuted || track.isMuted) return false;
  const dims = track.dimensions;
  if (dims && dims.width > 0 && dims.height > 0) return true;
  return track.mediaStream != null;
}

export function MeetingRoomView({
  meetingTitle,
  onMinimize,
  onLeave,
  noiseSuppressionMode,
  onNoiseSuppressionModeChange,
  noiseSuppressionEnabled: noiseSuppressionEnabledProp,
  onNoiseSuppressionChange,
}: Props) {
  const noiseSuppressionEnabled =
    noiseSuppressionEnabledProp ?? isNoiseSuppressionEnabled(noiseSuppressionMode);
  const c = useSemanticTheme();
  const { t } = useI18n();
  const m = t.meetings;
  const { meetingId } = useLiveMeeting();
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
  const applyNoiseSuppression = useMeetingNoiseSuppressionApplier(
    localParticipant,
    isMicrophoneEnabled,
  );

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

  const openChat = useCallback(() => {
    if (!meetingId) return;
    router.push({
      pathname: '/meetings/[id]/chat',
      params: { id: meetingId },
    });
  }, [meetingId]);

  const toggleMic = useCallback(async () => {
    const next = !isMicrophoneEnabled;
    await localParticipant.setMicrophoneEnabled(
      next,
      buildMeetingAudioCaptureOptions(noiseSuppressionMode),
    );
  }, [localParticipant, isMicrophoneEnabled, noiseSuppressionMode]);

  const toggleNoiseSuppression = useCallback(() => {
    const nextMode = modeFromToggleEnabled(!noiseSuppressionEnabled, 'mobile');
    onNoiseSuppressionModeChange(nextMode);
    if (onNoiseSuppressionChange) {
      onNoiseSuppressionChange(nextMode !== 'off');
    }
    void applyNoiseSuppression(nextMode);
  }, [
    applyNoiseSuppression,
    noiseSuppressionEnabled,
    onNoiseSuppressionChange,
    onNoiseSuppressionModeChange,
  ]);

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
            onPress={onMinimize}
            hitSlop={10}
            accessibilityLabel={m.collapseRoom}
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
            active={noiseSuppressionEnabled}
            onPress={() => toggleNoiseSuppression()}
            iconOn={AudioWave01Icon}
            iconOff={FilterHorizontalIcon}
            label={
              noiseSuppressionEnabled ? m.noiseSuppressionOn : m.noiseSuppressionOff
            }
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
            active={false}
            onPress={openChat}
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
    </View>
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

  const { displayName, initials } = useMeetingParticipantDisplayName(
    identity,
    name,
    trackRef.participant.isLocal,
    fallbackLabel,
  );
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

/** @deprecated Use buildMeetingRoomOptions from @/lib/meeting-audio */
export const MEETING_ROOM_OPTIONS = buildMeetingRoomOptions('webrtc');

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
});
