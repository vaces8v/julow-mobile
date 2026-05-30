/**
 * Deep-link target: julowmobile://oauth/callback
 *
 * Primary OAuth completion runs inside WebBrowser.openAuthSessionAsync (see lib/oauth.ts).
 * This screen handles cold-start opens of the same URL (e.g. user tapped a stale link).
 */
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

export default function OAuthCallbackScreen() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/login');
  }, [router]);

  return (
    <View style={styles.wrap}>
      <ActivityIndicator size="small" color="#94a3b8" />
      <Text style={styles.text}>Завершаем вход…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: '#0b1020',
  },
  text: { color: '#94a3b8', fontSize: 14 },
});
