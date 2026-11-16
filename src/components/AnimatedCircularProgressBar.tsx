import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

type Props = {
  value: number; // 0-100
  size?: number;
  strokeWidth?: number;
  gaugePrimaryColor?: string;
  gaugeSecondaryColor?: string;
  showValue?: boolean;
};

// React Native has no DOM/SVG built in, so this draws the ring with
// react-native-svg (a Circle whose stroke-dashoffset is animated) rather than
// the CSS-based version this was ported from.
export function AnimatedCircularProgressBar({
  value,
  size = 120,
  strokeWidth = 10,
  gaugePrimaryColor = '#1ec873',
  gaugeSecondaryColor = 'rgba(15, 27, 45, 0.08)',
  showValue = true,
}: Props) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: Math.max(0, Math.min(100, value)),
      duration: 400,
      useNativeDriver: false, // strokeDashoffset isn't supported by the native driver
    }).start();
  }, [value, animatedValue]);

  const strokeDashoffset = animatedValue.interpolate({
    inputRange: [0, 100],
    outputRange: [circumference, 0],
  });

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} style={styles.rotate}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={gaugeSecondaryColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={gaugePrimaryColor}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
        />
      </Svg>
      {showValue ? (
        <View style={[StyleSheet.absoluteFillObject, styles.center]}>
          <Text style={[styles.valueText, { color: gaugePrimaryColor }]}>{Math.round(value)}%</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  // SVG circles are drawn starting at 3 o'clock; rotate so progress starts at 12.
  rotate: {
    transform: [{ rotate: '-90deg' }],
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  valueText: {
    fontSize: 20,
    fontWeight: '800',
  },
});
