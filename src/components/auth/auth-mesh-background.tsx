import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { Dimensions, Platform, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

const { width: W, height: H } = Dimensions.get('window');

type Orb = {
  colors: readonly [string, string, string];
  size: number;
  top: number;
  left?: number;
  right?: number;
  driftX: [number, number];
  driftY: [number, number];
  scale: [number, number];
  duration: number;
};

const ORBS: Orb[] = [
  {
    colors: ['#6366f1', '#8b5cf6', 'rgba(168,85,247,0)'],
    size: W * 1.25,
    top: -H * 0.22,
    left: -W * 0.4,
    driftX: [-24, 48],
    driftY: [-36, 28],
    scale: [1, 1.14],
    duration: 14000,
  },
  {
    colors: ['#f97316', '#fb7185', 'rgba(244,114,182,0)'],
    size: W * 1.05,
    top: H * 0.04,
    right: -W * 0.45,
    driftX: [36, -56],
    driftY: [12, -40],
    scale: [1.06, 0.9],
    duration: 17000,
  },
  {
    colors: ['#06b6d4', '#3b82f6', 'rgba(99,102,241,0)'],
    size: W * 0.95,
    top: H * 0.4,
    left: -W * 0.3,
    driftX: [-18, 38],
    driftY: [28, -24],
    scale: [0.94, 1.12],
    duration: 12500,
  },
  {
    colors: ['#22d3ee', '#818cf8', 'rgba(192,132,252,0)'],
    size: W * 0.78,
    top: H * 0.66,
    right: -W * 0.18,
    driftX: [22, -28],
    driftY: [-18, 32],
    scale: [1, 1.1],
    duration: 15500,
  },
];

function OrbView({ orb, index }: { orb: Orb; index: number }) {
  const t = useSharedValue(0);

  useEffect(() => {
    t.value = withRepeat(
      withTiming(1, { duration: orb.duration, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
  }, [orb.duration, t]);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(t.value, [0, 1], orb.driftX) },
      { translateY: interpolate(t.value, [0, 1], orb.driftY) },
      { scale: interpolate(t.value, [0, 1], orb.scale) },
      { rotate: `${interpolate(t.value, [0, 1], [index * 5, index * 5 + 10])}deg` },
    ],
    opacity: interpolate(t.value, [0, 0.5, 1], [0.7, 0.95, 0.7]),
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.orb,
        {
          width: orb.size,
          height: orb.size,
          borderRadius: orb.size / 2,
          top: orb.top,
          left: orb.left,
          right: orb.right,
        },
        style,
      ]}
    >
      <LinearGradient
        colors={orb.colors}
        start={{ x: 0.2, y: 0.2 }}
        end={{ x: 0.9, y: 0.9 }}
        style={StyleSheet.absoluteFill}
      />
    </Animated.View>
  );
}

function AuroraSweep() {
  const t = useSharedValue(0);

  useEffect(() => {
    t.value = withRepeat(
      withTiming(1, { duration: 9000, easing: Easing.inOut(Easing.cubic) }),
      -1,
      false,
    );
  }, [t]);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(t.value, [0, 1], [-W * 0.6, W * 0.6]) },
      { rotate: '12deg' },
    ],
    opacity: interpolate(t.value, [0, 0.4, 0.6, 1], [0, 0.55, 0.55, 0]),
  }));

  return (
    <Animated.View pointerEvents="none" style={[styles.sweep, style]}>
      <LinearGradient
        colors={['rgba(255,255,255,0)', 'rgba(165,180,252,0.22)', 'rgba(255,255,255,0)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={StyleSheet.absoluteFill}
      />
    </Animated.View>
  );
}

export function AuthMeshBackground() {
  // Animated orbs allocate large offscreen layers and peg the UI thread on Android
  // when the keyboard opens (ANR → lowmemorykiller). Static gradients keep the look.
  const showAnimatedOrbs = Platform.OS !== 'android';

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <LinearGradient
        colors={['#070a16', '#10152b', '#161038', '#0b1020']}
        locations={[0, 0.32, 0.68, 1]}
        style={StyleSheet.absoluteFill}
      />

      {showAnimatedOrbs
        ? ORBS.map((orb, index) => <OrbView key={index} orb={orb} index={index} />)
        : (
          <>
            <LinearGradient
              colors={['rgba(99,102,241,0.35)', 'rgba(139,92,246,0.12)', 'rgba(168,85,247,0)']}
              start={{ x: 0.1, y: 0 }}
              end={{ x: 0.9, y: 0.85 }}
              style={[styles.androidOrb, { top: -H * 0.18, left: -W * 0.35, width: W * 0.95, height: W * 0.95 }]}
            />
            <LinearGradient
              colors={['rgba(249,115,22,0.22)', 'rgba(251,113,133,0.1)', 'rgba(244,114,182,0)']}
              start={{ x: 0.85, y: 0.1 }}
              end={{ x: 0.1, y: 0.9 }}
              style={[styles.androidOrb, { top: H * 0.08, right: -W * 0.38, width: W * 0.82, height: W * 0.82 }]}
            />
          </>
        )}

      {showAnimatedOrbs ? <AuroraSweep /> : null}

      <LinearGradient
        colors={['rgba(251,191,36,0.18)', 'rgba(251,191,36,0)', 'rgba(99,102,241,0)']}
        start={{ x: 1, y: 0 }}
        end={{ x: 0.15, y: 0.55 }}
        style={[StyleSheet.absoluteFill, { opacity: 0.85 }]}
      />

      <LinearGradient
        colors={['rgba(0,0,0,0)', 'rgba(8,10,24,0.3)', 'rgba(6,8,20,0.86)']}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.vignette} />
    </View>
  );
}

const styles = StyleSheet.create({
  orb: {
    position: 'absolute',
    overflow: 'hidden',
  },
  androidOrb: {
    position: 'absolute',
    borderRadius: 9999,
    opacity: 0.9,
  },
  sweep: {
    position: 'absolute',
    top: -H * 0.1,
    left: 0,
    width: W * 0.55,
    height: H * 1.2,
  },
  vignette: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
});
