import { useEffect, useState } from 'react';
import {
  meetingParticipantInitials,
  resolveMeetingParticipantName,
} from '@/lib/chat-display-name';
import { api } from '@/lib/api';

export type MeetingParticipantProfileState = {
  displayName?: string;
  email?: string;
};

const profileCache = new Map<string, MeetingParticipantProfileState>();
const profileRequestCache = new Map<string, Promise<MeetingParticipantProfileState>>();

async function loadMeetingParticipantProfile(
  identity: string,
  isLocal: boolean,
): Promise<MeetingParticipantProfileState> {
  const cached = profileCache.get(identity);
  if (cached) return cached;

  const inFlight = profileRequestCache.get(identity);
  if (inFlight) return inFlight;

  const request = (async () => {
    try {
      if (isLocal) {
        const [profile, me] = await Promise.all([api.getMyProfile(), api.getMe()]);
        const next: MeetingParticipantProfileState = {
          displayName: profile.displayName,
          email: me.email,
        };
        profileCache.set(identity, next);
        return next;
      }

      const user = await api.getUserById(identity).catch(() => null);
      const next: MeetingParticipantProfileState = {
        email: user?.email,
      };
      profileCache.set(identity, next);
      return next;
    } catch {
      const next: MeetingParticipantProfileState = {};
      profileCache.set(identity, next);
      return next;
    } finally {
      profileRequestCache.delete(identity);
    }
  })();

  profileRequestCache.set(identity, request);
  return request;
}

export function useMeetingParticipantProfile(identity?: string, isLocal = false) {
  const [profile, setProfile] = useState<MeetingParticipantProfileState>(() =>
    identity ? (profileCache.get(identity) ?? {}) : {},
  );

  useEffect(() => {
    if (!identity) {
      setProfile({});
      return;
    }

    const cached = profileCache.get(identity);
    if (cached) {
      setProfile(cached);
      return;
    }

    let cancelled = false;
    void loadMeetingParticipantProfile(identity, isLocal).then((next) => {
      if (!cancelled) {
        setProfile(next);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [identity, isLocal]);

  return profile;
}

export function useMeetingParticipantDisplayName(
  identity: string | undefined,
  livekitName: string | undefined,
  isLocal: boolean,
  fallback = '',
) {
  const profile = useMeetingParticipantProfile(identity, isLocal);

  const displayName =
    identity != null
      ? resolveMeetingParticipantName({
          livekitName,
          identity,
          displayName: profile.displayName,
          email: profile.email,
        })
      : fallback;

  return {
    displayName: displayName || fallback,
    initials: meetingParticipantInitials(displayName || fallback || '?'),
  };
}
