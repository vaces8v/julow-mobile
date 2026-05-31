import { BlurContext } from '@/contexts/blur-context';
import { THEME_FALLBACK, useSemanticTheme, type SemanticTheme } from '@/hooks/use-semantic-theme';
import { useI18n } from '@/i18n/context';
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
import { getTabBarChromeStyle } from '@/lib/theme-surfaces';
import { useMemo, useRef } from 'react';
import { DeviceEventEmitter, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const IS_IOS_26 = Platform.OS === 'ios' && parseInt(String(Platform.Version), 10) >= 26;

export const unstable_settings = {
  initialRouteName: '(home)',
};

const TAB_ICONS = [
  { name: 'index', key: 'home' as const, icon: Home09Icon },
  { name: 'projects', key: 'projects' as const, icon: Folder02Icon },
  { name: 'chats', key: 'chats' as const, icon: BubbleChatIcon },
  { name: 'search', key: 'search' as const, icon: Search01Icon },
  { name: 'settings', key: 'settings' as const, icon: Settings02Icon },
];

function tabItemColor(theme: SemanticTheme, focused: boolean): string {
  const fallback = THEME_FALLBACK[theme.scheme];
  const color = focused ? theme.foreground : theme.muted;
  if (!color || color === theme.surface || color === 'transparent') {
    return focused ? fallback.foreground : fallback.muted;
  }
  return color;
}

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
  const { t } = useI18n();
  const tabs = t.tabs;

  return (
    <NativeTabs minimizeBehavior="never">
      <NativeTabs.Trigger
        name="(home)"
        listeners={{ tabPress: () => DeviceEventEmitter.emit('tabPress', '(home)') }}>
        <NativeTabs.Trigger.Label>{tabs.home}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'house', selected: 'house.fill' }} md="home" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger
        name="(projects)"
        listeners={{ tabPress: () => DeviceEventEmitter.emit('tabPress', '(projects)') }}>
        <NativeTabs.Trigger.Label>{tabs.projects}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'folder', selected: 'folder.fill' }} md="folder" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger
        name="(chats)"
        listeners={{ tabPress: () => DeviceEventEmitter.emit('tabPress', '(chats)') }}>
        <NativeTabs.Trigger.Label>{tabs.chats}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'bubble.left.and.bubble.right', selected: 'bubble.left.and.bubble.right.fill' }} md="chat_bubble" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger
        name="(settings)"
        listeners={{ tabPress: () => DeviceEventEmitter.emit('tabPress', '(settings)') }}>
        <NativeTabs.Trigger.Label>{tabs.settings}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'gearshape', selected: 'gearshape.fill' }} md="settings" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger
        role="search"
        name="(search)"
        listeners={{ tabPress: () => DeviceEventEmitter.emit('tabPress', '(search)') }}>
        <NativeTabs.Trigger.Label>{tabs.search}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'magnifyingglass', selected: 'magnifyingglass' }} md="search" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

function BlurTabLayout() {
  const segments = useSegments();
  const router = useRouter();
  const theme = useSemanticTheme();
  const isDark = theme.scheme === 'dark';
  const { t: i18n } = useI18n();
  const tabs = useMemo(
    () =>
      TAB_ICONS.map((tab) => ({
        ...tab,
        label: i18n.tabs[tab.key],
      })),
    [i18n.tabs],
  );
  const blurTargetRef = useRef<View>(null);
  const insets = useSafeAreaInsets();
  const blurContextValue = useMemo(() => ({ blurTargetRef }), []);
  const tabBarHeight = 56 + (insets.bottom > 0 ? insets.bottom : 10);
  const isAndroid = Platform.OS === 'android';

  const getTabSegment = (name: string) => {
    return name === 'index' ? '(home)' : `(${name})`;
  };

  const isTabFocused = (name: string) => {
    const segment = getTabSegment(name);
    return segments.includes(segment as never);
  };

  const tabBarContent = (
    <View
      style={[
        styles.tabBar,
        { paddingBottom: insets.bottom > 0 ? insets.bottom : 10 },
      ]}>
      {tabs.map((tab) => {
        const focused = isTabFocused(tab.name);
        const color = tabItemColor(theme, focused);

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
            <Text
              numberOfLines={1}
              style={[styles.tabLabel, { color, fontWeight: focused ? '600' : '400' }]}>
              {tab.label}
            </Text>
          </TabButton>
        );
      })}
    </View>
  );

  const tabsContent = (
    <Tabs
      initialRouteName="(home)"
      tabBar={() => null}
      screenOptions={{
        headerShown: false,
      }}>
      <Tabs.Screen name="(home)" />
      <Tabs.Screen name="(projects)" />
      <Tabs.Screen name="(chats)" />
      <Tabs.Screen name="(search)" />
      <Tabs.Screen name="(settings)" />
    </Tabs>
  );

  return (
    <BlurContext.Provider value={blurContextValue}>
      <View style={styles.container}>
        {isAndroid ? (
          <View style={StyleSheet.absoluteFill}>{tabsContent}</View>
        ) : (
          <BlurTargetView ref={blurTargetRef} style={StyleSheet.absoluteFill} collapsable={false}>
            {tabsContent}
          </BlurTargetView>
        )}

        {isAndroid ? (
          <View
            style={[
              styles.blurContainer,
              { height: tabBarHeight },
              getTabBarChromeStyle(theme),
            ]}>
            {tabBarContent}
          </View>
        ) : (
          <View style={[styles.blurContainer, { height: tabBarHeight }, getTabBarChromeStyle(theme)]}>
            <View pointerEvents="none" style={StyleSheet.absoluteFill}>
              <BlurView
                blurTarget={blurTargetRef}
                intensity={isDark ? 20 : 36}
                tint={isDark ? 'dark' : 'light'}
                blurReductionFactor={0.5}
                style={StyleSheet.absoluteFill}
              />
              <View
                style={[
                  StyleSheet.absoluteFill,
                  { backgroundColor: theme.surface, opacity: isDark ? 0.78 : 0.9 },
                ]}
              />
            </View>
            {tabBarContent}
          </View>
        )}
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
  tabBar: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 1,
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
