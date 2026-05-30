import { SigmaTypo } from '@/constants/sigma';
import type { SemanticTheme } from '@/hooks/use-semantic-theme';
import { useFileDisplaySource } from '@/hooks/use-file-display-source';
import {
  attachmentFileExt,
  classifyChatAttachment,
  formatAttachmentSize,
  type FileDisplaySource,
} from '@/lib/chat-attachments';
import type { MessageAttachmentShape } from '@/lib/api';
import { File01Icon, PlayIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

type ChatAttachmentProps = {
  att: MessageAttachmentShape;
  tone: SemanticTheme;
  isMe: boolean;
  onImagePress: (source: FileDisplaySource, filename: string) => void;
  onVideoPress: (source: FileDisplaySource, filename: string) => void;
  onFilePress: (source: FileDisplaySource, filename: string) => void;
};

function MediaLoadingOverlay({ color, backgroundColor }: { color: string; backgroundColor: string }) {
  return (
    <View style={[styles.loadingOverlay, { backgroundColor }]}>
      <ActivityIndicator color={color} />
    </View>
  );
}

export function ChatAttachment({
  att,
  tone,
  isMe,
  onImagePress,
  onVideoPress,
  onFilePress,
}: ChatAttachmentProps) {
  const kind = classifyChatAttachment(att);
  const { source, loading, failed, retryWithDirect, retryWithPresigned } = useFileDisplaySource(att.fileId);
  const [mediaReady, setMediaReady] = useState(false);

  useEffect(() => {
    setMediaReady(false);
  }, [att.fileId, source?.uri]);

  const handleMediaError = () => {
    setMediaReady(false);
    if (source?.headers) {
      void retryWithPresigned();
    } else {
      void retryWithDirect();
    }
  };

  const openMedia = () => {
    if (!source) return;
    const name = att.filename ?? 'media';
    if (kind === 'image') onImagePress(source, name);
    else if (kind === 'video') onVideoPress(source, name);
    else onFilePress(source, name);
  };

  const showMediaLoader = loading || (Boolean(source) && !failed && !mediaReady);

  if (kind === 'image') {
    return (
      <Pressable
        onPress={openMedia}
        disabled={!source}
        style={[styles.mediaWrap, { backgroundColor: tone.surfaceSecondary, borderCurve: 'continuous' }]}
      >
        {source && !failed ? (
          <Image
            source={source}
            style={styles.media}
            contentFit="cover"
            transition={200}
            onLoad={() => setMediaReady(true)}
            onError={handleMediaError}
          />
        ) : !loading ? (
          <View style={styles.mediaPlaceholder}>
            <Text style={[styles.mediaPlaceholderText, { color: tone.muted }]}>
              {att.filename || 'Image'}
            </Text>
          </View>
        ) : null}
        {showMediaLoader ? (
          <MediaLoadingOverlay color={tone.muted} backgroundColor={tone.surfaceSecondary} />
        ) : null}
      </Pressable>
    );
  }

  if (kind === 'video') {
    return (
      <Pressable
        onPress={openMedia}
        disabled={!source}
        style={[styles.mediaWrap, { backgroundColor: '#000', borderCurve: 'continuous' }]}
      >
        {source && !failed ? (
          <Image
            source={source}
            style={styles.media}
            contentFit="cover"
            transition={200}
            onLoad={() => setMediaReady(true)}
            onError={handleMediaError}
          />
        ) : !loading ? (
          <View style={[styles.mediaPlaceholder, { backgroundColor: '#111' }]}>
            <Text style={[styles.mediaPlaceholderText, { color: '#aaa' }]}>
              {att.filename || 'Video'}
            </Text>
          </View>
        ) : null}
        {showMediaLoader ? (
          <MediaLoadingOverlay color="#aaa" backgroundColor="#111" />
        ) : null}
        {!showMediaLoader ? (
          <View style={styles.videoOverlay} pointerEvents="none">
            <View style={styles.playBtn}>
              <HugeiconsIcon icon={PlayIcon} size={22} color="#fff" strokeWidth={2} />
            </View>
          </View>
        ) : null}
      </Pressable>
    );
  }

  const fg = isMe ? tone.accentForeground : tone.foreground;
  const subFg = isMe ? tone.accentForeground + 'B8' : tone.muted;
  const surface = isMe ? 'rgba(255,255,255,0.18)' : tone.background;
  const border = isMe ? 'rgba(255,255,255,0.12)' : tone.border;

  return (
    <Pressable
      onPress={openMedia}
      disabled={!source && loading}
      style={[styles.fileRow, { backgroundColor: surface, borderColor: border, borderCurve: 'continuous' }]}
    >
      <View style={[styles.fileIcon, { backgroundColor: isMe ? 'rgba(255,255,255,0.15)' : tone.surface }]}>
        <HugeiconsIcon icon={File01Icon} size={18} color={isMe ? '#fff' : tone.accent} strokeWidth={1.7} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[styles.fileName, { color: fg }]} numberOfLines={1}>
          {att.filename || 'File'}
        </Text>
        <Text style={[styles.fileMeta, { color: subFg }]} numberOfLines={1}>
          {[attachmentFileExt(att.filename ?? ''), formatAttachmentSize(att.sizeBytes)].filter(Boolean).join(' • ')}
        </Text>
      </View>
      {loading ? <ActivityIndicator color={subFg} size="small" /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  mediaWrap: {
    position: 'relative',
    width: 220,
    height: 160,
    borderRadius: 16,
    overflow: 'hidden',
    alignSelf: 'flex-start',
  },
  media: {
    width: '100%',
    height: '100%',
  },
  mediaPlaceholder: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  mediaPlaceholderText: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  videoOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.28)',
  },
  playBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    minWidth: 200,
    maxWidth: 260,
    alignSelf: 'flex-start',
  },
  fileIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileName: {
    fontSize: SigmaTypo.captionSmall + 1,
    fontWeight: '700',
  },
  fileMeta: {
    marginTop: 2,
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 0.3,
  },
});
