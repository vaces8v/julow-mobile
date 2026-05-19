import { useNavigation } from 'expo-router';
import { useLayoutEffect } from 'react';
import { Platform, useColorScheme } from 'react-native';

const IS_IOS_26 = Platform.OS === 'ios' && parseInt(String(Platform.Version), 10) >= 26;

export function useNativeHeader(options?: { largeTitle?: boolean }) {
  const navigation = useNavigation();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const headerBg = isDark ? '#000000' : '#ffffff';

  useLayoutEffect(() => {
    if (!IS_IOS_26) return;
    navigation.setOptions({
      headerLargeTitle: options?.largeTitle ?? true,
      headerStyle: { backgroundColor: headerBg },
      headerLargeStyle: { backgroundColor: headerBg },
      headerShadowVisible: false,
      headerLargeTitleShadowVisible: false,
      headerTintColor: isDark ? '#ffffff' : '#000000',
    });
  }, [navigation, headerBg, isDark, options?.largeTitle]);
}
