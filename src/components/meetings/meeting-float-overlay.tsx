import { useLiveMeeting } from '@/contexts/live-meeting-context';
import { useMeetingNoiseSuppressionApplier } from '@/hooks/use-meeting-noise-suppression';
import { useMeetingParticipantDisplayName } from '@/hooks/use-meeting-participant-profile';
import { useSemanticTheme } from '@/hooks/use-semantic-theme';
import { useI18n } from '@/i18n/context';
import {
  buildMeetingAudioCaptureOptions,
  modeFromToggleEnabled,
} from '@/lib/meeting-audio';
import {
  AudioWave01Icon,
  Call02Icon,
  CallEnd02Icon,
  ComputerScreenShareIcon,
  FilterHorizontalIcon,
  Maximize01Icon,
  Mic01Icon,
  MicOff01Icon,
  VideoReplayIcon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import {
  useConnectionState,
  useIsSpeaking,
  useLocalParticipant,
  useParticipants,
} from '@livekit/react-native';
import { ConnectionState } from 'livekit-client';
import { BlurView } from 'expo-blur';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  InteractionManager,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const BUBBLE_SIZE = 56;
const PANEL_HEIGHT = 52;
const EDGE = 12;
const EXPAND_TIMING = { duration: 240, easing: Easing.out(Easing.cubic) };
const DRAG_SPRING = { damping: 28, stiffness: 320, overshootClamping: true };
const PIP_SHOW_DELAY_MS = 150;

function clamp(n: number, min: number, max: number) {
  'worklet';
  return Math.min(max, Math.max(min, n));
}

function clampWorklet(
  x: number,
  y: number,
  width: number,
  height: number,
  minX: number,
  maxX: number,
  minY: number,
  maxY: number,
) {
  'worklet';
  return {
    x: clamp(x, minX, maxX),
    y: clamp(y, minY, maxY),
  };
}
/** Лёгкая оболочка: без LiveKit-хуков, пока PiP не нужен. */
export function MeetingFloatOverlay() {
  const { isFloatVisible, meetingId } = useLiveMeeting();
  if (!isFloatVisible || !meetingId) return null;
  return <MeetingFloatOverlayActive meetingId={meetingId} />;
}

function MeetingFloatOverlayActive({ meetingId }: { meetingId: string }) {
  const c = useSemanticTheme();
  const { t } = useI18n();
  const m = t.meetings;
  const insets = useSafeAreaInsets();
  const { width: screenW, height: screenH } = useWindowDimensions();
  const { leave, meetingTitle } = useLiveMeeting();
  const connectionState = useConnectionState();
  const [expanded, setExpanded] = useState(false);
  const [pipReady, setPipReady] = useState(false);

  const isConnected = connectionState === ConnectionState.Connected;

  useEffect(() => {
    if (!isConnected) {
      setPipReady(false);
      return;
    }
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    const interaction = InteractionManager.runAfterInteractions(() => {
      timeoutId = setTimeout(() => {
        if (!cancelled) setPipReady(true);
      }, PIP_SHOW_DELAY_MS);
    });
    return () => {
      cancelled = true;
      interaction.cancel();
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [isConnected]);

  useEffect(() => {
    if (!pipReady) setExpanded(false);
  }, [pipReady]);

  const panelWidth = Math.min(screenW - EDGE * 2 - insets.left - insets.right, 360);

  const baseX = useSharedValue(screenW - BUBBLE_SIZE - EDGE - insets.right);
  const baseY = useSharedValue(screenH - BUBBLE_SIZE - EDGE - insets.bottom - 72);
  const dragX = useSharedValue(0);
  const dragY = useSharedValue(0);
  const shellWSv = useSharedValue(BUBBLE_SIZE);
  const shellHSv = useSharedValue(BUBBLE_SIZE);
  const borderRadiusSv = useSharedValue(BUBBLE_SIZE / 2);
  const minXSv = useSharedValue(EDGE + insets.left);
  const maxXSv = useSharedValue(screenW - BUBBLE_SIZE - EDGE - insets.right);
  const minYSv = useSharedValue(EDGE + insets.top);
  const maxYSv = useSharedValue(screenH - BUBBLE_SIZE - EDGE - insets.bottom - 56);

  const updateBounds = useCallback(
    (width: number, height: number) => {
      minXSv.value = EDGE + insets.left;
      maxXSv.value = screenW - width - EDGE - insets.right;
      minYSv.value = EDGE + insets.top;
      maxYSv.value = screenH - height - EDGE - insets.bottom - 56;
    },
    [insets.bottom, insets.left, insets.right, insets.top, maxXSv, maxYSv, minXSv, minYSv, screenH, screenW],
  );

  const anchorExpandLeft = useCallback(
    (nextWidth: number, nextHeight: number, nextRadius: number, animate = true) => {
      updateBounds(nextWidth, nextHeight);
      const rightEdge = baseX.value + shellWSv.value;
      const nextX = clamp(rightEdge - nextWidth, minXSv.value, maxXSv.value);
      if (animate) {
        baseX.value = withTiming(nextX, EXPAND_TIMING);
        shellWSv.value = withTiming(nextWidth, EXPAND_TIMING);
        shellHSv.value = withTiming(nextHeight, EXPAND_TIMING);
        borderRadiusSv.value = withTiming(nextRadius, EXPAND_TIMING);
      } else {
        baseX.value = nextX;
        shellWSv.value = nextWidth;
        shellHSv.value = nextHeight;
        borderRadiusSv.value = nextRadius;
      }
    },
    [baseX, borderRadiusSv, maxXSv, minXSv, shellHSv, shellWSv, updateBounds],
  );

  useEffect(() => {
    if (expanded) {
      anchorExpandLeft(panelWidth, PANEL_HEIGHT, 26, true);
    } else {
      anchorExpandLeft(BUBBLE_SIZE, BUBBLE_SIZE, BUBBLE_SIZE / 2, true);
    }
  }, [anchorExpandLeft, expanded, panelWidth]);

  const handleToggleExpanded = useCallback((nextExpanded: boolean) => {
    setExpanded(nextExpanded);
  }, []);

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-14, 14])
        .activeOffsetY([-14, 14])
        .onUpdate((e) => {
          'worklet';
          dragX.value = e.translationX;
          dragY.value = e.translationY;
        })
        .onEnd(() => {
          'worklet';
          const clamped = clampWorklet(
            baseX.value + dragX.value,
            baseY.value + dragY.value,
            shellWSv.value,
            shellHSv.value,
            minXSv.value,
            maxXSv.value,
            minYSv.value,
            maxYSv.value,
          );
          baseX.value = withSpring(clamped.x, DRAG_SPRING);
          baseY.value = withSpring(clamped.y, DRAG_SPRING);
          dragX.value = withSpring(0, DRAG_SPRING);
          dragY.value = withSpring(0, DRAG_SPRING);
        }),
    [baseX, baseY, dragX, dragY, maxXSv, maxYSv, minXSv, minYSv, shellHSv, shellWSv],
  );

  const collapseDoubleTap = useMemo(
    () =>
      Gesture.Tap()
        .numberOfTaps(2)
        .maxDelay(320)
        .onEnd(() => {
          'worklet';
          runOnJS(handleToggleExpanded)(false);
        }),
    [handleToggleExpanded],
  );

  const shellGesture = useMemo(
    () => (expanded ? Gesture.Simultaneous(pan, collapseDoubleTap) : pan),
    [collapseDoubleTap, expanded, pan],
  );

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: baseX.value + dragX.value },
      { translateY: baseY.value + dragY.value },
    ],
    width: shellWSv.value,
    height: shellHSv.value,
    borderRadius: borderRadiusSv.value,
  }));

  const handleLeaveRequest = useCallback(() => {
    Alert.alert(m.leave, m.leaveConfirmDesc, [
      { text: m.leaveCancel, style: 'cancel' },
      {
        text: m.leave,
        style: 'destructive',
        onPress: () => {
          leave();
          if (router.canGoBack()) router.back();
          else router.replace('/meetings');
        },
      },
    ]);
  }, [leave, m.leave, m.leaveConfirmDesc, m.leaveCancel]);

  const bubbleColors = useMemo(
    () =>
      c.scheme === 'dark'
        ? {
            backgroundColor: 'rgba(10,10,12,0.97)',
            borderColor: 'rgba(63,63,70,0.85)',
            icon: 'rgba(250,250,250,0.92)',
          }
        : {
            backgroundColor: 'rgba(107,114,128,0.94)',
            borderColor: 'rgba(75,85,99,0.55)',
            icon: 'rgba(255,255,255,0.95)',
          },
    [c.scheme],
  );

  if (!pipReady) return null;

  return (
    <View style={styles.overlay} pointerEvents="box-none">
      <GestureDetector gesture={shellGesture}>
        <Animated.View
          style={[
            styles.shell,
            animatedStyle,
            {
              borderColor: bubbleColors.borderColor,
            },
          ]}
        >
          {expanded ? (
            Platform.OS === 'ios' ? (
              <BlurView intensity={48} tint={c.scheme === 'dark' ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
            ) : (
              <View
                style={[
                  StyleSheet.absoluteFill,
                  { backgroundColor: bubbleColors.backgroundColor },
                ]}
              />
            )
          ) : (
            <View
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: bubbleColors.backgroundColor },
              ]}
            />
          )}
          <View style={styles.shellContent} pointerEvents="box-none">
            {expanded && meetingTitle ? (
              <Text
                style={[
                  styles.titleChip,
                  { color: c.scheme === 'dark' ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.7)' },
                ]}
                numberOfLines={1}
              >
                {meetingTitle}
              </Text>
            ) : null}
            {expanded ? (
              <PipExpandedToolbar
                meetingId={meetingId}
                onLeaveRequest={handleLeaveRequest}
                scheme={c.scheme}
                collapseGesture={collapseDoubleTap}
              />
            ) : (
              <Pressable
                onPress={() => handleToggleExpanded(true)}
                style={styles.bubbleInner}
                accessibilityLabel={m.pipReturn}
              >
                <HugeiconsIcon icon={Call02Icon} size={24} color={bubbleColors.icon} strokeWidth={2} />
              </Pressable>
            )}
          </View>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

