import { MeetingCallAudioSession } from '@/components/meetings/meeting-call-audio-session';
import { MeetingFloatOverlay } from '@/components/meetings/meeting-float-overlay';
import { useLiveMeeting } from '@/contexts/live-meeting-context';
import { useMeetingAppBackground } from '@/hooks/use-meeting-app-background';
import { ensureLiveKitGlobals } from '@/lib/livekit-setup';
import { buildMeetingAudioCaptureOptions, buildMeetingRoomOptions } from '@/lib/meeting-audio';
import {
  LiveKitRoom,
  useConnectionState,
  useLocalParticipant,
} from '@livekit/react-native';
import { ConnectionState } from 'livekit-client';
import { useEffect, useRef, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

type Props = {
  children: ReactNode;
  onDisconnected: () => void;
};

/** Applies pre-join mic/cam prefs only after the LiveKit engine is connected. */
function MeetingPreJoinMediaSync() {
  const { micEnabled, camEnabled, noiseSuppressionMode } = useLiveMeeting();
  const connectionState = useConnectionState();
  const { localParticipant } = useLocalParticipant();
  const prefsAppliedRef = useRef(false);

  useEffect(() => {
    if (connectionState !== ConnectionState.Connected) {
      prefsAppliedRef.current = false;
      return;
    }
    if (prefsAppliedRef.current) return;
    prefsAppliedRef.current = true;

    void (async () => {
      try {
        await localParticipant.setMicrophoneEnabled(
          micEnabled,
          micEnabled ? buildMeetingAudioCaptureOptions(noiseSuppressionMode) : undefined,
        );
        await localParticipant.setCameraEnabled(camEnabled);
      } catch (err) {
        console.error('[live-meeting] apply pre-join media failed', err);
      }
    })();
  }, [camEnabled, connectionState, localParticipant, micEnabled, noiseSuppressionMode]);

  return null;
}

export function LiveMeetingSession({ children, onDisconnected }: Props) {
  const {
    meetingId,
    token,
    serverUrl,
    enteredCall,
    isFloatVisible,
    noiseSuppressionMode,
    iceServers,
  } = useLiveMeeting();

  const sessionActive = Boolean(meetingId && token);
  const connected = Boolean(sessionActive && enteredCall);

  useMeetingAppBackground();

  useEffect(() => {
    if (sessionActive) ensureLiveKitGlobals();
  }, [sessionActive]);

  if (!sessionActive) {
    return <>{children}</>;
  }

  return (
    <LiveKitRoom
      serverUrl={serverUrl}
      token={token!}
      connect={connected}
      audio={false}
      video={false}
      options={buildMeetingRoomOptions(noiseSuppressionMode, iceServers)}
      onDisconnected={onDisconnected}
    >
      {connected ? <MeetingCallAudioSession /> : null}
      {connected ? <MeetingPreJoinMediaSync /> : null}
      <View style={styles.host} pointerEvents="box-none">
        {children}
      </View>
      {isFloatVisible ? <MeetingFloatOverlay /> : null}
    </LiveKitRoom>
  );
}

const styles = StyleSheet.create({
  host: { flex: 1 },
});
