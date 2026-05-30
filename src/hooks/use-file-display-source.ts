import type { FileDisplaySource } from '@/lib/chat-attachments';
import { api, buildDirectFileContentUrl } from '@/lib/api';
import { getAccessToken } from '@/lib/api-client';
import { useCallback, useEffect, useState } from 'react';

async function resolvePresigned(fileId: string): Promise<FileDisplaySource> {
  const dl = await api.getFileDownloadUrl(fileId);
  return { uri: dl.url };
}

async function resolveDirect(fileId: string): Promise<FileDisplaySource> {
  const token = await getAccessToken();
  return {
    uri: buildDirectFileContentUrl(fileId),
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  };
}

export function useFileDisplaySource(fileId: string | undefined) {
  const [source, setSource] = useState<FileDisplaySource | null>(null);
  const [loading, setLoading] = useState(Boolean(fileId));
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    if (!fileId) {
      setSource(null);
      setLoading(false);
      setFailed(false);
      return;
    }

    setLoading(true);
    setFailed(false);

    try {
      setSource(await resolvePresigned(fileId));
    } catch {
      try {
        setSource(await resolveDirect(fileId));
      } catch {
        setSource(null);
        setFailed(true);
      }
    } finally {
      setLoading(false);
    }
  }, [fileId]);

  useEffect(() => {
    void load();
  }, [load]);

  const retryWithDirect = useCallback(async () => {
    if (!fileId) return;
    setLoading(true);
    setFailed(false);
    try {
      setSource(await resolveDirect(fileId));
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, [fileId]);

  const retryWithPresigned = useCallback(async () => {
    if (!fileId) return;
    setLoading(true);
    setFailed(false);
    try {
      setSource(await resolvePresigned(fileId));
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, [fileId]);

  return { source, loading, failed, reload: load, retryWithDirect, retryWithPresigned };
}