function PipExpandedToolbar({
  meetingId,
  onLeaveRequest,
  scheme,
  collapseGesture,
}: {
  meetingId: string;
  onLeaveRequest: () => void;
  scheme: 'light' | 'dark';
  collapseGesture: ReturnType<typeof Gesture.Tap>;
}) {
  const c = useSemanticTheme();
  const { t } = useI18n();
  const m = t.meetings;
  const participants = useParticipants();
  const { localParticipant, isMicrophoneEnabled, isCameraEnabled, isScreenShareEnabled } =
    useLocalParticipant();
  const localSpeaking = useIsSpeaking(localParticipant);

  const activeSpeaker = useMemo(() => {
    for (const p of participants) {
      if (p.identity !== localParticipant.identity && p.isSpeaking) return p;
    }
    return localSpeaking ? localParticipant : participants.find((p) => p.isSpeaking) ?? null;
  }, [participants, localParticipant, localSpeaking]);

  const isSpeaking = Boolean(activeSpeaker);
  const speakerIsLocal = activeSpeaker?.identity === localParticipant.identity;
  const { displayName: resolvedSpeakerName } = useMeetingParticipantDisplayName(
    activeSpeaker?.identity,
    activeSpeaker?.name,
    speakerIsLocal,
    m.roomParticipant,
  );
  const speakerName = speakerIsLocal ? m.roomYou : resolvedSpeakerName;
  const pCount = participants.length;

  const {
    noiseSuppressionMode,
    noiseSuppressionEnabled,
    setNoiseSuppressionMode,
    setNoiseSuppressionEnabled,
  } = useLiveMeeting();
  const applyNoiseSuppression = useMeetingNoiseSuppressionApplier(
    localParticipant,
    isMicrophoneEnabled,
  );

  const toggleMic = useCallback(async () => {
    const next = !isMicrophoneEnabled;
    await localParticipant.setMicrophoneEnabled(
      next,
      buildMeetingAudioCaptureOptions(noiseSuppressionMode),
    );
  }, [localParticipant, isMicrophoneEnabled, noiseSuppressionMode]);

  const toggleCam = useCallback(async () => {
    await localParticipant.setCameraEnabled(!isCameraEnabled);
  }, [localParticipant, isCameraEnabled]);

  const toggleNoise = useCallback(() => {
    const nextMode = modeFromToggleEnabled(!noiseSuppressionEnabled, 'mobile');
    setNoiseSuppressionMode(nextMode);
    setNoiseSuppressionEnabled(nextMode !== 'off');
    void applyNoiseSuppression(nextMode);
  }, [
    applyNoiseSuppression,
    noiseSuppressionEnabled,
    setNoiseSuppressionEnabled,
    setNoiseSuppressionMode,
  ]);

  const toggleScreen = useCallback(async () => {
    try {
      if (isScreenShareEnabled) {
        await localParticipant.setScreenShareEnabled(false);
      } else {
        await localParticipant.setScreenShareEnabled(true, { audio: false });
      }
    } catch (err) {
      console.error('[meeting-pip] screen share failed', err);
    }
  }, [localParticipant, isScreenShareEnabled]);

  const handleExpand = useCallback(() => {
    router.push(`/meetings/${meetingId}/room`);
  }, [meetingId]);

  const labelColor = scheme === 'dark' ? 'rgba(255,255,255,0.82)' : 'rgba(255,255,255,0.9)';

  return (
    <View style={styles.toolbar}>
      <View style={styles.statusTapArea}>
        <View
          style={[
            styles.speakingDot,
            isSpeaking ? styles.speakingDotActive : styles.speakingDotIdle,
          ]}
        />
        <Text style={[styles.statusText, { color: labelColor }]} numberOfLines={1}>
          {isSpeaking ? `${speakerName} · ${m.pipSpeaking}` : `${pCount} ${m.pipInCall}`}
        </Text>
      </View>
      <View style={styles.divider} />
      <PipIconButton
        active={isMicrophoneEnabled}
        danger={!isMicrophoneEnabled}
        onPress={() => void toggleMic()}
        iconOn={Mic01Icon}
        iconOff={MicOff01Icon}
        label={m.mute}
        collapseGesture={collapseGesture}
      />
      <PipIconButton
        active={noiseSuppressionEnabled}
        onPress={toggleNoise}
        iconOn={AudioWave01Icon}
        iconOff={FilterHorizontalIcon}
        label={m.noiseSuppressionOn}
        collapseGesture={collapseGesture}
      />
      <PipIconButton
        active={isCameraEnabled}
        danger={!isCameraEnabled}
        onPress={() => void toggleCam()}
        iconOn={VideoReplayIcon}
        iconOff={VideoReplayIcon}
        label={m.video}
        collapseGesture={collapseGesture}
      />
      {Platform.OS === 'android' ? (
        <PipIconButton
          active={isScreenShareEnabled}
          onPress={() => void toggleScreen()}
          iconOn={ComputerScreenShareIcon}
          iconOff={ComputerScreenShareIcon}
          label={m.share}
          collapseGesture={collapseGesture}
        />
      ) : null}
      <View style={styles.divider} />
      <PipIconButton
        active
        onPress={handleExpand}
        iconOn={Maximize01Icon}
        iconOff={Maximize01Icon}
        label={m.pipReturn}
        accent={c.accent}
        collapseGesture={collapseGesture}
      />
      <PipIconButton
        active={false}
        danger
        onPress={onLeaveRequest}
        iconOn={CallEnd02Icon}
        iconOff={CallEnd02Icon}
        label={m.leave}
        collapseGesture={collapseGesture}
      />
    </View>
  );
}

