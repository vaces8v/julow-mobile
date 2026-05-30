import type { ChatPendingFile } from '@/components/chats/chat-floating-input';
import { inferAttachmentTypeFromMeta } from '@/lib/chat-attachments';
import * as DocumentPicker from 'expo-document-picker';
import { useCallback, useState } from 'react';
import { KeyboardController } from 'react-native-keyboard-controller';

export type PendingComposerFile = ChatPendingFile & {
  uri: string;
  mimeType: string | null;
};

export function useComposerAttachments() {
  const [pendingFiles, setPendingFiles] = useState<PendingComposerFile[]>([]);
  const [sending, setSending] = useState(false);
  const [uploadingName, setUploadingName] = useState<string | null>(null);

  const canSend = (text: string) => text.trim().length > 0 || pendingFiles.length > 0;

  const pickAttachments = useCallback(async (disabled?: boolean) => {
    if (disabled || sending) return;
    await KeyboardController.dismiss();
    try {
      const result = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
        multiple: true,
        type: '*/*',
      });
      await KeyboardController.dismiss();
      if (result.canceled) return;
      setPendingFiles((prev) => [
        ...prev,
        ...result.assets.map((asset, index) => ({
          key: `${Date.now()}-${index}-${asset.name}`,
          uri: asset.uri,
          name: asset.name,
          mimeType: asset.mimeType ?? null,
        })),
      ]);
    } catch (err) {
      console.warn('[composer] failed to pick files', err);
    }
  }, [sending]);

  const removePendingFile = useCallback((key: string) => {
    setPendingFiles((prev) => prev.filter((file) => file.key !== key));
  }, []);

  const clearPending = useCallback(() => {
    setPendingFiles([]);
  }, []);

  const inferType = (file: PendingComposerFile) =>
    inferAttachmentTypeFromMeta(file.name, file.mimeType);

  return {
    pendingFiles,
    sending,
    setSending,
    uploadingName,
    setUploadingName,
    canSend,
    pickAttachments,
    removePendingFile,
    clearPending,
    inferType,
  };
}
