import { AppBottomSheetContent, BottomSheet, sheetSnapPx } from '@/components/app-bottom-sheet';
import { SigmaTypo } from '@/constants/sigma';
import type { SemanticTheme } from '@/hooks/use-semantic-theme';
import type { FileDisplaySource } from '@/lib/chat-attachments';
import { Cancel01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEffect } from 'react';
import { Dimensions, Pressable, StyleSheet, View } from 'react-native';

type ChatVideoPreviewSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  source: FileDisplaySource | null;
  filename: string;
  tone: SemanticTheme;
};

function InlineVideoPlayer({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = false;
  });

  useEffect(() => {
    return () => {
      try {
        player.pause();
      } catch {
        /* player may already be released */
      }
    };
  }, [player]);

  return (
    <VideoView
      player={player}
      style={styles.video}
      contentFit="contain"
      nativeControls
      allowsPictureInPicture
    />
  );
}

const SCREEN_H = Dimensions.get('window').height;
const VIDEO_SHEET_MIN_INNER = sheetSnapPx(0.9) - 48;

export function ChatVideoPreviewSheet({
  open,
  onOpenChange,
  source,
  filename,
  tone,
}: ChatVideoPreviewSheetProps) {
  const sheetOpen = open && !!source;

  return (
    <BottomSheet isOpen={sheetOpen} onOpenChange={onOpenChange}>
      <BottomSheet.Portal>
        <BottomSheet.Overlay />
        <AppBottomSheetContent
          size="video"
          snapOnLayout
          contentContainerClassName="flex-1"
        >
          {source ? (
            <View style={[styles.sheetInner, { minHeight: VIDEO_SHEET_MIN_INNER }]}>
              <View style={styles.header}>
                <BottomSheet.Title style={{ color: tone.foreground, fontSize: SigmaTypo.headline, fontWeight: '700', flex: 1 }}>
                  {filename}
                </BottomSheet.Title>
                <Pressable onPress={() => onOpenChange(false)} hitSlop={10} style={styles.closeBtn}>
                  <HugeiconsIcon icon={Cancel01Icon} size={22} color={tone.muted} strokeWidth={1.8} />
                </Pressable>
              </View>
              <View style={styles.playerWrap}>
                <InlineVideoPlayer uri={source.uri} />
              </View>
            </View>
          ) : null}
        </AppBottomSheetContent>
      </BottomSheet.Portal>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  sheetInner: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingBottom: 12,
  },
  closeBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playerWrap: {
    flex: 1,
    width: '100%',
    minHeight: Math.round(SCREEN_H * 0.55),
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#000',
    borderCurve: 'continuous',
  },
  video: {
    width: '100%',
    height: '100%',
  },
});
