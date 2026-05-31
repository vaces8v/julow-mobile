import AsyncStorage from '@react-native-async-storage/async-storage';

import type { AudioCaptureOptions, RoomOptions } from 'livekit-client';

import { VideoPresets } from 'livekit-client';



/**

 * DeepFilterNet (Rikorose) — dual-licensed Apache-2.0 OR MIT; safe for commercial use.

 * Mobile does not run DeepFilterNet WASM yet — `deepfilter` maps to WebRTC NS.

 * @see https://github.com/Rikorose/DeepFilterNet/blob/main/LICENSE

 */

export type NoiseSuppressionMode = 'deepfilter' | 'webrtc' | 'off';



export const MEETING_NOISE_SUPPRESSION_MODE_KEY = 'julow.meeting.noiseSuppressionMode';



/** @deprecated Legacy boolean storage key (migrated on read). */

export const MEETING_NOISE_SUPPRESSION_STORAGE_KEY = 'julow.meeting.noiseSuppression';



export const DEFAULT_MEETING_NOISE_SUPPRESSION_MODE: NoiseSuppressionMode = 'webrtc';



export function isNoiseSuppressionEnabled(mode: NoiseSuppressionMode): boolean {

  return mode !== 'off';

}



export function modeFromToggleEnabled(

  enabled: boolean,

  platform: 'web' | 'mobile' = 'mobile',

): NoiseSuppressionMode {

  if (!enabled) return 'off';

  return platform === 'web' ? 'deepfilter' : 'webrtc';

}



export function resolveDefaultNoiseSuppressionMode(

  platform: 'web' | 'mobile' = 'mobile',

  serverHint?: string | null,

): NoiseSuppressionMode {

  const hint = serverHint?.trim().toLowerCase();

  if (hint === 'off' || hint === 'none') return 'off';

  if (platform === 'web') {

    return hint === 'webrtc' ? 'webrtc' : 'deepfilter';

  }

  return 'webrtc';

}



export function parseStoredNoiseSuppressionMode(

  raw: string | null,

  platform: 'web' | 'mobile' = 'mobile',

  serverHint?: string | null,

): NoiseSuppressionMode {

  if (raw === 'deepfilter' || raw === 'webrtc' || raw === 'off') {

    return raw;

  }



  if (raw === '1' || raw === 'true') {

    return platform === 'web' ? 'deepfilter' : 'webrtc';

  }

  if (raw === '0' || raw === 'false') {

    return 'off';

  }



  return resolveDefaultNoiseSuppressionMode(platform, serverHint);

}



/** Maps requested mode to what RN can actually apply. */

export function resolveMobileNoiseSuppressionMode(

  mode: NoiseSuppressionMode,

): NoiseSuppressionMode {

  if (mode === 'deepfilter') return 'webrtc';

  return mode;

}



export function buildMeetingAudioCaptureOptions(

  mode: NoiseSuppressionMode,

): AudioCaptureOptions {

  const effectiveMode = resolveMobileNoiseSuppressionMode(mode);

  return {

    autoGainControl: true,

    echoCancellation: true,

    noiseSuppression: effectiveMode === 'webrtc',

  };

}



export function buildMeetingRoomOptions(
  mode: NoiseSuppressionMode,
  iceServers?: RTCIceServer[],
): RoomOptions {

  return {

    adaptiveStream: true,

    dynacast: true,

    disconnectOnPageLeave: false,

    audioCaptureDefaults: buildMeetingAudioCaptureOptions(mode),

    publishDefaults: {

      videoEncoding: VideoPresets.h540.encoding,

      videoSimulcastLayers: [VideoPresets.h216],

      simulcast: true,

      degradationPreference: 'balanced' as const,

    },

    videoCaptureDefaults: {

      resolution: VideoPresets.h540.resolution,

    },

    ...(iceServers?.length ? { rtcConfig: { iceServers } } : {}),

  };

}



export type IceServerPayload = {

  urls: string | string[];

  username?: string;

  credential?: string;

};



export function mapJoinIceServers(

  servers?: IceServerPayload[] | null,

): RTCIceServer[] | undefined {

  if (!servers?.length) return undefined;

  return servers.map((server) => ({

    urls: server.urls,

    username: server.username,

    credential: server.credential,

  }));

}



export async function loadMeetingNoiseSuppressionMode(

  serverHint?: string | null,

): Promise<NoiseSuppressionMode> {

  try {

    const modeRaw = await AsyncStorage.getItem(MEETING_NOISE_SUPPRESSION_MODE_KEY);

    if (modeRaw !== null) {

      return parseStoredNoiseSuppressionMode(modeRaw, 'mobile', serverHint);

    }



    const legacyRaw = await AsyncStorage.getItem(MEETING_NOISE_SUPPRESSION_STORAGE_KEY);

    return parseStoredNoiseSuppressionMode(legacyRaw, 'mobile', serverHint);

  } catch {

    return resolveDefaultNoiseSuppressionMode('mobile', serverHint);

  }

}



export async function saveMeetingNoiseSuppressionMode(mode: NoiseSuppressionMode): Promise<void> {

  try {

    await AsyncStorage.setItem(MEETING_NOISE_SUPPRESSION_MODE_KEY, mode);

  } catch {

    // non-critical preference

  }

}



/** @deprecated Use loadMeetingNoiseSuppressionMode instead. */

export async function loadMeetingNoiseSuppressionPreference(): Promise<boolean> {

  const mode = await loadMeetingNoiseSuppressionMode();

  return isNoiseSuppressionEnabled(mode);

}



/** @deprecated Use saveMeetingNoiseSuppressionMode instead. */

export async function saveMeetingNoiseSuppressionPreference(enabled: boolean): Promise<void> {

  await saveMeetingNoiseSuppressionMode(modeFromToggleEnabled(enabled, 'mobile'));

}

