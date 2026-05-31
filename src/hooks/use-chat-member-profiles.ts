import { CHAT_PALETTE } from '@/components/chats/chat-avatar';
import {
  chatParticipantInitials,
  resolveChatParticipantName,
} from '@/lib/chat-display-name';
import { api, type ChatPayload } from '@/lib/api';
import { useCallback, useEffect, useState } from 'react';

export type ChatMemberProfile = {
  id: string;
  name: string;
  initials: string;
  color: string;
};

function memberColor(userId: string): string {
  let h = 0;
  for (let i = 0; i < userId.length; i++) h = (h * 31 + userId.charCodeAt(i)) | 0;
  return CHAT_PALETTE[Math.abs(h) % CHAT_PALETTE.length];
}

function fallbackProfile(userId: string): ChatMemberProfile {
  const name = resolveChatParticipantName({ userId });
  return {
    id: userId,
    name,
    initials: chatParticipantInitials(name),
    color: memberColor(userId),
  };
}

/** Кэш имён/аватаров участников workspace для экранов чата. */
export function useChatMemberProfiles(
  workspaceId: string | undefined,
  currentUserId?: string,
) {
  const [members, setMembers] = useState<Record<string, ChatMemberProfile>>({});
  const [memberEmails, setMemberEmails] = useState<Record<string, string | null>>({});

  useEffect(() => {
    if (!workspaceId) {
      setMembers({});
      setMemberEmails({});
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const mlist = await api.getWorkspaceMembers(workspaceId);
        if (cancelled) return;

        const idsNeedingEmail = mlist
          .filter((m) => !m.displayName?.trim())
          .map((m) => m.userId);

        const emailEntries = await Promise.all(
          idsNeedingEmail.map(async (id) => {
            try {
              const u = await api.getUserById(id);
              return [id, u.email] as const;
            } catch {
              return [id, null] as const;
            }
          }),
        );

        if (cancelled) return;

        const emails: Record<string, string | null> = {};
        for (const [id, email] of emailEntries) emails[id] = email;

        const next: Record<string, ChatMemberProfile> = {};
        for (const m of mlist) {
          const name = resolveChatParticipantName({
            displayName: m.displayName,
            email: emails[m.userId],
            userId: m.userId,
          });
          next[m.userId] = {
            id: m.userId,
            name,
            initials: chatParticipantInitials(name),
            color: memberColor(m.userId),
          };
        }

        setMemberEmails(emails);
        setMembers(next);
      } catch {
        if (!cancelled) {
          setMembers({});
          setMemberEmails({});
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [workspaceId]);

  const memberOf = useCallback(
    (userId: string): ChatMemberProfile => {
      if (members[userId]) return members[userId];
      const email = memberEmails[userId];
      if (email !== undefined) {
        const name = resolveChatParticipantName({ email, userId });
        return {
          id: userId,
          name,
          initials: chatParticipantInitials(name),
          color: memberColor(userId),
        };
      }
      return fallbackProfile(userId);
    },
    [members, memberEmails],
  );

  const resolveDmChatTitle = useCallback(
    (chat: ChatPayload): string => {
      if (chat.chatType !== 'dm') return chat.name ?? 'Group';
      const peer = chat.members.find((m) => m.userId !== currentUserId);
      if (!peer) return chat.name ?? 'Direct Message';
      return memberOf(peer.userId).name;
    },
    [currentUserId, memberOf],
  );

  return { memberOf, resolveDmChatTitle };
}
