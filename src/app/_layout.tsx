import '@/global.css';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, Platform, StyleSheet, View, useColorScheme } from 'react-native';

import { Toaster } from '@/components/toaster';
import { AuthProvider, useAuth } from '@/contexts/auth-context';
import { WorkspaceProvider } from '@/contexts/workspace-context';
import { useNotificationToasts } from '@/hooks/use-notification-toasts';
import { I18nProvider } from '@/i18n/context';
import { startWsClient, stopWsClient } from '@/lib/ws-client';
import { HeroUINativeProvider } from 'heroui-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useCSSVariable } from 'uniwind';

const IS_IOS_26 = Platform.OS === 'ios' && parseInt(String(Platform.Version), 10) >= 26;

/** Fallback, если переменные Uniwind ещё не готовы на первом кадре */
const FALLBACK = {
  light: { bg: '#f5f4f2', fg: '#1a1a1a' },
  dark: { bg: '#121214', fg: '#f0f0f0' },
} as const;

function AuthGate() {
  const { isAuthenticated, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inLoginScreen = segments[0] === 'login';

    if (!isAuthenticated && !inLoginScreen) {
      router.replace('/login');
    } else if (isAuthenticated && inLoginScreen) {
      router.replace('/(tabs)/(home)');
    }
  }, [isAuthenticated, isLoading, segments, router]);

  // WebSocket lifecycle — connect when authenticated, disconnect on logout
  useEffect(() => {
    if (isLoading) return;
    if (isAuthenticated) {
      startWsClient();
    } else {
      stopWsClient();
    }
  }, [isAuthenticated, isLoading]);

  // Show in-app toast for backend notifications (new chat messages, task
  // assignments, status changes, etc.). Only runs when WS is up.
  useNotificationToasts({ enabled: isAuthenticated && !isLoading });

  return null;
}

function RootNavigator() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const bgVar = useCSSVariable('--background');
  const fgVar = useCSSVariable('--foreground');
  const headerBg =
    typeof bgVar === 'string' && bgVar.length > 0 ? bgVar : isDark ? FALLBACK.dark.bg : FALLBACK.light.bg;
  const headerTint =
    typeof fgVar === 'string' && fgVar.length > 0 ? fgVar : isDark ? FALLBACK.dark.fg : FALLBACK.light.fg;

  const { isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={[StyleSheet.absoluteFill, { backgroundColor: isDark ? FALLBACK.dark.bg : FALLBACK.light.bg, alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return (
    <>
      <AuthGate />
      <Stack screenOptions={{
        headerShown: IS_IOS_26,
        animation: 'ios_from_right',
        headerBackButtonDisplayMode: 'minimal',
        headerStyle: { backgroundColor: headerBg },
        headerShadowVisible: false,
        headerTintColor: headerTint,
      }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false, animation: 'fade' }} />
        <Stack.Screen name="chat/[id]" options={{ headerShown: false, animation: 'ios_from_right' }} />
        <Stack.Screen name="meetings/index" options={{ headerShown: false, animation: 'ios_from_right' }} />
        <Stack.Screen name="metrics/[type]" options={{ headerShown: false, animation: 'default' }} />
        <Stack.Screen name="project/[id]" options={{ headerShown: false, animation: 'ios_from_right' }} />
        <Stack.Screen name="analytics" options={{ headerShown: false, animation: 'ios_from_right' }} />
        <Stack.Screen name="analysis" options={{ headerShown: false, animation: 'ios_from_right' }} />
        <Stack.Screen name="documents" options={{ headerShown: false, animation: 'ios_from_right' }} />
        <Stack.Screen name="today" options={{ headerShown: false, animation: 'ios_from_right' }} />
        <Stack.Screen name="notifications" options={{ headerShown: false, animation: 'ios_from_right' }} />
      </Stack>
      <Toaster />
    </>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={StyleSheet.absoluteFill}>
      <HeroUINativeProvider>
        <I18nProvider>
          <AuthProvider>
            <WorkspaceProvider>
              <RootNavigator />
            </WorkspaceProvider>
          </AuthProvider>
        </I18nProvider>
      </HeroUINativeProvider>
    </GestureHandlerRootView>
  );
}
