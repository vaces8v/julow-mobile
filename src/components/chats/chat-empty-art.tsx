import { useSemanticTheme } from '@/hooks/use-semantic-theme';
import { BubbleChatIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';

export function ChatEmptyArt() {
  const c = useSemanticTheme();

  return (
    <View style={styles.wrap}>
      <LinearGradient
        colors={[c.accent + '22', c.accent + '08', 'transparent']}
        style={[styles.glow, { borderCurve: 'continuous' }]}
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
        <HugeiconsIcon icon={BubbleChatIcon} size={36} color={c.accent} strokeWidth={1.6} />
      </View>
      <View style={[styles.dot, styles.dotLeft, { backgroundColor: c.accent + '55' }]} />
      <View style={[styles.dot, styles.dotRight, { backgroundColor: c.success + '44' }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  glow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 60,
  },
  iconOrb: {
    width: 72,
    height: 72,
    borderRadius: 36,
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
  dotLeft: {
    top: 18,
    left: 8,
  },
  dotRight: {
    bottom: 22,
    right: 10,
  },
});
