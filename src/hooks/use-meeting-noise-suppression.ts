import {
  buildMeetingAudioCaptureOptions,
  resolveMobileNoiseSuppressionMode,
  type NoiseSuppressionMode,
} from '@/lib/meeting-audio';
import type { LocalParticipant } from 'livekit-client';
import { LocalAudioTrack, Track } from 'livekit-client';
import { useCallback } from 'react';

export async function applyMeetingNoiseSuppression(
  localParticipant: LocalParticipant,
  isMicrophoneEnabled: boolean,
  mode: NoiseSuppressionMode,
): Promise<NoiseSuppressionMode> {
  const effectiveMode = resolveMobileNoiseSuppressionMode(mode);
  const options = buildMeetingAudioCaptureOptions(mode);
  const publication = localParticipant.getTrackPublication(Track.Source.Microphone);
  const track = publication?.track;

  if (isMicrophoneEnabled && track instanceof LocalAudioTrack) {
    await track.restartTrack(options);
    return effectiveMode;
  }

  if (isMicrophoneEnabled) {
    await localParticipant.setMicrophoneEnabled(true, options);
  }

  return effectiveMode;
}

export function useMeetingNoiseSuppressionApplier(
  localParticipant: LocalParticipant,
  isMicrophoneEnabled: boolean,
) {
  return useCallback(
    async (mode: NoiseSuppressionMode): Promise<NoiseSuppressionMode> => {
      return applyMeetingNoiseSuppression(localParticipant, isMicrophoneEnabled, mode);
    },
    [localParticipant, isMicrophoneEnabled],
  );
}
