import { useSemanticTheme } from '@/hooks/use-semantic-theme';
import { Canvas, Path, Skia } from '@shopify/react-native-skia';
import React, { useEffect, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

type Slice = { label: string; value: number; color: string };

type Props = {
  data: Slice[];
  size?: number;
  thickness?: number;
  centerLabel?: string;
  centerValue?: string;
  animate?: boolean;
};

export function DonutChart({
  data,
  size = 160,
  thickness = 16,
  centerLabel,
  centerValue,
  animate = true,
}: Props) {
  const c = useSemanticTheme();
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const r = (size - thickness) / 2;
  const cx = size / 2;
  const cy = size / 2;

  const progress = useSharedValue(animate ? 0 : 1);
  useEffect(() => {
    if (!animate) {
      progress.value = 1;
      return;
    }
    progress.value = 0;
    progress.value = withTiming(1, { duration: 900 });
  }, [animate, progress, data]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: progress.value }));

  const arcs = useMemo(() => {
    const result = data.reduce<{
      start: number;
      arcs: { path: ReturnType<typeof Skia.Path.Make>; color: string }[];
    }>((acc, d) => {
      const start = acc.start;
      const sweep = (d.value / total) * Math.PI * 2;
      const end = start + sweep;
      const useSmallArc = sweep <= Math.PI;
      const x1 = cx + r * Math.cos(start);
      const y1 = cy + r * Math.sin(start);
      const x2 = cx + r * Math.cos(end);
      const y2 = cy + r * Math.sin(end);

      const path = Skia.Path.Make();
      path.moveTo(x1, y1);
      path.arcToRotated(r, r, 0, useSmallArc, false, x2, y2);

      acc.arcs.push({ path, color: d.color });
      return { start: end, arcs: acc.arcs };
    }, { start: -Math.PI / 2, arcs: [] });

    return result.arcs;
  }, [data, total, r, cx, cy]);

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={[{ width: size, height: size }, animatedStyle]}>
        <Canvas style={StyleSheet.absoluteFill}>
          {arcs.map((a, i) => (
            <Path key={i} path={a.path} style="stroke" strokeWidth={thickness} color={a.color} strokeCap="butt" />
          ))}
        </Canvas>
      </Animated.View>
      {(centerLabel || centerValue) && (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            {centerValue && <Text style={{ color: c.foreground, fontSize: 22, fontWeight: '700', letterSpacing: -0.3 }}>{centerValue}</Text>}
            {centerLabel && <Text style={{ color: c.muted, fontSize: 11, fontWeight: '500', marginTop: 2 }}>{centerLabel}</Text>}
          </View>
        </View>
      )}
    </View>
  );
}
