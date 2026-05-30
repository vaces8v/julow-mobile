import {
  APPLE_EASE,
  HERO_FADE_MS,
  HERO_TAGLINE_INTERVAL_MS,
  HERO_TAGLINE_REVEAL_IN_MS,
  HERO_TAGLINE_REVEAL_OUT_MS,
  HERO_TAGLINE_SWEEP_DELAY_MS,
  HERO_TAGLINE_SWEEP_MS,
} from '@/components/auth/auth-animation';
import { LinearGradient } from 'expo-linear-gradient';
import { memo, useCallback, useEffect, useState } from 'react';
import { type LayoutChangeEvent, StyleSheet, Text } from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

type Props = {
  taglines: string[];
  visible: boolean;
  textColor: string;
  /** Accent colour used for the soft premium glow behind the text. */
  glowColor: string;
};

/** Width of the travelling light band. */
const SWEEP_W = 120;
/** How far past each edge the band travels so it fully clears the text. */
const SWEEP_OVERSHOOT = 140;

function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  if (h.length < 6) return `rgba(255,255,255,${alpha})`;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export const AuthHeroTaglines = memo(function AuthHeroTaglines({
  taglines,
  visible,
  textColor,
  glowColor,
}: Props) {
  const reducedMotion = useReducedMotion();
  const [index, setIndex] = useState(0);

  const containerOpacity = useSharedValue(1);
  /** 0 = hidden/off-stage left, 1 = fully revealed. */
  const reveal = useSharedValue(reducedMotion ? 1 : 0);
  /** 0 = band off-stage left, 1 = band cleared off-stage right. */
  const sweep = useSharedValue(1);
  /** Measured text box width — drives the sweep travel distance. */
  const textW = useSharedValue(0);

  const advance = useCallback(() => {
    setIndex((i) => (i + 1) % taglines.length);
  }, [taglines.length]);

  const playReveal = useCallback(() => {
    if (reducedMotion) {
      reveal.value = 1;
      return;
    }
    reveal.value = withTiming(1, { duration: HERO_TAGLINE_REVEAL_IN_MS, easing: APPLE_EASE });
    sweep.value = 0;
    sweep.value = withDelay(
      HERO_TAGLINE_SWEEP_DELAY_MS,
      withTiming(1, { duration: HERO_TAGLINE_SWEEP_MS, easing: APPLE_EASE }),
    );
  }, [reducedMotion, reveal, sweep]);

  // Fade the whole layer in/out alongside the ambient art.
  useEffect(() => {
    containerOpacity.value = withTiming(visible ? 1 : 0, {
      duration: HERO_FADE_MS,
      easing: APPLE_EASE,
    });
  }, [visible, containerOpacity]);

  // Reset to the first phrase and replay the reveal whenever the copy changes.
  useEffect(() => {
    setIndex(0);
    reveal.value = reducedMotion ? 1 : 0;
    if (visible) playReveal();
  }, [taglines, visible, reducedMotion, reveal, playReveal]);

  // Cyclic liquid loop: flow current phrase out, swap, flow the next one in.
  useEffect(() => {
    if (reducedMotion || taglines.length <= 1 || !visible) return;

    const id = setInterval(() => {
      reveal.value = withTiming(
        0,
        { duration: HERO_TAGLINE_REVEAL_OUT_MS, easing: APPLE_EASE },
        (finished) => {
          if (!finished) return;
          runOnJS(advance)();
          runOnJS(playReveal)();
        },
      );
    }, HERO_TAGLINE_INTERVAL_MS);

    return () => clearInterval(id);
  }, [taglines.length, visible, reducedMotion, reveal, advance, playReveal]);

  const onTextLayout = useCallback(
    (e: LayoutChangeEvent) => {
      textW.value = e.nativeEvent.layout.width;
    },
    [textW],
  );

  const containerStyle = useAnimatedStyle(() => ({ opacity: containerOpacity.value }));

  // Phrase flows in from the left with a gentle fade — the "liquid" entrance.
  const revealStyle = useAnimatedStyle(() => ({
    opacity: reveal.value,
    transform: [{ translateX: (1 - reveal.value) * -16 }],
  }));

  // A soft light band travels across the text once per phrase.
  const sweepStyle = useAnimatedStyle(() => {
    const travel = textW.value + SWEEP_OVERSHOOT * 2;
    return {
      opacity: sweep.value <= 0 || sweep.value >= 1 ? 0 : 1,
      transform: [{ translateX: -SWEEP_OVERSHOOT + sweep.value * travel }],
    };
  });

  if (taglines.length === 0) return null;

  const label = taglines[index] ?? taglines[0];

  return (
    <Animated.View
      style={[styles.wrap, containerStyle]}
      pointerEvents={visible ? 'auto' : 'none'}
      accessibilityLiveRegion="polite"
    >
      <Animated.View style={[styles.revealBox, revealStyle]} onLayout={onTextLayout}>
        <Text
          style={[
            styles.text,
            {
              color: textColor,
              textShadowColor: hexToRgba(glowColor, 0.45),
            },
          ]}
          numberOfLines={2}
        >
          {label}
        </Text>
        <Animated.View pointerEvents="none" style={[styles.sweep, sweepStyle]}>
          <LinearGradient
            colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.32)', 'rgba(255,255,255,0)']}
            locations={[0, 0.5, 1]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      </Animated.View>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  // Pinned to the hero zone (inset 0) and centred so the text sits dead-centre
  // over the radial ambient art, sharing its exact coordinate space.
  wrap: {
    ...StyleSheet.absoluteFillObject,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  revealBox: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  text: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
    lineHeight: 26,
    textAlign: 'center',
    includeFontPadding: false,
    textAlignVertical: 'center',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 16,
  },
  sweep: {
    position: 'absolute',
    top: -4,
    bottom: -4,
    left: 0,
    width: SWEEP_W,
  },
});
