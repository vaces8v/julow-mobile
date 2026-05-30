import { useSemanticTheme } from '@/hooks/use-semantic-theme';
import { Notification03Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';

export function NotificationEmptyArt() {
  const c = useSemanticTheme();

  return (
    <View style={styles.wrap}>
      <LinearGradient
        colors={[c.accent + '28', c.accent + '0c', 'transparent']}
        style={[styles.glow, { borderCurve: 'continuous' }]}
      />
      <View
        style={[
          styles.ring,
          {
            borderColor: c.accent + '33',
            borderCurve: 'continuous',
          },
        ]}
      />
      <View
        style={[
          styles.iconOrb,
          {
            backgroundColor: c.surface,
            borderColor: c.border,
            borderCurve: 'continuous',
          },
        ]}
      >
        <HugeiconsIcon icon={Notification03Icon} size={34} color={c.accent} strokeWidth={1.6} />
      </View>
      <View style={[styles.dot, styles.dotLeft, { backgroundColor: c.success + '55' }]} />
      <View style={[styles.dot, styles.dotRight, { backgroundColor: c.accent + '44' }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: 128,
    height: 128,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  glow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 64,
  },
  ring: {
    position: 'absolute',
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 1.5,
  },
  iconOrb: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
  },
  dot: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  dotLeft: { top: 18, left: 22 },
  dotRight: { bottom: 20, right: 20 },
});
