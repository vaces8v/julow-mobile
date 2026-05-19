import { ThemedText } from '@/components/themed-text';
import { BlurView } from 'expo-blur';
import React from 'react';
import { Platform, StyleSheet, useColorScheme, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function ScreenHeader({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: React.ReactNode;
  right?: React.ReactNode;
}) {
  const isDark = useColorScheme() === 'dark';
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      <BlurView
        tint={isDark ? 'dark' : 'light'}
        intensity={30}
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: isDark
              ? 'rgba(0,0,0,0.6)'
              : 'rgba(255,255,255,0.7)',
            display: Platform.OS === 'android' ? 'none' : 'flex',
          },
        ]}
      />
      {Platform.OS === 'android' && (
        <View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: isDark ? '#000000' : '#ffffff' },
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
