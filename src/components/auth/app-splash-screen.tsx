import { AuthMeshBackground } from '@/components/auth/auth-mesh-background';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { ActivityIndicator, StatusBar, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useEffect } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function AppSplashScreen() {
  const insets = useSafeAreaInsets();
  const pulse = useSharedValue(1);

  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.06, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
  }, [pulse]);

  const logoStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <AuthMeshBackground />

      <View style={[styles.content, { paddingTop: insets.top + 48, paddingBottom: insets.bottom + 32 }]}>
        <Animated.View entering={FadeInUp.duration(520).easing(Easing.out(Easing.cubic))} style={styles.brandRow}>
          <Animated.View style={[styles.brandLogoWrap, logoStyle]}>
            <LinearGradient
              colors={['rgba(255,255,255,0.28)', 'rgba(255,255,255,0.06)']}
              style={styles.brandLogoGlow}
            />
            <Image source={require('@/assets/images/logo.png')} style={styles.brandLogo} contentFit="contain" />
          </Animated.View>
          <Text style={styles.brandName}>Julow</Text>
        </Animated.View>

        <Animated.View entering={FadeIn.delay(280).duration(400)} style={styles.footer}>
          <ActivityIndicator size="small" color="rgba(199,210,254,0.9)" />
          <Text style={styles.tagline}>Workspace for teams</Text>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0b1020',
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 28,
  },
  brandRow: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
  },
  brandLogoWrap: {
    width: 224,
    height: 224,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandLogoGlow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 56,
  },
  brandLogo: {
    width: 224,
    height: 224,
    borderRadius: 56,
  },
  brandName: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: 3.2,
  },
  footer: {
    alignItems: 'center',
    gap: 12,
  },
  tagline: {
    color: 'rgba(165,180,252,0.75)',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.4,
  },
});
