import { HeaderBlurBackground } from '@/components/header-blur-background';
import { ThemedText } from '@/components/themed-text';
import React from 'react';
import { StyleSheet, useColorScheme, View, type View as RNView, type RefObject } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function ScreenHeader({
  title,
  subtitle,
  right,
  blurTargetRef,
}: {
  title: string;
  subtitle?: React.ReactNode;
  right?: React.ReactNode;
  blurTargetRef?: RefObject<RNView | null>;
}) {
  const isDark = useColorScheme() === 'dark';
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      {blurTargetRef ? (
        <HeaderBlurBackground blurTargetRef={blurTargetRef} />
      ) : (
        <View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: isDark ? 'rgba(28,28,31,0.78)' : 'rgba(255,255,255,0.78)' },
          ]}
        />
      )}
      <View style={styles.row}>
        <View style={styles.left}>
          <ThemedText type="title" className="text-[22px] font-extrabold tracking-tight">
            {title}
          </ThemedText>
          {!!subtitle &&
            (typeof subtitle === 'string' ? (
              <ThemedText className="text-[12px] mt-0.5" themeColor="textSecondary">
                {subtitle}
              </ThemedText>
            ) : (
              subtitle
            ))}
        </View>
        {!!right && <View style={styles.right}>{right}</View>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(127,127,127,0.18)',
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  left: {
    flex: 1,
    minWidth: 0,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});
