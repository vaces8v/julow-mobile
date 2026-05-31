import { LiveMeetingSession } from '@/components/meetings/live-meeting-session';

import { api } from '@/lib/api';

import {
  isNoiseSuppressionEnabled,
  loadMeetingNoiseSuppressionMode,
  modeFromToggleEnabled,
  resolveDefaultNoiseSuppressionMode,
  saveMeetingNoiseSuppressionMode,
  type NoiseSuppressionMode,
} from '@/lib/meeting-audio';

import { resolveLiveKitUrl } from '@/lib/resolve-livekit-url';

import { usePathname } from 'expo-router';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

export type LiveMeetingContextValue = {
  meetingId: string | null;
  meetingTitle: string;
  token: string | null;
  serverUrl: string;
  enteredCall: boolean;
  isInRoomScreen: boolean;
  micEnabled: boolean;
  camEnabled: boolean;
  noiseSuppressionMode: NoiseSuppressionMode;
  /** External coturn ICE servers from join API (optional). */
  iceServers?: RTCIceServer[];
  /** Convenience flag for UI toggles (`mode !== 'off'`). */
  noiseSuppressionEnabled: boolean;
  isFloatVisible: boolean;
  join: (meetingId: string) => Promise<boolean>;
  leave: () => void;
  enterCall: () => void;
  setMeetingTitle: (title: string) => void;
  setMicEnabled: (enabled: boolean) => void;
  setCamEnabled: (enabled: boolean) => void;
  setNoiseSuppressionMode: (mode: NoiseSuppressionMode) => void;
  setNoiseSuppressionEnabled: (enabled: boolean) => void;
};

const LiveMeetingCtx = createContext<LiveMeetingContextValue>({
  meetingId: null,
  meetingTitle: '',
  token: null,
  serverUrl: resolveLiveKitUrl(),
  enteredCall: false,
  isInRoomScreen: false,
  micEnabled: false,
  camEnabled: false,
  noiseSuppressionMode: 'webrtc',
  iceServers: undefined,
  noiseSuppressionEnabled: true,
  isFloatVisible: false,
  join: async () => false,
  leave: () => {},
  enterCall: () => {},
  setMeetingTitle: () => {},
  setMicEnabled: () => {},
  setCamEnabled: () => {},
  setNoiseSuppressionMode: () => {},
  setNoiseSuppressionEnabled: () => {},
});

export function LiveMeetingProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const [meetingId, setMeetingId] = useState<string | null>(null);
  const [meetingTitle, setMeetingTitle] = useState('');
  const [token, setToken] = useState<string | null>(null);
  const [serverUrl, setServerUrl] = useState(resolveLiveKitUrl());
  const [iceServers, setIceServers] = useState<RTCIceServer[] | undefined>();
  const [enteredCall, setEnteredCall] = useState(false);
  const [micEnabled, setMicEnabled] = useState(false);
  const [camEnabled, setCamEnabled] = useState(false);
  const [noiseSuppressionMode, setNoiseSuppressionMode] = useState<NoiseSuppressionMode>(
    resolveDefaultNoiseSuppressionMode('mobile'),
  );

  const intentionalLeaveRef = useRef(false);
  const serverNoiseHintRef = useRef<string | null>(null);

  useEffect(() => {
    void loadMeetingNoiseSuppressionMode(serverNoiseHintRef.current).then(setNoiseSuppressionMode);
  }, []);

  const isInRoomScreen = Boolean(
    meetingId &&
      (pathname === `/meetings/${meetingId}/room` ||
        pathname === `/meetings/${meetingId}/chat`),
  );

  const join = useCallback(async (id: string) => {
    if (id === meetingId && token) return true;

    try {
      const res = await api.joinMeeting(id);
      if (!res.accessToken) return false;

      serverNoiseHintRef.current = res.audioNoiseFilter ?? null;
      intentionalLeaveRef.current = false;
      setMeetingId(id);
      setToken(res.accessToken);
      setIceServers(res.iceServers);

      const raw = res.joinUrl?.trim();
      const ws =
        raw?.startsWith('ws://') || raw?.startsWith('wss://') ? raw : resolveLiveKitUrl();
      setServerUrl(ws);

      const storedMode = await loadMeetingNoiseSuppressionMode(res.audioNoiseFilter);
      setNoiseSuppressionMode(storedMode);
      return true;
    } catch (e) {
      console.error('[live-meeting] join failed', e);
      return false;
    }
  }, [meetingId, token]);

  const leave = useCallback(() => {
    intentionalLeaveRef.current = true;
    setMeetingId(null);
    setMeetingTitle('');
    setToken(null);
    setServerUrl(resolveLiveKitUrl());
    setIceServers(undefined);
    setEnteredCall(false);
    setMicEnabled(false);
    setCamEnabled(false);
  }, []);

  const enterCall = useCallback(() => {
    setEnteredCall(true);
  }, []);

  const setNoiseSuppression = useCallback((mode: NoiseSuppressionMode) => {
    setNoiseSuppressionMode(mode);
    void saveMeetingNoiseSuppressionMode(mode);
  }, []);

  const setNoiseSuppressionEnabled = useCallback(
    (enabled: boolean) => {
      setNoiseSuppression(modeFromToggleEnabled(enabled, 'mobile'));
    },
    [setNoiseSuppression],
  );

  const handleDisconnected = useCallback(() => {
    if (intentionalLeaveRef.current) {
      intentionalLeaveRef.current = false;
      return;
    }

    // Keep token/meetingId so the user stays on the room route and can retry from pre-join.
    setEnteredCall(false);
  }, []);

  const noiseSuppressionEnabled = isNoiseSuppressionEnabled(noiseSuppressionMode);
  const isFloatVisible = Boolean(meetingId && token && enteredCall && !isInRoomScreen);

  const value = useMemo<LiveMeetingContextValue>(
    () => ({
      meetingId,
      meetingTitle,
      token,
      serverUrl,
      enteredCall,
      isInRoomScreen,
      micEnabled,
      camEnabled,
      noiseSuppressionMode,
      iceServers,
      noiseSuppressionEnabled,
      isFloatVisible,
      join,
      leave,
      enterCall,
      setMeetingTitle,
      setMicEnabled,
      setCamEnabled,
      setNoiseSuppressionMode: setNoiseSuppression,
      setNoiseSuppressionEnabled,
    }),
    [
      meetingId,
      meetingTitle,
      token,
      serverUrl,
      enteredCall,
      isInRoomScreen,
      micEnabled,
      camEnabled,
      noiseSuppressionMode,
      iceServers,
      noiseSuppressionEnabled,
      isFloatVisible,
      join,
      leave,
      enterCall,
      setNoiseSuppression,
      setNoiseSuppressionEnabled,
    ],
  );

  return (
    <LiveMeetingCtx.Provider value={value}>
      <LiveMeetingSession onDisconnected={handleDisconnected}>{children}</LiveMeetingSession>
    </LiveMeetingCtx.Provider>
  );
}

export function useLiveMeeting() {
  return useContext(LiveMeetingCtx);
}
