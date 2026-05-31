import { MeetingChatView } from '@/components/meetings/meeting-chat-view';
import { useLiveMeeting } from '@/contexts/live-meeting-context';
import { useSemanticTheme } from '@/hooks/use-semantic-theme';
import { useI18n } from '@/i18n/context';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function MeetingChatScreen() {
  const c = useSemanticTheme();
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  const m = t.meetings;
  const params = useLocalSearchParams<{ id: string }>();
  const meetingId = Array.isArray(params.id) ? params.id[0] : params.id;

  const {
    meetingId: activeMeetingId,
    meetingTitle,
    token,
    enteredCall,
  } = useLiveMeeting();

  const inCall =
    Boolean(meetingId && activeMeetingId === meetingId && token && enteredCall);

  useEffect(() => {
    if (!meetingId) return;
    if (!inCall) {
      router.replace({
        pathname: '/meetings/[id]/room',
        params: { id: meetingId },
      });
    }
  }, [inCall, meetingId]);

  if (!meetingId) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <Text style={{ color: c.muted }}>Meeting not found</Text>
      </View>
    );
  }

  if (!inCall) {
    return (
      <View style={[styles.center, { backgroundColor: c.background, paddingTop: insets.top }]}>
        <ActivityIndicator color={c.accent} size="large" />
        <Text style={[styles.hint, { color: c.muted }]}>{m.preparingTitle}</Text>
      </View>
    );
  }

  return <MeetingChatView meetingTitle={meetingTitle || m.stageLabel} />;
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  hint: { fontSize: 15, fontWeight: '500', marginTop: 12 },
});
