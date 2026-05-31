import '@/global.css';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { Component, type ErrorInfo, type ReactNode, useEffect } from 'react';
import { Platform, StatusBar, StyleSheet, Text, useColorScheme, View } from 'react-native';

import { AppSplashScreen } from '@/components/auth/app-splash-screen';
import { Toaster } from '@/components/toaster';
import { AuthProvider, useAuth } from '@/contexts/auth-context';
import { LiveMeetingProvider } from '@/contexts/live-meeting-context';
import { CacheSyncProvider } from '@/lib/cache/cache-provider';
import { WorkspaceProvider } from '@/contexts/workspace-context';
import { useNotificationToasts } from '@/hooks/use-notification-toasts';
import { usePushNotifications } from '@/hooks/use-push-notifications';
import {
  PushNotificationsProvider,
  usePushNotificationsPreference,
} from '@/contexts/push-notifications-context';
import { handleColdStartNotification } from '@/lib/push-notifications';
import { I18nProvider } from '@/i18n/context';
import { startWsClient, stopWsClient } from '@/lib/ws-client';
import { HeroUINativeProvider } from 'heroui-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { useCSSVariable } from 'uniwind';

const IS_IOS_26 = Platform.OS === 'ios' && parseInt(String(Platform.Version), 10) >= 26;
const ROOT_BG = '#0b1020';

SplashScreen.preventAutoHideAsync().catch(() => {});

class RootErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[julow] root crash', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <View style={errorStyles.wrap}>
        <Text style={errorStyles.title}>Julow — startup error</Text>
        <Text style={errorStyles.body}>{this.state.error.message}</Text>
      </View>
    );
  }
}

const errorStyles = StyleSheet.create({
  wrap: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#0b1020',
  },
  title: { color: '#f8fafc', fontSize: 18, fontWeight: '700', marginBottom: 12 },
  body: { color: '#94a3b8', fontSize: 13 },
});

/** Fallback, если переменные Uniwind ещё не готовы на первом кадре */
const FALLBACK = {
  light: { bg: '#f5f4f2', fg: '#1a1a1a' },
  dark: { bg: '#121214', fg: '#f0f0f0' },
} as const;

function AuthGate() {
  const { isAuthenticated, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const rootSegment = segments[0];

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      stopWsClient();
      if (rootSegment !== 'login') {
        router.replace('/login');
      }
      return;
    }

    startWsClient();
    if (rootSegment === 'login') {
      router.replace('/(tabs)/(home)');
    }
  }, [isAuthenticated, isLoading, router, rootSegment]);

  const { isPushEnabled, isReady: isPushReady } = usePushNotificationsPreference();

  useNotificationToasts({ enabled: isAuthenticated && !isLoading });
  usePushNotifications({ enabled: isAuthenticated && !isLoading && isPushReady && isPushEnabled });

  useEffect(() => {
    if (isLoading || !isAuthenticated) return;
    void handleColdStartNotification();
  }, [isAuthenticated, isLoading]);

  return null;
}

function RootNavigator() {
  const { isLoading } = useAuth();
  const colorScheme = useColorScheme();
  const isDark = colorScheme !== 'light';
  const bgVar = useCSSVariable('--background');
  const fgVar = useCSSVariable('--foreground');
  const headerBg =
    typeof bgVar === 'string' && bgVar.length > 0 ? bgVar : isDark ? FALLBACK.dark.bg : FALLBACK.light.bg;
  const headerTint =
    typeof fgVar === 'string' && fgVar.length > 0 ? fgVar : isDark ? FALLBACK.dark.fg : FALLBACK.light.fg;

  useEffect(() => {
    if (isLoading) return;
    SplashScreen.hideAsync().catch(() => {});
  }, [isLoading]);

  if (isLoading) {
    return (
      <View style={styles.bootShell}>
        <StatusBar barStyle="light-content" backgroundColor={ROOT_BG} />
        <AppSplashScreen />
      </View>
    );
  }

  return (
    <>
      <AuthGate />
      <Stack
        screenOptions={{
          headerShown: IS_IOS_26,
          animation: 'ios_from_right',
          headerBackButtonDisplayMode: 'minimal',
          headerStyle: { backgroundColor: headerBg },
          headerShadowVisible: false,
          headerTintColor: headerTint,
          contentStyle: { backgroundColor: isDark ? FALLBACK.dark.bg : FALLBACK.light.bg },
        }}>
        <Stack.Screen name="index" options={{ headerShown: false, animation: 'none' }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false, animation: 'none' }} />
        <Stack.Screen name="oauth/callback" options={{ headerShown: false, animation: 'none' }} />
        <Stack.Screen name="qr-scan" options={{ headerShown: false, animation: 'slide_from_bottom' }} />
        <Stack.Screen name="chat/[id]" options={{ headerShown: false, animation: 'ios_from_right' }} />
        <Stack.Screen name="meetings/index" options={{ headerShown: false, animation: 'ios_from_right' }} />
        <Stack.Screen name="meetings/[id]/room" options={{ headerShown: false, animation: 'fade' }} />
        <Stack.Screen name="meetings/[id]/chat" options={{ headerShown: false, animation: 'ios_from_right' }} />
        <Stack.Screen name="metrics/[type]" options={{ headerShown: false, animation: 'default' }} />
        <Stack.Screen name="project/[id]" options={{ headerShown: false, animation: 'ios_from_right' }} />
        <Stack.Screen name="task/[id]/comments" options={{ headerShown: false, animation: 'ios_from_right' }} />
        <Stack.Screen name="analytics" options={{ headerShown: false, animation: 'ios_from_right' }} />
        <Stack.Screen name="analysis" options={{ headerShown: false, animation: 'ios_from_right' }} />
        <Stack.Screen name="documents" options={{ headerShown: false, animation: 'ios_from_right' }} />
        <Stack.Screen name="today" options={{ headerShown: false, animation: 'ios_from_right' }} />
        <Stack.Screen name="notifications" options={{ headerShown: false, animation: 'ios_from_right' }} />
        <Stack.Screen name="docs" options={{ headerShown: false, animation: 'ios_from_right' }} />
      </Stack>
      <Toaster />
    </>
  );
}

const styles = StyleSheet.create({
  bootShell: {
    flex: 1,
    backgroundColor: ROOT_BG,
  },
});

function AppProviders({ children }: { children: ReactNode }) {
  const tree = (
    <I18nProvider>
      <AuthProvider>
        <PushNotificationsProvider>
          <CacheSyncProvider>
            <WorkspaceProvider>
              <LiveMeetingProvider>
                <HeroUINativeProvider>{children}</HeroUINativeProvider>
              </LiveMeetingProvider>
            </WorkspaceProvider>
          </CacheSyncProvider>
        </PushNotificationsProvider>
      </AuthProvider>
    </I18nProvider>
  );

  if (Platform.OS === 'android') {
    return <KeyboardProvider>{tree}</KeyboardProvider>;
  }

  return (
    <KeyboardProvider statusBarTranslucent navigationBarTranslucent>
      {tree}
    </KeyboardProvider>
  );
}

export default function RootLayout() {
  return (
    <RootErrorBoundary>
      <GestureHandlerRootView style={[StyleSheet.absoluteFill, { backgroundColor: ROOT_BG }]}>
        <StatusBar barStyle="light-content" backgroundColor={ROOT_BG} />
        <AppProviders>
          <RootNavigator />
        </AppProviders>
      </GestureHandlerRootView>
    </RootErrorBoundary>
  );
}
