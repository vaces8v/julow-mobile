import { Easing, type WithSpringConfig, type WithTimingConfig } from 'react-native-reanimated';

/** Apple-style ease-in-out curve (CSS ease). */
export const APPLE_EASE = Easing.bezier(0.25, 0.1, 0.25, 1);

export const AUTH_ENTER_MS = 320;
export const AUTH_EXIT_MS = 240;
export const AUTH_ENTER_TRANSLATE_Y = 10;

export const SHEET_EXPAND_MS = 320;
export const SHEET_SWITCH_OUT_MS = 280;
export const SHEET_SWITCH_IN_MS = 300;

export const HERO_FADE_MS = 280;
export const HERO_TAGLINE_INTERVAL_MS = 4000;
export const HERO_TAGLINE_CROSSFADE_MS = 400;

/** Liquid text reveal: phrase flows in, a light sweep passes, then flows out. */
export const HERO_TAGLINE_REVEAL_IN_MS = 620;
export const HERO_TAGLINE_REVEAL_OUT_MS = 380;
export const HERO_TAGLINE_SWEEP_MS = 960;
export const HERO_TAGLINE_SWEEP_DELAY_MS = 120;

export const SHEET_TIMING: WithTimingConfig = {
  duration: SHEET_EXPAND_MS,
  easing: APPLE_EASE,
};

export const SHEET_SWITCH_OUT_TIMING: WithTimingConfig = {
  duration: SHEET_SWITCH_OUT_MS,
  easing: APPLE_EASE,
};

export const SHEET_SWITCH_IN_TIMING: WithTimingConfig = {
  duration: SHEET_SWITCH_IN_MS,
  easing: APPLE_EASE,
};

/** Gentle spring — only when a spring is truly needed; clamp overshoot. */
export const AUTH_SPRING: WithSpringConfig = {
  damping: 32,
  stiffness: 150,
  mass: 1,
  overshootClamping: true,
};
