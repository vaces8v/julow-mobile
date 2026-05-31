import { SigmaRadius } from '@/constants/sigma';
import type { SemanticTheme } from '@/hooks/use-semantic-theme';
import {
  getAccentSheenStops,
  getToastBorderStops,
  getToastElevation,
  getToastGlassBackground,
  getToastLightBorder,
} from '@/lib/theme-surfaces';
import { Canvas, Fill, FractalNoise, Rect } from '@shopify/react-native-skia';
import { LinearGradient } from 'expo-linear-gradient';
import { memo, type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

const RADIUS = SigmaRadius.lg;
const INNER_RADIUS = RADIUS - 1;
const NOISE_W = 480;
const NOISE_H = 120;

type Props = {
  c: SemanticTheme;
  accent: string;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

function ToastNoiseLayer({ isDark }: { isDark: boolean }) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Canvas style={StyleSheet.absoluteFill}>
        <Rect x={0} y={0} width={NOISE_W} height={NOISE_H}>
          <Fill opacity={isDark ? 0.06 : 0.045}>
            <FractalNoise
              freqX={0.72}
              freqY={0.72}
              octaves={3}
              seed={17}
              tileWidth={72}
              tileHeight={72}
            />
          </Fill>
        </Rect>
      </Canvas>
    </View>
  );
}

export const ToastSurface = memo(function ToastSurface({ c, accent, children, style }: Props) {
  const glassBg = getToastGlassBackground(c.scheme);
  const borderStops = getToastBorderStops(c.scheme, accent);
  const elevation = getToastElevation(c.scheme);
  const isDark = c.scheme === 'dark';

  const inner = (
    <View
      style={[
        styles.inner,
        {
          borderRadius: INNER_RADIUS,
          backgroundColor: glassBg,
          borderCurve: 'continuous',
        },
      ]}
    >
      <ToastNoiseLayer isDark={isDark} />
      <LinearGradient
        colors={getAccentSheenStops(c.scheme, accent)}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <LinearGradient
        colors={
          isDark
            ? ['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.02)', 'transparent']
            : ['rgba(255,255,255,0.75)', 'rgba(255,255,255,0.2)', 'transparent']
        }
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={[StyleSheet.absoluteFill, styles.topSheen]}
        pointerEvents="none"
      />
      <View style={[styles.accentStripe, { backgroundColor: accent }]} />
      <View style={styles.content}>{children}</View>
    </View>
  );

  if (borderStops) {
    return (
      <LinearGradient
        colors={borderStops}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.outer,
          { borderRadius: RADIUS, borderCurve: 'continuous' },
          elevation,
          style,
        ]}
      >
        {inner}
      </LinearGradient>
    );
  }

  return (
    <View
      style={[
        styles.outer,
        { borderRadius: RADIUS, borderCurve: 'continuous' },
        getToastLightBorder(c, accent),
        elevation,
        style,
      ]}
    >
      {inner}
    </View>
  );
});

const styles = StyleSheet.create({
  outer: {
    padding: 1,
    overflow: 'hidden',
  },
  inner: {
    overflow: 'hidden',
  },
  topSheen: {
    opacity: 0.55,
  },
  accentStripe: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    borderTopLeftRadius: INNER_RADIUS,
    borderBottomLeftRadius: INNER_RADIUS,
    zIndex: 1,
  },
  content: {
    position: 'relative',
    zIndex: 2,
  },
});
