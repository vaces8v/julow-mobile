import { APPLE_EASE } from '@/components/auth/auth-animation';
import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

type Props = {
  topInset: number;
  titleColor: string;
};

export function AuthBrandHeader({ topInset, titleColor }: Props) {
  return (
    <Animated.View
      entering={FadeIn.duration(400).easing(APPLE_EASE)}
      style={[styles.row, { paddingTop: topInset + 16 }]}
    >
      <Image source={require('@/assets/images/logo.png')} style={styles.logo} contentFit="contain" />
      <Text style={[styles.name, { color: titleColor }]}>Julow</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 24,
  },
  logo: {
    width: 52,
    height: 52,
    borderRadius: 14,
  },
  name: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 2.2,
  },
});
