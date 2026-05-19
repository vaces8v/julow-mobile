import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, TextStyle, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

/**
 * SlidingNumber — каждая цифра «прокатывается» вертикально с пружиной.
 * Порт web-версии под React Native / Reanimated.
 */

type RollerProps = {
  digit: number;
  height: number;
  onLayout: (h: number) => void;
  textStyle?: TextStyle;
};

function Roller({ digit, height, onLayout, textStyle }: RollerProps) {
  const y = useSharedValue(0);

  useEffect(() => {
    y.value = withSpring(-digit * height, { damping: 18, stiffness: 200, mass: 0.45 });
  }, [digit, height, y]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: y.value }],
  }));

  return (
    <View style={[styles.roller, { height: height || undefined }]}>
      {/* invisible sizer */}
      <Text
        style={[textStyle, { opacity: 0 }]}
        onLayout={(e) => {
          const h = e.nativeEvent.layout.height;
          if (h && h !== height) onLayout(h);
        }}
      >
        0
      </Text>
      <Animated.View style={[StyleSheet.absoluteFill, animatedStyle]}>
        {Array.from({ length: 10 }, (_, i) => (
          <Text key={i} style={[textStyle, { height: height || undefined, textAlign: 'center' }]}>
            {i}
          </Text>
        ))}
      </Animated.View>
    </View>
  );
}

type SlidingNumberProps = {
  value: number;
  textStyle?: TextStyle;
  suffix?: string;
  prefix?: string;
};

export function SlidingNumber({ value, textStyle, suffix, prefix }: SlidingNumberProps) {
  const abs = Math.abs(Math.round(value));
  const str = String(abs);
  const digits = useMemo(() => str.split('').map((d) => parseInt(d, 10)), [str]);
  const [height, setHeight] = useState(0);

  return (
    <View style={styles.row}>
      {prefix && <Text style={textStyle}>{prefix}</Text>}
      {value < 0 && <Text style={textStyle}>−</Text>}
      {digits.map((d, i) => (
        <Roller key={`${i}-${str.length}`} digit={d} height={height} onLayout={setHeight} textStyle={textStyle} />
      ))}
      {suffix && <Text style={textStyle}>{suffix}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  roller: {
    overflow: 'hidden',
  },
});