function PipIconButton({
  active,
  danger,
  onPress,
  iconOn,
  iconOff,
  label,
  accent,
  collapseGesture,
}: {
  active: boolean;
  danger?: boolean;
  onPress: () => void;
  iconOn: typeof Mic01Icon;
  iconOff: typeof MicOff01Icon;
  label: string;
  accent?: string;
  collapseGesture: ReturnType<typeof Gesture.Tap>;
}) {
  const singleTap = useMemo(
    () =>
      Gesture.Tap()
        .numberOfTaps(1)
        .requireFailureOf(collapseGesture)
        .onEnd(() => {
          runOnJS(onPress)();
        }),
    [collapseGesture, onPress],
  );

  return (
    <GestureDetector gesture={singleTap}>
      <View
        style={[
          styles.iconBtn,
          danger && !active ? styles.iconBtnDanger : active ? styles.iconBtnActive : null,
        ]}
        accessibilityLabel={label}
        accessible
        accessibilityRole="button"
      >
        <HugeiconsIcon
          icon={active ? iconOn : iconOff}
          size={16}
          color={danger && !active ? '#f87171' : (accent ?? 'rgba(255,255,255,0.85)')}
          strokeWidth={2}
        />
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 9999,
    elevation: 9999,
  },
  shell: {
    position: 'absolute',
    left: 0,
    top: 0,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
  },
  shellContent: {
    flex: 1,
    justifyContent: 'center',
  },
  titleChip: {
    position: 'absolute',
    top: -18,
    left: 8,
    right: 8,
    fontSize: 10,
    fontWeight: '600',
  },
  bubbleInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolbar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    zIndex: 1,
  },
  statusTapArea: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
    minWidth: 0,
  },
  speakingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  speakingDotActive: {
    backgroundColor: '#34d399',
    boxShadow: '0 0 6px rgba(52,211,153,0.7)',
  },
  speakingDotIdle: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  statusText: {
    flexShrink: 1,
    maxWidth: 120,
    fontSize: 11,
    fontWeight: '600',
  },
  divider: {
    width: StyleSheet.hairlineWidth,
    height: 20,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnActive: {
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  iconBtnDanger: {
    backgroundColor: 'rgba(239,68,68,0.18)',
  },
});
