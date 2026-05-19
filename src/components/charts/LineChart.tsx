import { useSemanticTheme } from '@/hooks/use-semantic-theme';
import {
  Canvas,
  Line,
  Path,
  Skia,
  Text as SkiaText,
  matchFont,
  vec,
} from '@shopify/react-native-skia';
import React, { useEffect, useMemo } from 'react';
import { LayoutChangeEvent, Platform, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

export type LineSeries = { label: string; color: string; values: number[]; dashed?: boolean };

type Props = {
  labels: string[];
  series: LineSeries[];
  height?: number;
  showGrid?: boolean;
  showLabels?: boolean;
  style?: any;
  legend?: boolean;
};

const fontFamily = Platform.select({ ios: 'Helvetica', default: 'sans-serif' });
const font = matchFont({ fontFamily, fontSize: 10, fontWeight: 'normal' });

function smooth(points: { x: number; y: number }[]) {
  if (points.length === 0) return Skia.Path.Make();
  const path = Skia.Path.Make();
  path.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const cur = points[i];
    const mx = (prev.x + cur.x) / 2;
    path.cubicTo(mx, prev.y, mx, cur.y, cur.x, cur.y);
  }
  return path;
}

export function LineChart({ labels, series, height = 220, showGrid = true, showLabels = true, style, legend }: Props) {
  const c = useSemanticTheme();
  const [w, setW] = React.useState(0);
  const onLayout = (e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width);

  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = 0;
    progress.value = withTiming(1, { duration: 780 });
  }, [progress, labels.join(','), series.length]);
  const animatedStyle = useAnimatedStyle(() => ({ opacity: progress.value }));

  const padL = showLabels ? 26 : 6;
  const padR = 6;
  const padT = 10;
  const padB = showLabels ? 18 : 4;

  const chartW = Math.max(0, w - padL - padR);
  const chartH = Math.max(0, height - padT - padB);

  const { paths, xl, yl, gridLines } = useMemo(() => {
    if (!w || series.length === 0) return { paths: [], xl: [], yl: [], gridLines: [] };
    const all = series.flatMap((s) => s.values);
    const max = Math.max(...all) || 1;
    const min = Math.min(...all, 0);
    const range = max - min || 1;

    const seriesPaths = series.map((s) => {
      const pts = s.values.map((v, i) => ({
        x: padL + (i / Math.max(labels.length - 1, 1)) * chartW,
        y: padT + (1 - (v - min) / range) * chartH,
      }));
      return { path: smooth(pts), color: s.color, dashed: !!s.dashed };
    });

    const grid = Array.from({ length: 4 }, (_, i) => padT + (chartH / 3) * i);

    const xLabels = labels.map((l, i) => ({
      x: padL + (i / Math.max(labels.length - 1, 1)) * chartW - 10,
      label: l,
    }));

    const yCount = 4;
    const yLabels = Array.from({ length: yCount }, (_, i) => {
      const v = min + (range * (yCount - 1 - i)) / (yCount - 1);
      return { y: padT + (chartH / (yCount - 1)) * i, label: v >= 10 ? v.toFixed(0) : v.toFixed(1) };
    });

    return { paths: seriesPaths, xl: xLabels, yl: yLabels, gridLines: grid };
  }, [labels, series, w, chartW, chartH, padL, padT]);

  return (
    <Animated.View style={[{ height: height + (legend ? 24 : 0) }, style]} onLayout={onLayout}>
      <Animated.View style={[{ height }, animatedStyle]}>
        {w > 0 && (
          <Canvas style={StyleSheet.absoluteFill}>
            {showGrid &&
              gridLines.map((y, i) => (
                <Line key={i} p1={vec(padL, y)} p2={vec(padL + chartW, y)} color={c.border} strokeWidth={StyleSheet.hairlineWidth} />
              ))}

            {showLabels &&
              yl.map((ll, i) => <SkiaText key={`y${i}`} x={2} y={ll.y + 3} text={ll.label} font={font} color={c.muted} />)}

            {showLabels &&
              xl.map((ll, i) => <SkiaText key={`x${i}`} x={ll.x} y={height - 4} text={ll.label} font={font} color={c.muted} />)}

            {paths.map((p, i) => (
              <Path
                key={i}
                path={p.path}
                style="stroke"
                strokeWidth={p.dashed ? 1.6 : 2.4}
                color={p.color}
                strokeCap="round"
                strokeJoin="round"
              />
            ))}
          </Canvas>
        )}
      </Animated.View>

      {legend && (
        <View style={styles.legend}>
          {series.map((s) => (
            <View key={s.label} style={styles.legendItem}>
              <View style={[styles.dot, { backgroundColor: s.color }]} />
              <SkiaTextFallback color={c.muted}>{s.label}</SkiaTextFallback>
            </View>
          ))}
        </View>
      )}
    </Animated.View>
  );
}

// tiny helper to avoid depending on ThemedText
import { Text } from 'react-native';
function SkiaTextFallback({ children, color }: { children: React.ReactNode; color: string }) {
  return <Text style={{ color, fontSize: 11, fontWeight: '500' }}>{children}</Text>;
}

const styles = StyleSheet.create({
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 8,
    paddingHorizontal: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
