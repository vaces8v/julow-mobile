import {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated';

type CollapsibleHeaderStyleOptions = {
  /** Home screen: icons slide in from the right as the header collapses. */
  iconsRestX?: number;
};

/** Snap-driven animated styles shared by all collapsible header screens. */
export function useCollapsibleHeaderStyles(
  headerProgress: SharedValue<number>,
  options?: CollapsibleHeaderStyleOptions,
) {
  const iconsRestX = options?.iconsRestX;

  const headerBgStyle = useAnimatedStyle(() => ({
    opacity: headerProgress.value,
  }));

  const smallTitleStyle = useAnimatedStyle(() => ({
    opacity: headerProgress.value,
    transform: [
      {
        translateY: interpolate(headerProgress.value, [0, 1], [12, 0], Extrapolation.CLAMP),
      },
    ],
  }));

  const largeTitleStyle = useAnimatedStyle(() => ({
    opacity: interpolate(headerProgress.value, [0, 1], [1, 0], Extrapolation.CLAMP),
    transform: [
      {
        translateX: interpolate(headerProgress.value, [0, 1], [0, -48], Extrapolation.CLAMP),
      },
      {
        scale: interpolate(headerProgress.value, [0, 1], [1, 0.94], Extrapolation.CLAMP),
      },
      {
        translateY: interpolate(headerProgress.value, [0, 1], [0, -10], Extrapolation.CLAMP),
      },
    ],
  }));

  const headerActionStyle = useAnimatedStyle(() => ({
    opacity: headerProgress.value,
  }));

  const leftIconsStyle = useAnimatedStyle(() => {
    if (iconsRestX == null) return {};
    return {
      transform: [
        {
          translateX: interpolate(
            headerProgress.value,
            [0, 1],
            [iconsRestX, 0],
            Extrapolation.CLAMP,
          ),
        },
      ],
    };
  });

  return {
    headerBgStyle,
    smallTitleStyle,
    largeTitleStyle,
    headerActionStyle,
    leftIconsStyle,
  };
}
