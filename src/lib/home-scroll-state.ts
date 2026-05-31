import { Easing } from 'react-native-reanimated';

/** Scroll offset at which the header snaps to collapsed (1) vs expanded (0). */
export const COLLAPSIBLE_HEADER_THRESHOLD = 40;

export const HEADER_SNAP_TIMING = {
  duration: 280,
  easing: Easing.bezier(0.25, 0.1, 0.25, 1),
} as const;
