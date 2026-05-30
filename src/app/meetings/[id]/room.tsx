import { MeetingRoomView, MEETING_ROOM_OPTIONS } from '@/components/meetings/meeting-room-view';
import { useLiveMeeting } from '@/contexts/live-meeting-context';
import { ensureLiveKitGlobals } from '@/lib/livekit-setup';
import { useSemanticTheme } from '@/hooks/use-semantic-theme';
import { useI18n } from '@/i18n/context';
import { api } from '@/lib/api';
import { LiveKitRoom } from '@livekit/react-native';
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

  const { token, serverUrl, join, leave } = useLiveMeeting();
  const joinRef = useRef(join);
  const leaveRef = useRef(leave);
  joinRef.current = join;
  leaveRef.current = leave;

  const [title, setTitle] = useState('');
  const [joining, setJoining] = useState(true);
  const [failed, setFailed] = useState(false);

  const joinAttemptRef = useRef<string | null>(null);

  useEffect(() => {
    if (token) ensureLiveKitGlobals();
  }, [token]);

  useEffect(() => {
    if (!meetingId) return;
    if (joinAttemptRef.current === meetingId) return;
    joinAttemptRef.current = meetingId;

    let cancelled = false;
    void (async () => {
      setJoining(true);
      setFailed(false);
      try {
        const [meeting, ok] = await Promise.all([
          api.getMeeting(meetingId).catch(() => null),
          joinRef.current(meetingId),
        ]);
        if (cancelled) return;
        if (meeting?.title) setTitle(meeting.title);
        setFailed(!ok);
      } catch {
        if (!cancelled) setFailed(true);
      } finally {
        if (!cancelled) setJoining(false);
      }
    })();

    return () => {
      cancelled = true;
      if (joinAttemptRef.current === meetingId) {
        joinAttemptRef.current = null;
      }
      leaveRef.current();
    };
  }, [meetingId]);

  const handleLeave = useCallback(() => {
    leave();
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/meetings');
    }
  }, [leave]);

  if (!meetingId) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <Text style={{ color: c.muted }}>Meeting not found</Text>
      </View>
    );
  }

  if (joining || !token) {
    return (
      <View style={[styles.center, { backgroundColor: c.background, paddingTop: insets.top }]}>
        <StatusBar barStyle={c.scheme === 'dark' ? 'light-content' : 'dark-content'} />
        <ActivityIndicator color={c.accent} size="large" />
        <Text style={[styles.hint, { color: c.muted }]}>{m.joiningTitle}</Text>
      </View>
    );
  }

  if (failed) {
    return (
      <View style={[styles.center, { backgroundColor: c.background, paddingTop: insets.top }]}>
        <Text style={[styles.hint, { color: c.foreground }]}>{m.joinFailed}</Text>
        <Text style={[styles.link, { color: c.accent }]} onPress={handleLeave}>
          {t.common.back}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.fill, { backgroundColor: c.background }]}>
      <StatusBar barStyle={c.scheme === 'dark' ? 'light-content' : 'dark-content'} />
      <LiveKitRoom
        serverUrl={serverUrl}
        token={token}
        connect
        audio
        video={false}
        options={MEETING_ROOM_OPTIONS}
      >
        <MeetingRoomView meetingTitle={title || m.stageLabel} onLeave={handleLeave} />
      </LiveKitRoom>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  hint: { fontSize: 15, fontWeight: '500', marginTop: 12 },
  link: { fontSize: 15, fontWeight: '700', marginTop: 8 },
});
