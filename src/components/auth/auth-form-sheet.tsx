import {
  SHEET_SWITCH_IN_TIMING,
  SHEET_SWITCH_OUT_TIMING,
  SHEET_TIMING,
} from '@/components/auth/auth-animation';
import type { AuthMode } from '@/components/auth/auth-locales';
import {
  forwardRef,
  type ReactNode,
  useEffect,
  useImperativeHandle,
  useRef,
} from 'react';
import { Platform, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  interpolate,
  runOnJS,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const SHEET_RADIUS = 24;
const LOGIN_DEFAULT_HEIGHT_RATIO = 0.88;
const REGISTER_DEFAULT_HEIGHT_RATIO = 0.92;
const EXPANDED_HEIGHT_RATIO = 0.96;

export type SheetPhase = 'idle' | 'exiting' | 'entering';

export type AuthFormSheetHandle = {
  animateSwitch: (next: AuthMode) => void;
  getPhase: () => SheetPhase;
};

type Props = {
  expanded: boolean;
  /** When provided, sheet height tracks this value (0 = default, 1 = expanded). */
  focusProgress?: SharedValue<number>;
  defaultHeightRatio: number;
  sheetBackground: string;
  borderColor: string;
  onSwitchStart?: () => void;
  onSwitchComplete?: (mode: AuthMode) => void;
  children: ReactNode;
};

export const AuthFormSheet = forwardRef<AuthFormSheetHandle, Props>(function AuthFormSheet(
  {
    expanded,
    focusProgress,
    defaultHeightRatio,
    sheetBackground,
    borderColor,
    onSwitchStart,
    onSwitchComplete,
    children,
  },
  ref,
) {
  const { height: screenH } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const heightT = useSharedValue(0);
  const defaultRatioT = useSharedValue(defaultHeightRatio);
  /** 0 = seated, 1 = fully below viewport (one sheet height). */
  const switchSlide = useSharedValue(0);
  const pendingMode = useRef<AuthMode | null>(null);
  const phaseRef = useRef<SheetPhase>('idle');

  useEffect(() => {
    if (focusProgress || phaseRef.current !== 'idle') return;
    heightT.value = withTiming(expanded ? 1 : 0, SHEET_TIMING);
  }, [expanded, focusProgress, heightT]);

  useEffect(() => {
    if (phaseRef.current !== 'idle') return;
    defaultRatioT.value = withTiming(defaultHeightRatio, SHEET_TIMING);
  }, [defaultHeightRatio, defaultRatioT]);

  const beginEnter = () => {
    const next = pendingMode.current;
    if (!next) {
      phaseRef.current = 'idle';
      switchSlide.value = 0;
      return;
    }

    phaseRef.current = 'entering';
    const nextRatio =
      next === 'login' ? LOGIN_DEFAULT_HEIGHT_RATIO : REGISTER_DEFAULT_HEIGHT_RATIO;
    onSwitchComplete?.(next);
    defaultRatioT.value = withTiming(nextRatio, SHEET_SWITCH_IN_TIMING);
    switchSlide.value = withTiming(0, SHEET_SWITCH_IN_TIMING, (finished) => {
      if (finished) {
        runOnJS(finishEnter)();
      }
    });
  };

  const finishEnter = () => {
    phaseRef.current = 'idle';
    pendingMode.current = null;
  };

  const onExitFinished = () => {
    beginEnter();
  };

  useImperativeHandle(ref, () => ({
    animateSwitch(next: AuthMode) {
      if (phaseRef.current !== 'idle') return;
      phaseRef.current = 'exiting';
      pendingMode.current = next;
      onSwitchStart?.();
      switchSlide.value = withTiming(1, SHEET_SWITCH_OUT_TIMING, (finished) => {
        if (finished) {
          runOnJS(onExitFinished)();
        }
      });
    },
    getPhase: () => phaseRef.current,
  }));

  const sheetAnim = useAnimatedStyle(() => {
    const defaultH = screenH * defaultRatioT.value;
    const expandedH = screenH * EXPANDED_HEIGHT_RATIO - insets.top;
    const expandT = focusProgress ? focusProgress.value : heightT.value;
    const h = interpolate(expandT, [0, 1], [defaultH, expandedH]);
    const translateY = switchSlide.value * h;
    const opacity = interpolate(switchSlide.value, [0, 0.85, 1], [1, 0.92, 0.88]);
    return {
      height: h,
      transform: [{ translateY }],
      opacity,
    };
  });

  return (
    <Animated.View
      style={[
        styles.sheet,
        {
          backgroundColor: sheetBackground,
          borderColor,
          paddingBottom: Math.max(insets.bottom, 16),
        },
        sheetAnim,
      ]}
    >
      <View style={styles.handleRow}>
        <View style={[styles.handle, { backgroundColor: borderColor }]} />
      </View>
      <View style={styles.body}>{children}</View>
    </Animated.View>
  );
});

export const AUTH_SHEET = {
  radius: SHEET_RADIUS,
  loginDefaultRatio: LOGIN_DEFAULT_HEIGHT_RATIO,
  registerDefaultRatio: REGISTER_DEFAULT_HEIGHT_RATIO,
  expandedRatio: EXPANDED_HEIGHT_RATIO,
} as const;

const styles = StyleSheet.create({
  sheet: {
    alignSelf: 'stretch',
    flexShrink: 0,
    width: '100%',
    borderTopLeftRadius: SHEET_RADIUS,
    borderTopRightRadius: SHEET_RADIUS,
    borderWidth: StyleSheet.hairlineWidth,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -8 },
        shadowOpacity: 0.35,
        shadowRadius: 24,
      },
      android: { elevation: 12 },
    }),
    overflow: 'hidden',
    zIndex: 8,
    elevation: 12,
  },
  handleRow: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 4,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    opacity: 0.55,
  },
  body: {
    flex: 1,
    minHeight: 0,
  },
});
