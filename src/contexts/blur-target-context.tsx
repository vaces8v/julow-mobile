import { createContext, useContext, type RefObject } from 'react';
import type { View } from 'react-native';

type BlurTargetContextType = RefObject<View | null> | null;

export const BlurTargetContext = createContext<BlurTargetContextType>(null);

export const useBlurTarget = () => {
    return useContext(BlurTargetContext);
};
