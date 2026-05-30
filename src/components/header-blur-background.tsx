import { useSemanticTheme } from '@/hooks/use-semantic-theme';
import { BlurView } from 'expo-blur';
import { type RefObject } from 'react';
import { Platform, StyleSheet, View, type View as RNView, type ViewStyle } from 'react-native';

type Props = {
  blurTargetRef: RefObject<RNView | null>;
  style?: ViewStyle;
};

export function HeaderBlurBackground({ blurTargetRef, style }: Props) {
  const c = useSemanticTheme();

  if (Platform.OS === 'android') {
    return (
      <View
        style={[StyleSheet.absoluteFill, { backgroundColor: c.surface }, style]}
        pointerEvents="none"
      />
    );
  }

  const overlayColor =
    c.scheme === 'dark' ? 'rgba(18,18,20,0.48)' : 'rgba(244,243,240,0.62)';

  return (
    <View style={[StyleSheet.absoluteFill, style]} pointerEvents="none">
      <BlurView
        blurTarget={blurTargetRef}
        intensity={c.scheme === 'dark' ? 52 : 58}
        tint={c.scheme === 'dark' ? 'dark' : 'default'}
        blurReductionFactor={0.85}
        style={StyleSheet.absoluteFill}
      />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: overlayColor }]} />
    </View>
  );
}
