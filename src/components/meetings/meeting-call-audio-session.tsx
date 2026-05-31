import { AudioSession } from '@livekit/react-native';
import { useEffect } from 'react';

/** Keeps WebRTC audio session active while in a call (room or PiP). */
export function MeetingCallAudioSession() {
  useEffect(() => {
    void AudioSession.startAudioSession();
    return () => {
      void AudioSession.stopAudioSession();
    };
  }, []);
  return null;
}
