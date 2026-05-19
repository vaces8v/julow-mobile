import { useBottomSheet, useBottomSheetAnimation } from 'heroui-native';
import { Pressable, StyleSheet, useColorScheme, type View } from 'react-native';
import Animated, {
    interpolate,
    useAnimatedStyle,
    useDerivedValue,
} from 'react-native-reanimated';
import { AnimatedBlurView } from '@/components/animated-blur-view';
import { type RefObject } from 'react';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface Props {
    blurTarget?: RefObject<View | null>;
}

export const BottomSheetBlurOverlay = ({ blurTarget }: Props) => {
    const { isOpen, onOpenChange } = useBottomSheet();
    const { progress } = useBottomSheetAnimation();
    const scheme = useColorScheme();
    const isDark = scheme === 'dark';

    const blurIntensity = useDerivedValue(() => {
        return interpolate(progress.get(), [0, 1, 2], [0, 40, 0]);
    });

    const fallbackStyle = useAnimatedStyle(() => {
        const opacity = interpolate(progress.get(), [0, 1, 2], [0, 1, 0]);
        return {
            backgroundColor: isDark ? 'rgba(0,0,0,0.55)' : 'rgba(0,0,0,0.35)',
            opacity,
        };
    });

    if (!isOpen) {
        return null;
    }

    return (
        <AnimatedPressable
            style={StyleSheet.absoluteFill}
            onPress={() => onOpenChange(false)}
        >
            {blurTarget ? (
                <AnimatedBlurView
                    blurIntensity={blurIntensity}
                    blurTarget={blurTarget}
                    tint="dark"
                    style={StyleSheet.absoluteFill}
                />
            ) : (
                <Animated.View style={[StyleSheet.absoluteFill, fallbackStyle]} />
            )}
        </AnimatedPressable>
    );
};