import { createContext, useContext, RefObject } from 'react';
import { View } from 'react-native';

interface BlurContextType {
  blurTargetRef: RefObject<View | null> | null;
}

export const BlurContext = createContext<BlurContextType>({ blurTargetRef: null });

export function useBlurTarget() {
  return useContext(BlurContext).blurTargetRef;
}
