import { useEffect, type RefObject } from 'react';
import { FlatList, Keyboard, Platform } from 'react-native';
import { useReanimatedKeyboardAnimation } from 'react-native-keyboard-controller';
import { useAnimatedStyle } from 'react-native-reanimated';

export const CHAT_PILL_HEIGHT = 64;

/** Positive keyboard overlap in px (0 when hidden). */
function keyboardOverlap(height: { value: number }): number {
  'worklet';
  return Math.max(0, -height.value);
}

export function useChatKeyboardInsets(bottomInset: number) {
  const { height } = useReanimatedKeyboardAnimation();
  const baseInset = Math.max(bottomInset, 12);

  const footerStyle = useAnimatedStyle(() => ({
    height: baseInset + CHAT_PILL_HEIGHT + keyboardOverlap(height),
  }));

  return { footerStyle, baseInset };
}

export function useScrollToEndOnKeyboardShow<T>(
  listRef: RefObject<FlatList<T> | null>,
) {
  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const showSub = Keyboard.addListener(showEvt, () => {
      requestAnimationFrame(() => {
        listRef.current?.scrollToEnd({ animated: true });
      });
    });
    return () => showSub.remove();
  }, [listRef]);
}
