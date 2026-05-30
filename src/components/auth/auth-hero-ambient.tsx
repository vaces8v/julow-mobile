import { APPLE_EASE, HERO_FADE_MS } from '@/components/auth/auth-animation';
import { Canvas, Circle, RadialGradient, vec } from '@shopify/react-native-skia';
import { memo, useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

/** Large canvas — art extends past bounds; parent uses overflow visible. */
const ART_W = 420;
const ART_H = 400;
const CX = ART_W * 0.5;
const CY = ART_H * 0.5;
const ART_DROP = 42;
const BOTTOM_OVERFLOW = 116;

type Props = {
  accentColor: string;
  isDark: boolean;
  visible?: boolean;
};

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  if (h.length < 6) return [128, 128, 128];
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

/** Wide multi-stop radial — soft blur without BlurMask (meeting-card style). */
function diffuseRingColors(rgb: [number, number, number], peak: number) {
  const [r, g, b] = rgb;
  return [
    'rgba(0,0,0,0)',
    'rgba(0,0,0,0)',
    `rgba(${r},${g},${b},${peak * 0.03})`,
    `rgba(${r},${g},${b},${peak * 0.1})`,
    `rgba(${r},${g},${b},${peak * 0.24})`,
    `rgba(${r},${g},${b},${peak * 0.42})`,
    `rgba(${r},${g},${b},${peak * 0.55})`,
    `rgba(${r},${g},${b},${peak * 0.38})`,
    `rgba(${r},${g},${b},${peak * 0.16})`,
    `rgba(${r},${g},${b},${peak * 0.05})`,
    'rgba(0,0,0,0)',
  ] as const;
}

function diffuseRingPositions(ringCenter: number, ringSpread: number) {
  const inner = ringCenter - ringSpread;
  const outer = ringCenter + ringSpread;
  return [
    0,
    Math.max(0, inner - 0.18),
    inner - 0.08,
    inner + ringSpread * 0.35,
    inner + ringSpread * 0.65,
    ringCenter,
    outer - ringSpread * 0.35,
    outer + ringSpread * 0.28,
    outer + 0.1,
    outer + 0.2,
    1,
  ] as const;
}

function neutralRgb(isDark: boolean): [number, number, number] {
  return isDark ? [176, 176, 184] : [92, 92, 102];
}

/** Two soft blooms: accent shifted right; neutral lower-left. */
function AuthHeroRippleArt({
  accentRgb,
  neutral,
  isDark,
}: {
  accentRgb: [number, number, number];
  neutral: [number, number, number];
  isDark: boolean;
}) {
  const accentPeak = isDark ? 0.055 : 0.042;
  const neutralPeak = isDark ? 0.035 : 0.028;

  const accentCx = CX + 36;
  const accentCy = CY - 12;
  const neutralCx = CX - 32;
  const neutralCy = CY + 48;

  return (
    <Canvas style={{ width: ART_W, height: ART_H }}>
      <Circle cx={neutralCx} cy={neutralCy} r={200}>
        <RadialGradient
          c={vec(neutralCx, neutralCy)}
          r={200}
          colors={[...diffuseRingColors(neutral, neutralPeak)]}
          positions={[...diffuseRingPositions(0.78, 0.2)]}
        />
      </Circle>
      <Circle cx={neutralCx} cy={neutralCy} r={168}>
        <RadialGradient
          c={vec(neutralCx, neutralCy)}
          r={168}
          colors={[...diffuseRingColors(neutral, neutralPeak * 0.85)]}
          positions={[...diffuseRingPositions(0.76, 0.17)]}
        />
      </Circle>
      <Circle cx={accentCx} cy={accentCy} r={210}>
        <RadialGradient
          c={vec(accentCx, accentCy)}
          r={210}
          colors={[...diffuseRingColors(accentRgb, accentPeak)]}
          positions={[...diffuseRingPositions(0.8, 0.21)]}
        />
      </Circle>
      <Circle cx={accentCx} cy={accentCy} r={176}>
        <RadialGradient
          c={vec(accentCx, accentCy)}
          r={176}
          colors={[...diffuseRingColors(accentRgb, accentPeak * 0.9)]}
          positions={[...diffuseRingPositions(0.77, 0.18)]}
        />
      </Circle>
    </Canvas>
  );
}

export const AUTH_HERO_ART = {
  width: ART_W,
  height: ART_H,
} as const;

export const AuthHeroAmbient = memo(function AuthHeroAmbient({
  accentColor,
  isDark,
  visible = true,
}: Props) {
  const opacity = useSharedValue(visible ? 1 : 0);
  const accentRgb = useMemo(() => hexToRgb(accentColor), [accentColor]);
  const neutral = useMemo(() => neutralRgb(isDark), [isDark]);

  useEffect(() => {
    opacity.value = withTiming(visible ? 1 : 0, {
      duration: HERO_FADE_MS,
      easing: APPLE_EASE,
    });
  }, [visible, opacity]);

  const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View style={[styles.layer, animStyle]} pointerEvents="none">
      <View style={styles.artWrap}>
        <AuthHeroRippleArt accentRgb={accentRgb} neutral={neutral} isDark={isDark} />
      </View>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  layer: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: -BOTTOM_OVERFLOW,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  artWrap: {
    width: ART_W,
    height: ART_H,
    overflow: 'visible',
    transform: [{ translateY: ART_DROP }],
  },
});
