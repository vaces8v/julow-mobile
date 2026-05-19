import { BlurView, type BlurViewProps } from 'expo-blur';
import { type FC, type RefObject } from 'react';
import { type View } from 'react-native';
import Animated, {
    type SharedValue,
    useAnimatedProps,
} from 'react-native-reanimated';

const RBlurView = Animated.createAnimatedComponent(BlurView);

interface Props extends Omit<BlurViewProps, 'blurTarget'> {
    blurIntensity: SharedValue<number>;
    blurTarget?: RefObject<View | null>;
}

export const AnimatedBlurView: FC<Props> = ({ blurIntensity, blurTarget, ...props }) => {
    const animatedProps = useAnimatedProps(() => {
        return {
            intensity: blurIntensity.get(),
        };
    });

    return (
        <RBlurView
            blurMethod={blurTarget ? "dimezisBlurViewSdk31Plus" : "none"}
            blurTarget={blurTarget}
            animatedProps={animatedProps}
            {...props}
        />
    );
};