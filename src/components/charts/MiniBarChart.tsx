import { SigmaElevation, SigmaRadius, SigmaTypo } from '@/constants/sigma';
import { useSemanticTheme } from '@/hooks/use-semantic-theme';
import { Canvas, RoundedRect } from '@shopify/react-native-skia';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

interface ChartData {
  value: number;
}

interface MiniBarChartProps {
  data: ChartData[];
  width: number;
  height: number;
  color: string;
  title: string;
  subtitle: string;
  sharedTransitionTag?: string;
}

export function MiniBarChart({ data, width, height, color, title, subtitle, sharedTransitionTag }: MiniBarChartProps) {
  const c = useSemanticTheme();
  const maxValue = Math.max(...data.map(d => d.value));

  // Animation values
  const [showBars, setShowBars] = useState(false);

  useEffect(() => {
    // Delay rendering bars to allow parent components to mount smoothly
    const timer = setTimeout(() => setShowBars(true), 200);
    return () => clearTimeout(timer);
  }, []);

  const chartAreaHeight = height * 0.45;
  const barWidth = (width - 40 - (data.length * 4)) / data.length; // 40px horizontal padding total, 4px gap

  return (
    <Animated.View
      style={[styles.card, { width, height, backgroundColor: c.surfaceSecondary }]}
      sharedTransitionTag={sharedTransitionTag}
    >
      {/* Background Gradient to give it a shiny, premium dark theme look */}
      <View style={StyleSheet.absoluteFill}>
        <LinearGradient
          colors={[c.surfaceSecondary, c.background]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        {/* Subtle glow effect behind the chart based on the passed color */}
        <LinearGradient
          colors={[color + '20', 'transparent']}
          start={{ x: 0.5, y: 0.8 }}
          end={{ x: 0.5, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={[styles.cardBorder, { borderColor: c.border }]} />
      </View>

      {/* Top Text Content */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: color }]}>{title}</Text>
      </View>

      {/* Chart Canvas */}
      <View style={styles.chartContainer}>
        <View style={[styles.canvasWrap, { opacity: showBars ? 1 : 0 }]}
          pointerEvents="none"
        >
          <Canvas style={{ width: width - 40, height: chartAreaHeight }}>
            {data.map((item, index) => {
              const maxBarHeight = (item.value / maxValue) * chartAreaHeight;
              const x = index * (barWidth + 4);

              const barHeight = maxBarHeight;
              const y = chartAreaHeight - barHeight;

              return (
                <RoundedRect
                  key={index}
                  x={x}
                  y={y}
                  width={barWidth}
                  height={barHeight}
                  r={3}
                  color={color + 'E6'} // 90% opacity of the passed color
                />
              );
            })}
          </Canvas>
        </View>
      </View>

      {/* Bottom Text Content */}
      <View style={styles.footer}>
        <Text style={[styles.subtitle, { color: c.muted }]}>{subtitle}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: SigmaRadius.xl,
    padding: 18,
    justifyContent: 'space-between',
    overflow: 'hidden',
    ...SigmaElevation.low,
  },
  cardBorder: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    borderWidth: 1,
    borderRadius: SigmaRadius.xl,
  },
  header: {
    marginBottom: 4,
  },
  title: {
    fontSize: SigmaTypo.title2,
    fontWeight: '700',
  },
  chartContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 8,
  },
  canvasWrap: {
    width: '100%',
    height: '100%',
  },
  footer: {
    marginTop: 10,
  },
  subtitle: {
    fontSize: SigmaTypo.caption,
    fontWeight: '500',
  }
});
