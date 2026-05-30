import { api } from '@/lib/api';
import { resolveLiveKitUrl } from '@/lib/resolve-livekit-url';
import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

type LiveMeetingContextValue = {
  meetingId: string | null;
  token: string | null;
  serverUrl: string;
  join: (meetingId: string) => Promise<boolean>;
  leave: () => void;
};

const LiveMeetingCtx = createContext<LiveMeetingContextValue>({
  meetingId: null,
  token: null,
  serverUrl: resolveLiveKitUrl(),
  join: async () => false,
  leave: () => {},
});

export function LiveMeetingProvider({ children }: { children: React.ReactNode }) {
  const [meetingId, setMeetingId] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [serverUrl, setServerUrl] = useState(resolveLiveKitUrl());

  const join = useCallback(async (id: string) => {
    if (id === meetingId && token) return true;
    try {
      const res = await api.joinMeeting(id);
      if (!res.accessToken) return false;
      setMeetingId(id);
      setToken(res.accessToken);
      const raw = res.joinUrl?.trim();
      const ws =
        raw?.startsWith('ws://') || raw?.startsWith('wss://') ? raw : resolveLiveKitUrl();
      setServerUrl(ws);
      return true;
    } catch (e) {
      console.error('[live-meeting] join failed', e);
      return false;
    }
  }, [meetingId, token]);

  const leave = useCallback(() => {
    setMeetingId(null);
    setToken(null);
    setServerUrl(resolveLiveKitUrl());
  }, []);

  const value = useMemo(
    () => ({ meetingId, token, serverUrl, join, leave }),
    [meetingId, token, serverUrl, join, leave],
  );

  return <LiveMeetingCtx.Provider value={value}>{children}</LiveMeetingCtx.Provider>;
}

export function useLiveMeeting() {
  return useContext(LiveMeetingCtx);
}
