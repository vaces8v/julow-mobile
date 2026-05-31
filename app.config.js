/** @type {import('expo/config').ExpoConfig} */
const appJson = require('./app.json');

const PROD_API_URL = 'https://backend.julow.ru/api/v1';
const PROD_LIVEKIT_URL = 'wss://livekit.julow.ru';

module.exports = {
  expo: {
    ...appJson.expo,
    name: 'Julow',
    newArchEnabled: false,
    ios: {
      ...appJson.expo.ios,
      infoPlist: {
        NSCameraUsageDescription: 'Julow needs camera access for video meetings.',
        NSMicrophoneUsageDescription: 'Julow needs microphone access for video meetings.',
      },
    },
    android: {
      ...appJson.expo.android,
      label: 'Julow',
      usesCleartextTraffic: true,
      permissions: [
        'INTERNET',
        'ACCESS_NETWORK_STATE',
        'CAMERA',
        'RECORD_AUDIO',
        'MODIFY_AUDIO_SETTINGS',
        'BLUETOOTH_CONNECT',
        'FOREGROUND_SERVICE',
        'FOREGROUND_SERVICE_MEDIA_PROJECTION',
      ],
    },
    extra: {
      ...appJson.expo.extra,
      apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? PROD_API_URL,
      livekitUrl: process.env.EXPO_PUBLIC_LIVEKIT_URL ?? PROD_LIVEKIT_URL,
      ...(process.env.EXPO_PUBLIC_ANDROID_EMULATOR_API_BASE_URL
        ? { emulatorApiBaseUrl: process.env.EXPO_PUBLIC_ANDROID_EMULATOR_API_BASE_URL }
        : {}),
    },
    plugins: [
      ...appJson.expo.plugins,
      './plugins/with-android-network-security',
      './plugins/with-disable-expo-updates',
      'expo-video',
      [
        '@livekit/react-native-expo-plugin',
        {
          android: { audioType: 'communication', enableScreenShareService: true },
        },
      ],
      '@config-plugins/react-native-webrtc',
    ],
  },
};
