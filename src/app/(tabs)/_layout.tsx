import { ThemedText } from '@/components/themed-text';
import { BlurContext } from '@/contexts/blur-context';
import { useSemanticTheme } from '@/hooks/use-semantic-theme';
import {
  BubbleChatIcon,
  Folder02Icon,
  Home09Icon,
  Search01Icon,
  Settings02Icon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { BlurTargetView, BlurView } from 'expo-blur';
import { Href, Tabs, useRouter, useSegments } from 'expo-router';
import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { useMemo, useRef } from 'react';
import { DeviceEventEmitter, Platform, Pressable, StyleSheet, useColorScheme, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const IS_IOS_26 = Platform.OS === 'ios' && parseInt(String(Platform.Version), 10) >= 26;

const tabs = [
  { name: 'index', label: 'Главная', icon: Home09Icon },
  { name: 'projects', label: 'Проекты', icon: Folder02Icon },
  { name: 'chats', label: 'Чаты', icon: BubbleChatIcon },
  { name: 'search', label: 'Поиск', icon: Search01Icon },
  { name: 'settings', label: 'Настройки', icon: Settings02Icon },
];

function TabButton({
  children,
  onPress,
  label,
}: {
  children: React.ReactNode;
  focused: boolean;
  onPress: () => void;
  label: string;
}) {
  return (
    <Pressable onPress={onPress} accessibilityLabel={label} style={styles.tabButton}>
      <View style={styles.tabContent}>
        {children}
      </View>
    </Pressable>
  );
}

function NativeTabLayout() {
  return (
    <NativeTabs minimizeBehavior="never">
      <NativeTabs.Trigger
        name="(home)"
        listeners={{ tabPress: () => DeviceEventEmitter.emit('tabPress', '(home)') }}>
        <NativeTabs.Trigger.Label>Главная</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'house', selected: 'house.fill' }} md="home" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger
        name="(projects)"
        listeners={{ tabPress: () => DeviceEventEmitter.emit('tabPress', '(projects)') }}>
        <NativeTabs.Trigger.Label>Проекты</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'folder', selected: 'folder.fill' }} md="folder" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger
        name="(chats)"
        listeners={{ tabPress: () => DeviceEventEmitter.emit('tabPress', '(chats)') }}>
        <NativeTabs.Trigger.Label>Чаты</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'bubble.left.and.bubble.right', selected: 'bubble.left.and.bubble.right.fill' }} md="chat_bubble" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger
        name="(settings)"
        listeners={{ tabPress: () => DeviceEventEmitter.emit('tabPress', '(settings)') }}>
        <NativeTabs.Trigger.Label>Настройки</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'gearshape', selected: 'gearshape.fill' }} md="settings" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger
        role="search"
        name="(search)"
        listeners={{ tabPress: () => DeviceEventEmitter.emit('tabPress', '(search)') }}>
        <NativeTabs.Trigger.Label>Поиск</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'magnifyingglass', selected: 'magnifyingglass' }} md="search" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

function BlurTabLayout() {
  const segments = useSegments();
  const router = useRouter();
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const t = useSemanticTheme();
  const blurTargetRef = useRef<View>(null);
  const insets = useSafeAreaInsets();
  const blurContextValue = useMemo(() => ({ blurTargetRef }), []);

  const getTabSegment = (name: string) => {
    return name === 'index' ? '(home)' : `(${name})`;
  };

  const isTabFocused = (name: string) => {
    const segment = getTabSegment(name);
    return segments.includes(segment as never);
  };

  return (
    <BlurContext.Provider value={blurContextValue}>
      <View style={styles.container}>
        <BlurTargetView ref={blurTargetRef} style={StyleSheet.absoluteFill}>
          <Tabs
            screenOptions={{
              headerShown: false,
              tabBarStyle: { display: 'none' },
            }}>
            <Tabs.Screen name="(home)" />
            <Tabs.Screen name="(projects)" />
            <Tabs.Screen name="(chats)" />
            <Tabs.Screen name="(search)" />
            <Tabs.Screen name="(settings)" />
          </Tabs>
        </BlurTargetView>

        <BlurView
          blurTarget={blurTargetRef}
          blurMethod="dimezisBlurViewSdk31Plus"
          intensity={isDark ? 20 : 30}
          tint={isDark ? 'dark' : 'prominent'}
          blurReductionFactor={0.5}
          style={[
            styles.blurContainer,
            isDark && styles.blurContainerDark,
            { height: 56 + (insets.bottom > 0 ? insets.bottom : 10) },
          ]}>
          <View style={[styles.tabBar, { paddingBottom: insets.bottom > 0 ? insets.bottom : 10 }]}>
            {tabs.map((tab) => {
              const focused = isTabFocused(tab.name);
              const color = focused ? t.foreground : t.muted;

              return (
                <TabButton
                  key={tab.name}
                  focused={focused}
                  onPress={() => {
                    const screenName = getTabSegment(tab.name);
                    if (focused) {
                      DeviceEventEmitter.emit('tabPress', screenName);
                    } else {
                      router.navigate(`/(tabs)/${screenName}` as Href);
                    }
                  }}
                  label={tab.label}>
                  <HugeiconsIcon
                    icon={tab.icon}
                    size={22}
                    color={color}
                    strokeWidth={focused ? 2 : 1.5}
                  />
                  <ThemedText style={[styles.tabLabel, { color, fontWeight: focused ? '600' : '400' }]}>
                    {tab.label}
                  </ThemedText>
                </TabButton>
              );
            })}
          </View>
        </BlurView>
      </View>
    </BlurContext.Provider>
  );
}

export default function TabLayout() {
  if (IS_IOS_26) {
    return <NativeTabLayout />;
  }
  return <BlurTabLayout />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  blurContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    overflow: 'hidden',
  },
  blurContainerDark: {},
  tabBar: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingTop: 8,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabContent: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  tabLabel: {
    fontSize: 10,
    letterSpacing: 0.2,
  },
});
