import { APPLE_EASE, SHEET_TIMING } from '@/components/auth/auth-animation';
import { Image } from 'expo-image';
import { memo, useEffect } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, {
  FadeIn,
  interpolate,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

/** Compact header row — matches former AuthBrandHeader. */
export const AUTH_BRAND_COMPACT = {
  logoSize: 52,
  logoRadius: 14,
  fontSize: 22,
  letterSpacing: 2.2,
  gap: 14,
  padH: 24,
  padTop: 16,
} as const;

const HERO_SCALE = 88 / AUTH_BRAND_COMPACT.logoSize;
const HERO_CARD_W = 220;
const HERO_CARD_H = 132;
const HERO_LOGO_SIZE = 88;
const HERO_LOGO_RADIUS = 24;
const HERO_NAME_TOP = 102;
const HERO_NAME_FONT = 26;
const HERO_NAME_TRACKING = 3.1;

type Props = {
  /** 0 = hero center (large), 1 = top-left header (compact). */
  focusProgress?: SharedValue<number>;
  /** When focusProgress is omitted, driven by this boolean. */
  focused?: boolean;
  topInset: number;
  titleColor: string;
  heroWidth: number;
  heroHeight: number;
  /** Y offset of the hero zone within the screen root (for overlay positioning). */
  heroOffsetY?: number;
};

export const AuthHeroBrand = memo(function AuthHeroBrand({
  focusProgress: focusProgressProp,
  focused = false,
  topInset,
  titleColor,
  heroWidth,
  heroHeight,
  heroOffsetY = 0,
}: Props) {
  const { width: screenW, height: screenH } = useWindowDimensions();
  const internalProgress = useSharedValue(focused ? 1 : 0);
  const focusProgress = focusProgressProp ?? internalProgress;

  useEffect(() => {
    if (focusProgressProp) return;
    internalProgress.value = withTiming(focused ? 1 : 0, SHEET_TIMING);
  }, [focused, focusProgressProp, internalProgress]);

  const safeHeroWidth = heroWidth > 0 ? heroWidth : screenW;
  const safeHeroHeight = heroHeight > 0 ? heroHeight : screenH * 0.42;
  const heroCx = safeHeroWidth * 0.5;
  const heroCy = heroOffsetY + safeHeroHeight * 0.47;
  const heroLeft = heroCx - HERO_CARD_W * 0.5;
  const heroTop = heroCy - HERO_CARD_H * 0.5;
  const headerLeft = AUTH_BRAND_COMPACT.padH;
  const headerTop = topInset + AUTH_BRAND_COMPACT.padTop;

  const heroBrandStyle = useAnimatedStyle(() => {
    const p = focusProgress.value;

    return {
      left: interpolate(p, [0, 1], [heroLeft, headerLeft - 24]),
      top: interpolate(p, [0, 1], [heroTop, headerTop - 18]),
      opacity: interpolate(p, [0, 0.72, 1], [1, 0.35, 0]),
      transform: [{ scale: interpolate(p, [0, 1], [1, 0.78]) }],
    };
  });

  const compactBrandStyle = useAnimatedStyle(() => {
    const p = focusProgress.value;

    return {
      left: interpolate(p, [0, 1], [heroCx - 92, headerLeft]),
      top: interpolate(p, [0, 1], [heroCy - 31, headerTop]),
      opacity: interpolate(p, [0, 0.32, 1], [0, 0.2, 1]),
      transform: [{ scale: interpolate(p, [0, 1], [HERO_SCALE, 1]) }],
    };
  });

  return (
    <View style={styles.layer} pointerEvents="none">
      <Animated.View
        entering={FadeIn.duration(400).easing(APPLE_EASE)}
        style={[styles.heroBrand, heroBrandStyle]}
      >
        <Image
          source={require('@/assets/images/logo.png')}
          style={styles.heroLogo}
          contentFit="contain"
        />
        <Text style={[styles.heroName, { color: titleColor }]}>Julow</Text>
      </Animated.View>

      <Animated.View
        entering={FadeIn.duration(400).easing(APPLE_EASE)}
        style={[styles.compactBrand, compactBrandStyle]}
      >
        <View style={styles.row}>
          <Image
            source={require('@/assets/images/logo.png')}
            style={styles.logo}
            contentFit="contain"
          />
          <Text style={[styles.name, { color: titleColor }]}>Julow</Text>
        </View>
      </Animated.View>
    </View>
  );
});

const styles = StyleSheet.create({
  layer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'visible',
    zIndex: 20,
    elevation: 20,
  },
  heroBrand: {
    position: 'absolute',
    width: HERO_CARD_W,
    height: HERO_CARD_H,
    alignItems: 'center',
  },
  heroLogo: {
    width: HERO_LOGO_SIZE,
    height: HERO_LOGO_SIZE,
    borderRadius: HERO_LOGO_RADIUS,
  },
  heroName: {
    position: 'absolute',
    top: HERO_NAME_TOP,
    width: HERO_CARD_W,
    textAlign: 'center',
    fontSize: HERO_NAME_FONT,
    fontWeight: '900',
    letterSpacing: HERO_NAME_TRACKING,
  },
  compactBrand: {
    position: 'absolute',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AUTH_BRAND_COMPACT.gap,
  },
  logo: {
    width: AUTH_BRAND_COMPACT.logoSize,
    height: AUTH_BRAND_COMPACT.logoSize,
    borderRadius: AUTH_BRAND_COMPACT.logoRadius,
  },
  name: {
    fontSize: AUTH_BRAND_COMPACT.fontSize,
    fontWeight: '900',
    letterSpacing: AUTH_BRAND_COMPACT.letterSpacing,
  },
});
