import { HeaderBlurBackground } from '@/components/header-blur-background';
import { useSemanticTheme } from '@/hooks/use-semantic-theme';
import { SigmaTypo } from '@/constants/sigma';
import { ArrowLeft01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { BlurTargetView } from 'expo-blur';
import { router } from 'expo-router';
import React, { useRef } from 'react';
import { Dimensions, Pressable, StatusBar, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_W } = Dimensions.get('window');

type Props = {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
  /** Show back button. Defaults to true */
  back?: boolean;
  contentPadding?: boolean;
};

/**
 * Унифицированный контейнер для sub-screens: большой заголовок, смена на
 * sticky blur header при скролле, кнопка назад, опционально — правый слот.
 */
export function ScreenShell({ title, subtitle, right, children, back = true, contentPadding = true }: Props) {
  const insets = useSafeAreaInsets();
  const c = useSemanticTheme();
  const blurTargetRef = useRef<View>(null);

  const scrollY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (e) => {
      scrollY.value = e.contentOffset.y;
    },
  });

  const HEADER_H = insets.top + 54;

  const headerBgStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [10, 50], [0, 1], Extrapolation.CLAMP),
  }));
  const headerTitleStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [30, 60], [0, 1], Extrapolation.CLAMP),
    transform: [{ translateY: interpolate(scrollY.value, [30, 60], [12, 0], Extrapolation.CLAMP) }],
  }));
  const largeTitleStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [0, 40], [1, 0], Extrapolation.CLAMP),
    transform: [
      { scale: interpolate(scrollY.value, [-50, 0, 40], [1.04, 1, 0.94], Extrapolation.CLAMP) },
      { translateY: interpolate(scrollY.value, [-1000, 0, 40], [-1000, 0, -10], Extrapolation.CLAMP) },
    ],
  }));

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <StatusBar barStyle={c.scheme === 'dark' ? 'light-content' : 'dark-content'} />

      <View style={[styles.fixedHeader, { height: HEADER_H, paddingTop: insets.top }]} pointerEvents="box-none">
        <Animated.View style={[StyleSheet.absoluteFill, headerBgStyle]} pointerEvents="none">
          <HeaderBlurBackground blurTargetRef={blurTargetRef} />
          <View style={[styles.headerBorder, { backgroundColor: c.border }]} />
        </Animated.View>

        <View style={styles.headerContent} pointerEvents="box-none">
          <View style={styles.headerLeft}>
            {back && (
              <Pressable style={styles.iconBtn} onPress={() => router.back()} hitSlop={10}>
                <HugeiconsIcon icon={ArrowLeft01Icon} size={22} color={c.foreground} strokeWidth={1.8} />
              </Pressable>
            )}
            <Animated.Text
              numberOfLines={1}
              style={[styles.headerTitleSmall, { color: c.foreground, maxWidth: SCREEN_W - 120 }, headerTitleStyle]}
            >
              {title}
            </Animated.Text>
          </View>
          {right && <View style={styles.headerRight}>{right}</View>}
        </View>
      </View>

      <BlurTargetView ref={blurTargetRef} style={StyleSheet.absoluteFill} collapsable={false}>
        <Animated.ScrollView
          onScroll={scrollHandler}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingTop: insets.top + 10,
            paddingBottom: insets.bottom + 100,
            paddingHorizontal: contentPadding ? 20 : 0,
          }}
        >
          <Animated.View style={[styles.largeTitleContainer, largeTitleStyle]}>
            <Text style={[styles.largeTitle, { color: c.foreground }]}>{title}</Text>
            {!!subtitle && <Text style={[styles.largeSubtitle, { color: c.muted }]}>{subtitle}</Text>}
          </Animated.View>

          {children}
        </Animated.ScrollView>
      </BlurTargetView>
    </View>
  );
}

const styles = StyleSheet.create({
  fixedHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
  },
  headerBorder: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
  },
  headerContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  headerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleSmall: {
    fontSize: SigmaTypo.headline,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
  largeTitleContainer: {
    marginBottom: 16,
    paddingRight: 60,
  },
  largeTitle: {
    fontSize: SigmaTypo.largeTitle,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  largeSubtitle: {
    marginTop: 4,
    fontSize: SigmaTypo.bodySmall,
    fontWeight: '500',
  },
});
