import React from 'react';
import {
  ActivityIndicator,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';

export type SplyceButtonRank = 'primary' | 'secondary' | 'tertiary';

type Props = {
  label: string;
  rank: SplyceButtonRank;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  // Escape hatch for the two spec'd tinted-secondary exceptions (purple live
  // actions, the green tint on "Share receipt") — geometry (height/radius/
  // font) always comes from `rank`; only fill/border/label color are
  // overridable, so every button stays on the same shared shape.
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  testID?: string;
};

export function SplyceButton({
  label,
  rank,
  onPress,
  disabled,
  loading,
  style,
  textStyle,
  testID,
}: Props) {
  return (
    <TouchableOpacity
      style={[styles.base, rankStyles[rank], disabled && styles.disabled, style]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.9}
      testID={testID}
    >
      {loading ? (
        <ActivityIndicator color={rank === 'primary' ? '#ffffff' : '#1EC974'} />
      ) : (
        <Text style={[labelStyles[rank], textStyle]}>{label}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
  },
  disabled: {
    opacity: 0.6,
  },
});

const rankStyles = StyleSheet.create({
  primary: {
    height: 52,
    backgroundColor: '#1EC974',
  },
  secondary: {
    height: 52,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(18, 24, 31, 0.12)',
  },
  tertiary: {
    height: 44,
    backgroundColor: 'transparent',
  },
});

const labelStyles = StyleSheet.create({
  primary: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
  secondary: {
    color: '#12181F',
    fontSize: 17,
    fontWeight: '600',
  },
  tertiary: {
    color: '#1EC974',
    fontSize: 16,
    fontWeight: '600',
  },
});
