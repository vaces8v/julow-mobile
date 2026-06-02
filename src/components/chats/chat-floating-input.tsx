import { HeaderBlurBackground } from '@/components/header-blur-background';
import { SigmaTypo } from '@/constants/sigma';
import type { SemanticTheme } from '@/hooks/use-semantic-theme';
import { AttachmentIcon, Cancel01Icon, SentIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { useEffect, useRef, type RefObject } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { KeyboardController } from 'react-native-keyboard-controller';
import {
  KeyboardStickyView,
  useReanimatedKeyboardAnimation,
} from 'react-native-keyboard-controller';
import Animated, {
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

const IOS_GLASS = Platform.OS === 'ios' && isLiquidGlassAvailable();

export type ChatPendingFile = {
  key: string;
  name: string;
};

type Props = {
  tone: SemanticTheme;
  bottomInset: number;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  onSend: () => void;
  sendLabel: string;
  hasDraft: boolean;
  blurTargetRef: RefObject<View | null>;
  onAttachPress?: () => void;
  attachLabel?: string;
  attachDisabled?: boolean;
  pendingFiles?: ChatPendingFile[];
  onRemovePendingFile?: (key: string) => void;
  sending?: boolean;
  sendingLabel?: string;
  uploadingLabel?: string;
};

export function ChatFloatingInput({
  tone,
  bottomInset,
  value,
  onChange,
  placeholder,
  onSend,
  sendLabel,
  hasDraft,
  blurTargetRef,
  onAttachPress,
  attachLabel,
  attachDisabled,
  pendingFiles,
  onRemovePendingFile,
  sending = false,
  sendingLabel,
  uploadingLabel,
}: Props) {
  const inputRef = useRef<TextInput>(null);
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withSpring(hasDraft ? 1 : 0, { damping: 16, stiffness: 280, mass: 0.7 });
  }, [hasDraft, p]);

  const pulse = useSharedValue(1);
  useEffect(() => {
    if (hasDraft) {
      pulse.value = withSpring(1.08, { damping: 10, stiffness: 260, mass: 0.4 }, () => {
        pulse.value = withSpring(1, { damping: 14, stiffness: 240, mass: 0.5 });
      });
    }
  }, [hasDraft, pulse]);

  const { progress } = useReanimatedKeyboardAnimation();

  const sendBgStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(p.value, [0, 1], [tone.surfaceTertiary, tone.accent]),
    transform: [{ scale: pulse.value }],
  }));

  const sendIconColor = hasDraft ? '#ffffff' : tone.muted;
  const baseInset = Math.max(bottomInset, 12);

  const hostStyle = useAnimatedStyle(() => ({
    paddingBottom: interpolate(progress.value, [0, 1], [baseInset, 6]),
  }));

  const showPending = (pendingFiles?.length ?? 0) > 0;
  const showStatus = sending && (sendingLabel || uploadingLabel);

  const handleAttach = () => {
    if (!onAttachPress || attachDisabled || sending) return;
    void KeyboardController.dismiss();
    inputRef.current?.blur();
    onAttachPress();
  };

  return (
    <KeyboardStickyView style={styles.floatingHost} pointerEvents="box-none">
      <Animated.View
        style={[
          styles.pillOuter,
          {
            paddingHorizontal: IOS_GLASS ? 10 : 0,
            paddingTop: IOS_GLASS ? 4 : 6,
          },
          hostStyle,
        ]}
        pointerEvents="box-none"
      >
        {!IOS_GLASS && (
          <>
            {tone.scheme === 'light' ? (
              <View
                style={[StyleSheet.absoluteFill, { backgroundColor: tone.background }]}
                pointerEvents="none"
              />
            ) : (
              <HeaderBlurBackground blurTargetRef={blurTargetRef} />
            )}
            <View style={[styles.pillTopBorder, { backgroundColor: tone.border }]} />
          </>
        )}

        {showStatus ? (
          <View style={styles.statusRow}>
            <ActivityIndicator size="small" color={tone.accent} />
            <Text style={[styles.statusText, { color: tone.muted }]} numberOfLines={1}>
              {uploadingLabel ?? sendingLabel}
            </Text>
          </View>
        ) : null}

        {showPending ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.pendingRow}
            style={styles.pendingScroll}
          >
            {pendingFiles!.map((file) => (
              <View
                key={file.key}
                style={[
                  styles.pendingChip,
                  { backgroundColor: tone.surfaceSecondary, borderColor: tone.border },
                ]}
              >
                <Text style={[styles.pendingName, { color: tone.foreground }]} numberOfLines={1}>
                  {file.name}
                </Text>
                <Pressable
                  onPress={() => onRemovePendingFile?.(file.key)}
                  hitSlop={8}
                  style={styles.pendingRemove}
                >
                  <HugeiconsIcon icon={Cancel01Icon} size={14} color={tone.muted} strokeWidth={2} />
                </Pressable>
              </View>
            ))}
          </ScrollView>
        ) : null}

        <View style={styles.pillRow}>
          <View
            style={[
              styles.pill,
              IOS_GLASS
                ? { backgroundColor: 'transparent' }
                : {
                    backgroundColor: tone.surface,
                    borderColor: tone.border,
                    borderWidth: StyleSheet.hairlineWidth,
                    borderCurve: 'continuous',
                  },
            ]}
          >
            {IOS_GLASS && (
              <GlassView
                glassEffectStyle="regular"
                colorScheme={tone.scheme}
                isInteractive
                style={[StyleSheet.absoluteFill, { borderRadius: 28, overflow: 'hidden' }]}
              />
            )}

            {onAttachPress ? (
              <Pressable
                accessibilityLabel={attachLabel}
                onPress={handleAttach}
                disabled={attachDisabled || sending}
                hitSlop={6}
                style={({ pressed }) => [
                  styles.attachWrap,
                  { opacity: attachDisabled ? 0.45 : pressed ? 0.75 : 1 },
                ]}
              >
                <HugeiconsIcon icon={AttachmentIcon} size={18} color={tone.muted} strokeWidth={1.9} />
              </Pressable>
            ) : null}

            <TextInput
              ref={inputRef}
              value={value}
              onChangeText={onChange}
              placeholder={placeholder}
              placeholderTextColor={tone.muted}
              style={[styles.pillInput, { color: tone.foreground }]}
              multiline
              returnKeyType="default"
              blurOnSubmit={false}
              textAlignVertical="center"
            />

            <Pressable
              accessibilityLabel={sendLabel}
              onPress={onSend}
              disabled={!hasDraft || sending}
              hitSlop={6}
              style={({ pressed }) => [
                styles.sendWrap,
                { opacity: pressed && hasDraft && !sending ? 0.85 : 1 },
              ]}
            >
              <Animated.View style={[styles.sendBtn, sendBgStyle]}>
                {sending ? (
                  <ActivityIndicator size="small" color={sendIconColor} />
                ) : (
                  <HugeiconsIcon icon={SentIcon} size={18} color={sendIconColor} strokeWidth={2.2} />
                )}
              </Animated.View>
            </Pressable>
          </View>
        </View>
      </Animated.View>
    </KeyboardStickyView>
  );
}

