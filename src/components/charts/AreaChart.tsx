import { useSemanticTheme } from '@/hooks/use-semantic-theme';
import {
  Canvas,
  Circle,
  Group,
  Line,
  LinearGradient,
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

type Point = { label: string; value: number };

type Props = {
  data: Point[];
  height?: number;
  color?: string;
  showGrid?: boolean;
  showLabels?: boolean;
  animate?: boolean;
  style?: any;
};

const fontFamily = Platform.select({ ios: 'Helvetica', default: 'sans-serif' });
const font = matchFont({ fontFamily, fontSize: 10, fontWeight: '500' });

function buildPath(points: { x: number; y: number }[]) {
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

export function AreaChart({
  data,
  height = 200,
  color,
  showGrid = true,
  showLabels = true,
  animate = true,
  style,
}: Props) {
  const c = useSemanticTheme();
  const stroke = color ?? c.accent;
  const [w, setW] = React.useState(0);
  const onLayout = (e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width);

  const progress = useSharedValue(animate ? 0 : 1);
  useEffect(() => {
    if (animate) progress.value = withTiming(1, { duration: 780 });
  }, [animate, progress, data]);

  const opacityStyle = useAnimatedStyle(() => ({ opacity: progress.value }));

  const padL = showLabels ? 30 : 8;
  const padR = 8;
  const padT = 12;
  const padB = showLabels ? 20 : 6;

  const chartW = Math.max(0, w - padL - padR);
  const chartH = Math.max(0, height - padT - padB);

  const { pathArea, pathLine, gridLines, xLabels, yLabels, dots } = useMemo(() => {
    if (!w || data.length === 0) {
      return {
        pathArea: Skia.Path.Make(),
        pathLine: Skia.Path.Make(),
        gridLines: [],
        xLabels: [],
        yLabels: [],
        dots: [],
      };
    }
    const vals = data.map((d) => d.value);
    const min = Math.min(...vals, 0);
    const max = Math.max(...vals) || 1;
    const range = max - min || 1;

    const pts = data.map((d, i) => {
      const x = padL + (i / Math.max(data.length - 1, 1)) * chartW;
      const y = padT + (1 - (d.value - min) / range) * chartH;
      return { x, y };
    });

    const line = buildPath(pts);
    const area = line.copy();
    area.lineTo(pts[pts.length - 1].x, padT + chartH);
    area.lineTo(pts[0].x, padT + chartH);
    area.close();

    const grid = Array.from({ length: 4 }, (_, i) => padT + (chartH / 3) * i);

    const xl = data.map((d, i) => ({
      x: padL + (i / Math.max(data.length - 1, 1)) * chartW,
      label: d.label,
    }));

    const yCount = 4;
    const yl = Array.from({ length: yCount }, (_, i) => {
      const v = min + (range * (yCount - 1 - i)) / (yCount - 1);
      return { y: padT + (chartH / (yCount - 1)) * i, label: v.toFixed(v >= 10 ? 0 : 1) };
    });

    return { pathArea: area, pathLine: line, gridLines: grid, xLabels: xl, yLabels: yl, dots: pts };
  }, [data, w, chartW, chartH, padL, padT]);

  return (
    <Animated.View style={[{ height }, opacityStyle, style]} onLayout={onLayout}>
      {w > 0 && (
        <Canvas style={StyleSheet.absoluteFill}>
          {showGrid &&
            gridLines.map((y, i) => (
              <Line
                key={i}
                p1={vec(padL, y)}
                p2={vec(padL + chartW, y)}
                color={c.separator}
                strokeWidth={StyleSheet.hairlineWidth}
                opacity={0.9}
              />
            ))}

          {showLabels &&
            yLabels.map((yl, i) => (
              <SkiaText key={`y${i}`} x={2} y={yl.y + 3} text={yl.label} font={font} color={c.muted} />
            ))}

          <Group>
            <Path path={pathArea}>
              <LinearGradient
                start={vec(0, padT)}
                end={vec(0, padT + chartH)}
                colors={[stroke + '66', stroke + '12', stroke + '00']}
              />
            </Path>
            <Path path={pathLine} style="stroke" strokeWidth={5} color={stroke + '33'} strokeCap="round" strokeJoin="round" />
            <Path path={pathLine} style="stroke" strokeWidth={2.6} color={stroke} strokeCap="round" strokeJoin="round" />
          </Group>

          {dots.map((pt, i) => (
            <Group key={`dot-${i}`}>
              <Circle cx={pt.x} cy={pt.y} r={5} color={stroke + '33'} />
              <Circle cx={pt.x} cy={pt.y} r={2.8} color={stroke} />
              <Circle cx={pt.x} cy={pt.y} r={1.2} color="#ffffff" opacity={0.85} />
            </Group>
          ))}

          {showLabels &&
            xLabels.map((xl, i) => (
              <SkiaText
                key={`x${i}`}
                x={xl.x - 10}
                y={height - 4}
                text={xl.label}
                font={font}
                color={c.muted}
              />
            ))}
        </Canvas>
      )}
    </Animated.View>
  );
}
