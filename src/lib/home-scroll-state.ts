import { makeMutable } from 'react-native-reanimated';

/** Survives DashboardScreen remount when switching tabs. */
export const homeScrollY = makeMutable(0);

/** Last offset for ScrollView.scrollTo on focus (JS thread). */
export let homeScrollOffsetJs = 0;

export function setHomeScrollOffsetJs(y: number) {
  homeScrollOffsetJs = y;
}

export function resetHomeScroll() {
  homeScrollY.value = 0;
  homeScrollOffsetJs = 0;
}

/** Wider bands — smoother header collapse on fast scroll (no spring). */
export const HOME_HEADER_RANGES = {
  bg: [0, 28, 80] as const,
  title: [44, 100] as const,
  largeTitle: [0, 64] as const,
  icons: [0, 32, 88, 132] as const,
} as const;