const styles = StyleSheet.create({
  floatingHost: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  pillOuter: {
    width: '100%',
  },
  pillTopBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: IOS_GLASS ? 14 : 18,
    paddingBottom: 6,
  },
  statusText: {
    flex: 1,
    fontSize: SigmaTypo.captionSmall,
    fontWeight: '600',
  },
  pendingScroll: {
    maxHeight: 44,
    marginBottom: 6,
  },
  pendingRow: {
    paddingHorizontal: IOS_GLASS ? 12 : 16,
    gap: 8,
    alignItems: 'center',
  },
  pendingChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    maxWidth: 180,
    paddingLeft: 10,
    paddingRight: 6,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  pendingName: {
    flexShrink: 1,
    fontSize: SigmaTypo.captionSmall,
    fontWeight: '600',
  },
  pendingRemove: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillRow: {
    paddingHorizontal: IOS_GLASS ? 2 : 12,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
    borderRadius: 28,
    paddingLeft: 8,
    paddingRight: 5,
    paddingVertical: 5,
    minHeight: 48,
    overflow: 'hidden',
    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
  },
  attachWrap: {
    width: 34,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillInput: {
    flex: 1,
    fontSize: SigmaTypo.bodySmall + 1,
    lineHeight: 20,
    paddingVertical: 10,
    maxHeight: 120,
  },
  sendWrap: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
