import {
  APPLE_EASE,
  SHEET_SWITCH_IN_MS,
  SHEET_SWITCH_OUT_MS,
} from '@/components/auth/auth-animation';
import type { AuthMode } from '@/components/auth/auth-locales';
import { memo, useEffect } from 'react';
import { StyleSheet, Text } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

type Props = {
  mode: AuthMode;
  transitioning: boolean;
  loginTitle: string;
  loginSubtitle: string;
  registerTitle: string;
  registerSubtitle: string;
  titleColor: string;
  subtitleColor: string;
};

export const AuthHeadline = memo(function AuthHeadline({
  mode,
  transitioning,
  loginTitle,
  loginSubtitle,
  registerTitle,
  registerSubtitle,
  titleColor,
  subtitleColor,
}: Props) {
  const title = mode === 'login' ? loginTitle : registerTitle;
  const subtitle = mode === 'login' ? loginSubtitle : registerSubtitle;
  const opacity = useSharedValue(1);

  useEffect(() => {
    opacity.value = withTiming(transitioning ? 0 : 1, {
      duration: transitioning ? SHEET_SWITCH_OUT_MS : SHEET_SWITCH_IN_MS,
      easing: APPLE_EASE,
    });
  }, [transitioning, opacity]);

  const fadeStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View style={[styles.wrap, fadeStyle]}>
      <Text style={[styles.title, { color: titleColor }]} numberOfLines={2}>
        {title}
      </Text>
      <Text style={[styles.subtitle, { color: subtitleColor }]} numberOfLines={2}>
        {subtitle}
      </Text>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  wrap: {
    gap: 6,
    marginBottom: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
    lineHeight: 30,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
});
