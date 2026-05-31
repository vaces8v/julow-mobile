import { SigmaRadius } from '@/constants/sigma';
import type { SemanticTheme } from '@/hooks/use-semantic-theme';
import {
  getAccentCardBorderStops,
  getAccentSheenStops,
  getLightCardBorder,
  getLightCardElevation,
  getVolumetricBorderStops,
} from '@/lib/theme-surfaces';
import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

type CardSurfaceProps = {
  c: SemanticTheme;
  children: ReactNode;
  /** Optional accent for inner sheen (not border tint). */
  accent?: string;
  allowOverflow?: boolean;
  radius?: number;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
};

/**
 * Premium card shell: volumetric gradient border in dark mode;
 * hairline border + soft shadow in light mode.
 */
export function CardSurface({
  c,
  children,
  accent,
  allowOverflow,
  radius = SigmaRadius.xl,
  style,
  contentStyle,
}: CardSurfaceProps) {
  const innerRadius = radius - 1;
  const borderStops = getVolumetricBorderStops(c.scheme, accent);

  const inner = (
    <View
      style={[
        { borderRadius: innerRadius, overflow: 'hidden', backgroundColor: c.surface },
        allowOverflow && styles.innerOverflowVisible,
      ]}
    >
      {accent ? (
        <LinearGradient
          colors={getAccentSheenStops(c.scheme, accent)}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
      ) : null}
      <View style={[styles.content, contentStyle]}>{children}</View>
    </View>
  );

  if (borderStops) {
    return (
      <LinearGradient
        colors={borderStops}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[{ borderRadius: radius, padding: 1 }, style]}
      >
        {inner}
      </LinearGradient>
    );
  }

  const flatStyle = StyleSheet.flatten(style);
  return (
    <View
      style={[
        { borderRadius: radius, ...getLightCardBorder(c), ...getLightCardElevation() },
        flatStyle,
        { padding: 0 },
      ]}
    >
      {inner}
    </View>
  );
}

type AccentCardSurfaceProps = {
  c: SemanticTheme;
  color: string;
  children: ReactNode;
  radius?: number;
  style?: StyleProp<ViewStyle>;
  innerStyle?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
};

/** Stat, project, and metric chips — accent-tinted border in dark; flat elevated card in light. */
export function AccentCardSurface({
  c,
  color,
  children,
  radius = SigmaRadius.xl,
  style,
  innerStyle,
  contentStyle,
}: AccentCardSurfaceProps) {
  const innerRadius = radius - 1;
  const borderStops = getAccentCardBorderStops(c.scheme, color);

  const inner = (
    <View
      style={[
        { borderRadius: innerRadius, overflow: 'hidden', backgroundColor: c.surface },
        innerStyle,
      ]}
    >
      <LinearGradient
        colors={getAccentSheenStops(c.scheme, color)}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <View style={[styles.content, contentStyle]}>{children}</View>
    </View>
  );

  if (borderStops) {
    return (
      <LinearGradient
        colors={borderStops}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[{ borderRadius: radius, padding: 1 }, style]}
      >
        {inner}
      </LinearGradient>
    );
  }

  const flatStyle = StyleSheet.flatten(style);
  return (
    <View
      style={[
        { borderRadius: radius, ...getLightCardBorder(c), ...getLightCardElevation() },
        flatStyle,
        { padding: 0 },
      ]}
    >
      {inner}
    </View>
  );
}

const styles = StyleSheet.create({
  innerOverflowVisible: {
    overflow: 'visible',
  },
  content: {
    flex: 1,
    position: 'relative',
    zIndex: 2,
  },
});
