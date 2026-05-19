import { useSemanticTheme } from '@/hooks/use-semantic-theme';
import {
  Canvas,
  Line,
  LinearGradient,
  RoundedRect,
  Text as SkiaText,
  matchFont,
  vec,
} from '@shopify/react-native-skia';
import React, { useEffect, useMemo } from 'react';
import { LayoutChangeEvent, Platform, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withDelay,
} from 'react-native-reanimated';

type Bar = { label: string; value: number; color?: string };

type Props = {
  data: Bar[];
  height?: number;
  color?: string;
  showGrid?: boolean;
  showLabels?: boolean;
  animate?: boolean;
  style?: any;
};

const fontFamily = Platform.select({ ios: 'Helvetica', default: 'sans-serif' });
const font = matchFont({ fontFamily, fontSize: 10, fontWeight: 'normal' });

export function BarChart({
  data,
  height = 200,
  color,
  showGrid = true,
  showLabels = true,
  animate = true,
  style,
}: Props) {
  const c = useSemanticTheme();
  const base = color ?? c.accent;
  const [w, setW] = React.useState(0);
  const onLayout = (e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width);

  const progress = useSharedValue(animate ? 0 : 1);
  useEffect(() => {
    progress.value = 0;
    progress.value = withDelay(80, withTiming(1, { duration: 700 }));
  }, [progress, data.length]);

  const growStyle = useAnimatedStyle(() => ({
    transform: [{ scaleY: progress.value }],
  }));

  const padL = showLabels ? 24 : 6;
  const padR = 6;
  const padT = 8;
  const padB = showLabels ? 18 : 4;

  const chartW = Math.max(0, w - padL - padR);
  const chartH = Math.max(0, height - padT - padB);

  const { bars, gridLines, yLabels, xLabels } = useMemo(() => {
    if (!w || data.length === 0) return { bars: [], gridLines: [], yLabels: [], xLabels: [] };
    const max = Math.max(...data.map((d) => d.value)) || 1;
    const gap = 6;
    const bw = Math.max(2, (chartW - gap * (data.length - 1)) / data.length);

    const barsData = data.map((d, i) => {
      const h = (d.value / max) * chartH;
      const x = padL + i * (bw + gap);
      const y = padT + (chartH - h);
      return { x, y, w: bw, h, color: d.color ?? base, label: d.label };
    });

    const grid = Array.from({ length: 4 }, (_, i) => padT + (chartH / 3) * i);

    const yl = Array.from({ length: 4 }, (_, i) => {
      const v = (max * (3 - i)) / 3;
      return { y: padT + (chartH / 3) * i, label: v >= 10 ? v.toFixed(0) : v.toFixed(1) };
    });

    const xl = barsData.map((b) => ({ x: b.x + b.w / 2 - 10, label: b.label }));

    return { bars: barsData, gridLines: grid, yLabels: yl, xLabels: xl };
  }, [data, w, chartW, chartH, padL, padT, base]);

  return (
    <Animated.View style={[{ height }, style]} onLayout={onLayout}>
      {w > 0 && (
        <>
          <Canvas style={StyleSheet.absoluteFill}>
            {showGrid &&
              gridLines.map((y, i) => (
                <Line key={`g${i}`} p1={vec(padL, y)} p2={vec(padL + chartW, y)} color={c.border} strokeWidth={StyleSheet.hairlineWidth} />
              ))}

            {showLabels &&
              yLabels.map((yl, i) => (
                <SkiaText key={`y${i}`} x={2} y={yl.y + 3} text={yl.label} font={font} color={c.muted} />
              ))}

            {showLabels &&
              xLabels.map((xl, i) => (
                <SkiaText key={`x${i}`} x={xl.x} y={height - 4} text={xl.label} font={font} color={c.muted} />
              ))}
          </Canvas>

          <Animated.View style={[StyleSheet.absoluteFill, { transformOrigin: 'bottom' as any }, growStyle]} pointerEvents="none">
            <Canvas style={StyleSheet.absoluteFill}>
              {bars.map((b, i) => (
                <RoundedRect key={i} x={b.x} y={b.y} width={b.w} height={b.h} r={4}>
                  <LinearGradient start={vec(b.x, b.y)} end={vec(b.x, b.y + b.h)} colors={[b.color, b.color + 'BB']} />
                </RoundedRect>
              ))}
            </Canvas>
          </Animated.View>
        </>
      )}
    </Animated.View>
  );
}
