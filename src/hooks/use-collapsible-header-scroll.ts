import { useFocusEffect } from 'expo-router';
import { useCallback, useLayoutEffect, useRef } from 'react';
import type Animated from 'react-native-reanimated';
import {
  makeMutable,
  runOnJS,
  useAnimatedScrollHandler,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import {
  COLLAPSIBLE_HEADER_THRESHOLD,
  HEADER_SNAP_TIMING,
} from '@/lib/home-scroll-state';

type PersistedScrollUi = {
  scrollY: SharedValue<number>;
  headerProgress: SharedValue<number>;
  snapTarget: SharedValue<number>;
  restoring: SharedValue<number>;
};

/** JS-thread only — never capture this object in worklets. */
type PersistedScrollJs = {
  offsetJs: number;
  restoreTargetY: number;
};

type PersistedScroll = {
  ui: PersistedScrollUi;
  js: PersistedScrollJs;
};

const store = new Map<string, PersistedScroll>();

function getPersistedScroll(screenKey: string): PersistedScroll {
  let entry = store.get(screenKey);
  if (!entry) {
    entry = {
      ui: {
        scrollY: makeMutable(0),
        headerProgress: makeMutable(0),
        snapTarget: makeMutable(0),
        restoring: makeMutable(0),
      },
      js: {
        offsetJs: 0,
        restoreTargetY: 0,
      },
    };
    store.set(screenKey, entry);
  }
  return entry;
}

function snapHeaderProgress(
  progress: SharedValue<number>,
  snapTarget: SharedValue<number>,
  y: number,
) {
  'worklet';
  const target = y >= COLLAPSIBLE_HEADER_THRESHOLD ? 1 : 0;
  if (snapTarget.value !== target) {
    snapTarget.value = target;
    progress.value = withTiming(target, HEADER_SNAP_TIMING);
  }
}

function finishHeaderSnap(
  progress: SharedValue<number>,
  snapTarget: SharedValue<number>,
  y: number,
) {
  'worklet';
  const target = y >= COLLAPSIBLE_HEADER_THRESHOLD ? 1 : 0;
  snapTarget.value = target;
  progress.value = withTiming(target, HEADER_SNAP_TIMING);
}

function syncHeaderProgressImmediate(ui: PersistedScrollUi, y: number) {
  const target = y >= COLLAPSIBLE_HEADER_THRESHOLD ? 1 : 0;
  ui.snapTarget.value = target;
  ui.headerProgress.value = target;
}

/** Persisted scroll offset + snap-based collapsible header for animated headers. */
export function useCollapsibleHeaderScroll(screenKey: string) {
  const scrollRef = useRef<Animated.ScrollView>(null);
  const persisted = useRef(getPersistedScroll(screenKey)).current;
  const { ui, js } = persisted;

  const applyScroll = useCallback(
    (y: number) => {
      if (ui.restoring.value && y === 0 && js.restoreTargetY > 1) return;
      ui.scrollY.value = y;
      js.offsetJs = y;
    },
    [ui, js],
  );

  const finishRestore = useCallback(
    (y: number) => {
      ui.scrollY.value = y;
      js.offsetJs = y;
      syncHeaderProgressImmediate(ui, y);
      ui.restoring.value = 0;
      js.restoreTargetY = 0;
    },
    [ui, js],
  );

  useLayoutEffect(() => {
    syncHeaderProgressImmediate(ui, js.offsetJs);
  }, [screenKey, ui, js]);

  useFocusEffect(
    useCallback(() => {
      const y = js.offsetJs;
      ui.restoring.value = 1;
      js.restoreTargetY = y;
      ui.scrollY.value = y;
      syncHeaderProgressImmediate(ui, y);

      if (y > 1) {
        requestAnimationFrame(() => {
          scrollRef.current?.scrollTo({ y, animated: false });
          requestAnimationFrame(() => {
            finishRestore(y);
          });
        });
      } else {
        finishRestore(0);
      }

      return () => {
        ui.restoring.value = 0;
        js.restoreTargetY = 0;
      };
    }, [ui, js, finishRestore]),
  );

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (e) => {
      const y = e.contentOffset.y;
      runOnJS(applyScroll)(y);
      if (!ui.restoring.value) {
        snapHeaderProgress(ui.headerProgress, ui.snapTarget, y);
      }
    },
    onEndDrag: (e) => {
      if (!ui.restoring.value) {
        finishHeaderSnap(ui.headerProgress, ui.snapTarget, e.contentOffset.y);
      }
    },
    onMomentumScrollEnd: (e) => {
      if (!ui.restoring.value) {
        finishHeaderSnap(ui.headerProgress, ui.snapTarget, e.contentOffset.y);
      }
    },
  });

  const resetScroll = useCallback(() => {
    ui.restoring.value = 0;
    js.restoreTargetY = 0;
    ui.scrollY.value = 0;
    js.offsetJs = 0;
    ui.snapTarget.value = 0;
    ui.headerProgress.value = withTiming(0, HEADER_SNAP_TIMING);
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  }, [ui, js]);

  return {
    scrollRef,
    scrollY: ui.scrollY,
    headerProgress: ui.headerProgress,
    scrollHandler,
    resetScroll,
  };
}
