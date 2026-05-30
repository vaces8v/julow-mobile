import Constants from 'expo-constants';

const DEFAULT_LIVEKIT_URL = 'wss://livekit.julow.ru';

export function resolveLiveKitUrl(): string {
  const extra = Constants.expoConfig?.extra as { livekitUrl?: string } | undefined;
  const fromEnv = process.env.EXPO_PUBLIC_LIVEKIT_URL;
  const url = (fromEnv ?? extra?.livekitUrl ?? DEFAULT_LIVEKIT_URL).trim();
  return url.replace(/\/$/, '');
}
