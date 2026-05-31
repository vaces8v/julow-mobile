import { SigmaRadius, SigmaTypo } from '@/constants/sigma';
import { useSemanticTheme } from '@/hooks/use-semantic-theme';
import { useI18n } from '@/i18n/context';
import {
  ArrowLeft01Icon,
  AudioWave01Icon,
  Call02Icon,
  FilterHorizontalIcon,
  Mic01Icon,
  MicOff01Icon,
  VideoReplayIcon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { Button, Card } from 'heroui-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Props = {
  meetingTitle: string;
  micEnabled: boolean;
  camEnabled: boolean;
  noiseSuppressionEnabled: boolean;
  onMicChange: (enabled: boolean) => void;
  onCamChange: (enabled: boolean) => void;
  onNoiseSuppressionChange: (enabled: boolean) => void;
  onJoin: () => void;
  onCancel: () => void;
};

export function MeetingPreJoinView({
  meetingTitle,
  micEnabled,
  camEnabled,
  noiseSuppressionEnabled,
  onMicChange,
  onCamChange,
  onNoiseSuppressionChange,
  onJoin,
  onCancel,
}: Props) {
  const c = useSemanticTheme();
  const { t } = useI18n();
  const m = t.meetings;
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.root, { backgroundColor: c.background, paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <Pressable
          style={[styles.backBtn, { backgroundColor: c.surfaceSecondary }]}
          onPress={onCancel}
          hitSlop={10}
          accessibilityLabel={t.common.back}
        >
          <HugeiconsIcon icon={ArrowLeft01Icon} size={18} color={c.foreground} strokeWidth={2} />
        </Pressable>
      </View>

      <View style={styles.body}>
        <View style={[styles.heroIcon, { backgroundColor: c.accent + '18' }]}>
          <HugeiconsIcon icon={Call02Icon} size={28} color={c.accent} strokeWidth={1.8} />
        </View>

        <Text style={[styles.title, { color: c.foreground }]} numberOfLines={2}>
          {meetingTitle}
        </Text>
        <Text style={[styles.hint, { color: c.muted }]}>{m.preJoinHint}</Text>

        <Card
          style={{
            backgroundColor: c.surface,
            borderColor: c.border,
            borderWidth: StyleSheet.hairlineWidth,
            width: '100%',
          }}
        >
          <Card.Body style={styles.toggleCard}>
            <MediaToggleButton
              enabled={micEnabled}
              onPress={() => onMicChange(!micEnabled)}
              labelOn={m.preJoinMicOn}
              labelOff={m.preJoinMicOff}
              iconOn={Mic01Icon}
              iconOff={MicOff01Icon}
            />
            <MediaToggleButton
              enabled={camEnabled}
              onPress={() => onCamChange(!camEnabled)}
              labelOn={m.preJoinCamOn}
              labelOff={m.preJoinCamOff}
              iconOn={VideoReplayIcon}
              iconOff={VideoReplayIcon}
            />
            <MediaToggleButton
              enabled={noiseSuppressionEnabled}
              onPress={() => onNoiseSuppressionChange(!noiseSuppressionEnabled)}
              labelOn={m.noiseSuppressionOn}
              labelOff={m.noiseSuppressionOff}
              iconOn={AudioWave01Icon}
              iconOff={FilterHorizontalIcon}
            />
          </Card.Body>
        </Card>

        <Button size="lg" variant="primary" style={styles.joinBtn} onPress={onJoin}>
          <HugeiconsIcon icon={Call02Icon} size={18} color={c.accentForeground} strokeWidth={2} />
          <Button.Label>{m.preJoinJoin}</Button.Label>
        </Button>
      </View>
    </View>
  );
}

function MediaToggleButton({
  enabled,
  onPress,
  labelOn,
  labelOff,
  iconOn,
  iconOff,
}: {
  enabled: boolean;
  onPress: () => void;
  labelOn: string;
  labelOff: string;
  iconOn: typeof Mic01Icon;
  iconOff: typeof MicOff01Icon;
}) {
  const c = useSemanticTheme();
  const label = enabled ? labelOn : labelOff;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: enabled }}
      accessibilityLabel={label}
      style={[
        styles.toggleBtn,
        {
          backgroundColor: enabled ? c.accent + '18' : c.surfaceSecondary,
          borderColor: enabled ? c.accent + '55' : c.border,
        },
      ]}
    >
      <View
        style={[
          styles.toggleIconWrap,
          { backgroundColor: enabled ? c.accent + '28' : c.background },
        ]}
      >
        <HugeiconsIcon
          icon={enabled ? iconOn : iconOff}
          size={22}
          color={enabled ? c.accent : c.muted}
          strokeWidth={2}
        />
      </View>
      <Text style={[styles.toggleLabel, { color: enabled ? c.foreground : c.muted }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingBottom: 8,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 16,
    marginTop: -40,
  },
  heroIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: SigmaTypo.headline,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.2,
  },
  hint: {
    fontSize: SigmaTypo.bodySmall,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 320,
  },
  toggleCard: {
    flexDirection: 'row',
    gap: 10,
    padding: 12,
  },
  toggleBtn: {
    flex: 1,
    alignItems: 'center',
    gap: 10,
    paddingVertical: 16,
    paddingHorizontal: 10,
    borderRadius: SigmaRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  toggleIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleLabel: {
    fontSize: SigmaTypo.caption,
    fontWeight: '700',
    textAlign: 'center',
  },
  joinBtn: {
    width: '100%',
    marginTop: 8,
  },
});
