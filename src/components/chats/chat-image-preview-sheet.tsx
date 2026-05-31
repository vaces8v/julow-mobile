import { AppBottomSheetContent, BottomSheet } from '@/components/app-bottom-sheet';
import { SigmaTypo } from '@/constants/sigma';
import type { SemanticTheme } from '@/hooks/use-semantic-theme';
import type { FileDisplaySource } from '@/lib/chat-attachments';
import { Cancel01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { Image } from 'expo-image';
import { Button } from 'heroui-native';
import { useEffect } from 'react';
import { Dimensions, Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

function ZoomableImage({
  source,
  filename,
  tone,
}: {
  source: FileDisplaySource;
  filename: string;
  tone: SemanticTheme;
}) {
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  useEffect(() => {
    scale.value = 1;
    savedScale.value = 1;
    translateX.value = 0;
    translateY.value = 0;
    savedTranslateX.value = 0;
    savedTranslateY.value = 0;
  }, [source.uri, scale, savedScale, translateX, translateY, savedTranslateX, savedTranslateY]);

  const pinch = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = Math.min(Math.max(savedScale.value * e.scale, 1), 4);
    })
    .onEnd(() => {
      if (scale.value < 1.05) {
        scale.value = withTiming(1);
        translateX.value = withTiming(0);
        translateY.value = withTiming(0);
        savedScale.value = 1;
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
      } else {
        savedScale.value = scale.value;
      }
    });

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      if (scale.value <= 1) return;
      translateX.value = savedTranslateX.value + e.translationX;
      translateY.value = savedTranslateY.value + e.translationY;
    })
    .onEnd(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      if (scale.value > 1) {
        scale.value = withTiming(1);
        translateX.value = withTiming(0);
        translateY.value = withTiming(0);
        savedScale.value = 1;
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
      } else {
        scale.value = withTiming(2);
        savedScale.value = 2;
      }
    });

  const gesture = Gesture.Simultaneous(pinch, pan, doubleTap);

  const imageStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <View style={styles.previewBody}>
      <GestureDetector gesture={gesture}>
        <Animated.View style={[styles.previewImageWrap, imageStyle]}>
          <Image
            source={source}
            style={styles.previewImage}
            contentFit="contain"
            transition={200}
          />
        </Animated.View>
      </GestureDetector>
      <Text style={[styles.previewCaption, { color: tone.muted }]} numberOfLines={2}>
        {filename}
      </Text>
    </View>
  );
}

type ChatImagePreviewSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  source: FileDisplaySource | null;
  filename: string;
  tone: SemanticTheme;
};

const IMAGE_SHEET_MIN_INNER = Math.round(SCREEN_H * 0.88) - 48;

export function ChatImagePreviewSheet({
  open,
  onOpenChange,
  source,
  filename,
  tone,
}: ChatImagePreviewSheetProps) {
  const sheetOpen = open && !!source;

  if (!sheetOpen) return null;

  return (
    <BottomSheet isOpen onOpenChange={onOpenChange}>
      <BottomSheet.Portal>
        <BottomSheet.Overlay />
        <AppBottomSheetContent
          size="large"
          snapOnLayout
          contentContainerClassName="flex-1"
        >
          {source ? (
            <View style={[styles.sheetInner, { minHeight: IMAGE_SHEET_MIN_INNER }]}>
              <View style={styles.sheetHeader}>
                <BottomSheet.Title style={{ color: tone.foreground, fontSize: SigmaTypo.headline, fontWeight: '700' }}>
                  {filename}
                </BottomSheet.Title>
                <Pressable onPress={() => onOpenChange(false)} hitSlop={10} style={styles.closeBtn}>
                  <HugeiconsIcon icon={Cancel01Icon} size={22} color={tone.muted} strokeWidth={1.8} />
                </Pressable>
              </View>
              <ZoomableImage source={source} filename={filename} tone={tone} />
            </View>
          ) : null}
        </AppBottomSheetContent>
      </BottomSheet.Portal>
    </BottomSheet>
  );
}

type ChatLinkConfirmSheetProps = {
  open: boolean;
  url: string | null;
  tone: SemanticTheme;
  title: string;
  description: string;
  cancelLabel: string;
  openLabel: string;
  onCancel: () => void;
  onConfirm: (url: string) => void;
};

export function ChatLinkConfirmSheet({
  open,
  url,
  tone,
  title,
  description,
  cancelLabel,
  openLabel,
  onCancel,
  onConfirm,
}: ChatLinkConfirmSheetProps) {
  const sheetOpen = open && !!url;

  if (!sheetOpen) return null;

  return (
    <BottomSheet isOpen onOpenChange={(v) => { if (!v) onCancel(); }}>
      <BottomSheet.Portal>
        <BottomSheet.Overlay />
        <AppBottomSheetContent size="compact">
          <BottomSheet.Title style={{ color: tone.foreground, fontSize: SigmaTypo.headline, fontWeight: '700' }}>
            {title}
          </BottomSheet.Title>
          <BottomSheet.Description style={{ color: tone.muted, fontSize: SigmaTypo.bodySmall, lineHeight: 20 }}>
            {description}
          </BottomSheet.Description>
          {url ? (
            <Text selectable style={[styles.linkUrl, { color: tone.accent }]} numberOfLines={3}>
              {url}
            </Text>
          ) : null}
          <View style={styles.linkActions}>
            <Button variant="secondary" onPress={onCancel} style={{ flex: 1 }}>
              <Button.Label>{cancelLabel}</Button.Label>
            </Button>
            <Button
              variant="primary"
              onPress={() => url && onConfirm(url)}
              style={{ flex: 1 }}
              isDisabled={!url}
            >
              <Button.Label>{openLabel}</Button.Label>
            </Button>
          </View>
        </AppBottomSheetContent>
      </BottomSheet.Portal>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  sheetInner: {
    flex: 1,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingBottom: 8,
  },
  closeBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewBody: {
    flex: 1,
    minHeight: Math.min(SCREEN_H * 0.72, 560),
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 16,
  },
  previewImageWrap: {
    width: SCREEN_W - 32,
    height: Math.min(SCREEN_H * 0.58, 480),
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  previewCaption: {
    marginTop: 12,
    fontSize: SigmaTypo.caption,
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  linkUrl: {
    marginTop: 12,
    fontSize: SigmaTypo.caption,
    fontWeight: '600',
    lineHeight: 18,
  },
  linkActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },
});
