import React, { useEffect } from 'react';
import { ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

type FadeProps = {
  children: React.ReactNode;
  delay?: number; // ms
  initialY?: number;
  duration?: number;
  style?: ViewStyle | ViewStyle[];
};

/**
 * Fade — mount animation: opacity 0→1, translateY initialY→0.
 * Матчит по духу web-вариант на motion/react.
 */
export function Fade({ children, delay = 0, initialY = 8, duration = 380, style }: FadeProps) {
  const op = useSharedValue(0);
  const ty = useSharedValue(initialY);

  useEffect(() => {
    op.value = withDelay(delay, withTiming(1, { duration }));
    ty.value = withDelay(delay, withSpring(0, { damping: 18, stiffness: 220, mass: 0.6 }));
  }, [delay, duration, initialY, op, ty]);

  const animated = useAnimatedStyle(() => ({
    opacity: op.value,
    transform: [{ translateY: ty.value }],
  }));

  return <Animated.View style={[animated, style]}>{children}</Animated.View>;
}

type FadeListProps = {
  children: React.ReactNode[];
  holdDelay?: number;
  initialDelay?: number;
  initialY?: number;
  style?: ViewStyle | ViewStyle[];
};

export function FadeList({ children, holdDelay = 60, initialDelay = 0, initialY = 10, style }: FadeListProps) {
  return (
    <>
      {React.Children.toArray(children).map((ch, i) => (
        <Fade key={i} delay={initialDelay + i * holdDelay} initialY={initialY} style={style}>
          {ch}
        </Fade>
      ))}
    </>
  );
}
