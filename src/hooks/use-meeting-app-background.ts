import { useLiveMeeting } from '@/contexts/live-meeting-context';
import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

/**
 * Keeps meeting session awareness when the app moves to background.
 * System PiP (Android enterPictureInPictureMode / iOS AVPictureInPicture) is not
 * wired yet — audio continues via LiveKit foreground service + AudioSession while
 * the JS runtime stays alive.
 */
export function useMeetingAppBackground() {
  const { enteredCall, isFloatVisible } = useLiveMeeting();
  const lastState = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    if (!enteredCall) return;

    const sub = AppState.addEventListener('change', (next) => {
      const wasActive = lastState.current === 'active';
      lastState.current = next;
      if (wasActive && next.match(/inactive|background/)) {
        // In-app float is hidden when app is backgrounded; call stays connected.
        if (__DEV__ && isFloatVisible) {
          console.log('[meeting] app backgrounded while in-call float active');
        }
      }
    });

    return () => sub.remove();
  }, [enteredCall, isFloatVisible]);
}
