import { MeetingPreJoinView } from '@/components/meetings/meeting-prejoin-view';
import { MeetingRoomView } from '@/components/meetings/meeting-room-view';
import { useLiveMeeting } from '@/contexts/live-meeting-context';
import { useSemanticTheme } from '@/hooks/use-semantic-theme';
import { useI18n } from '@/i18n/context';
import { api } from '@/lib/api';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StatusBar, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function MeetingRoomScreen() {
  const c = useSemanticTheme();
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  const m = t.meetings;
  const params = useLocalSearchParams<{ id: string }>();
  const meetingId = Array.isArray(params.id) ? params.id[0] : params.id;

  const {
    meetingId: activeMeetingId,
    token,
    enteredCall,
    meetingTitle,
    micEnabled,
    camEnabled,
    noiseSuppressionMode,
    noiseSuppressionEnabled,
    join,
    leave,
    enterCall,
    setMeetingTitle,
    setMicEnabled,
    setCamEnabled,
    setNoiseSuppressionMode,
    setNoiseSuppressionEnabled,
  } = useLiveMeeting();

  const joinRef = useRef(join);
  const leaveRef = useRef(leave);
  joinRef.current = join;
  leaveRef.current = leave;

  const [preparing, setPreparing] = useState(true);
  const [failed, setFailed] = useState(false);
  const joinAttemptRef = useRef<string | null>(null);

  useEffect(() => {
    if (!meetingId) return;

    if (activeMeetingId && activeMeetingId !== meetingId) {
      leaveRef.current();
    }
  }, [meetingId, activeMeetingId]);

  useEffect(() => {
    if (!meetingId) return;

    if (activeMeetingId === meetingId && token) {
      setPreparing(false);
      setFailed(false);
      void api.getMeeting(meetingId).then((meeting) => {
        if (meeting?.title) setMeetingTitle(meeting.title);
      });
      return;
    }

    if (joinAttemptRef.current === meetingId) return;
    joinAttemptRef.current = meetingId;

    let cancelled = false;
    void (async () => {
      setPreparing(true);
      setFailed(false);
      try {
        const [meeting, ok] = await Promise.all([
          api.getMeeting(meetingId).catch(() => null),
          joinRef.current(meetingId),
        ]);
        if (cancelled) return;
        if (meeting?.title) setMeetingTitle(meeting.title);
        setFailed(!ok);
      } catch {
        if (!cancelled) setFailed(true);
      } finally {
        if (!cancelled) setPreparing(false);
      }
    })();

    return () => {
      cancelled = true;
      if (joinAttemptRef.current === meetingId) {
        joinAttemptRef.current = null;
      }
    };
  }, [meetingId, activeMeetingId, token, setMeetingTitle]);

  const handleLeave = useCallback(() => {
    leave();
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/meetings');
    }
  }, [leave]);

  const handleMinimize = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/meetings');
    }
  }, []);

  const handlePreJoinCancel = useCallback(() => {
    leave();
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/meetings');
    }
  }, [leave]);

  const handleJoinCall = useCallback(() => {
    enterCall();
  }, [enterCall]);

  const handleNoiseSuppressionModeChange = useCallback(
    (mode: import('@/lib/meeting-audio').NoiseSuppressionMode) => {
      setNoiseSuppressionMode(mode);
    },
    [setNoiseSuppressionMode],
  );

  if (!meetingId) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <Text style={{ color: c.muted }}>Meeting not found</Text>
      </View>
    );
  }

  if (preparing || !token) {
    return (
      <View style={[styles.center, { backgroundColor: c.background, paddingTop: insets.top }]}>
        <StatusBar barStyle={c.scheme === 'dark' ? 'light-content' : 'dark-content'} />
        <ActivityIndicator color={c.accent} size="large" />
        <Text style={[styles.hint, { color: c.muted }]}>{m.preparingTitle}</Text>
      </View>
    );
  }

  if (failed) {
    return (
      <View style={[styles.center, { backgroundColor: c.background, paddingTop: insets.top }]}>
        <Text style={[styles.hint, { color: c.foreground }]}>{m.joinFailed}</Text>
        <Text style={[styles.link, { color: c.accent }]} onPress={handlePreJoinCancel}>
          {t.common.back}
        </Text>
      </View>
    );
  }

  if (!enteredCall) {
    return (
      <>
        <StatusBar barStyle={c.scheme === 'dark' ? 'light-content' : 'dark-content'} />
        <MeetingPreJoinView
          meetingTitle={meetingTitle || m.stageLabel}
          micEnabled={micEnabled}
          camEnabled={camEnabled}
          noiseSuppressionEnabled={noiseSuppressionEnabled}
          onMicChange={setMicEnabled}
          onCamChange={setCamEnabled}
          onNoiseSuppressionChange={setNoiseSuppressionEnabled}
          onJoin={handleJoinCall}
          onCancel={handlePreJoinCancel}
        />
      </>
    );
  }

  return (
    <View style={[styles.fill, { backgroundColor: c.background }]}>
      <StatusBar barStyle={c.scheme === 'dark' ? 'light-content' : 'dark-content'} />
      <MeetingRoomView
        meetingTitle={meetingTitle || m.stageLabel}
        onMinimize={handleMinimize}
        onLeave={handleLeave}
        noiseSuppressionMode={noiseSuppressionMode}
        onNoiseSuppressionModeChange={handleNoiseSuppressionModeChange}
        noiseSuppressionEnabled={noiseSuppressionEnabled}
        onNoiseSuppressionChange={setNoiseSuppressionEnabled}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  hint: { fontSize: 15, fontWeight: '500', marginTop: 12 },
  link: { fontSize: 15, fontWeight: '700', marginTop: 8 },
});
