import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Props = {
  children: React.ReactNode;
  // When true, draws an opaque white plate (with a hairline top border) that
  // scrollable content passes behind. When false, fully transparent — the
  // screen's own background shows through. Either way this is an overlay
  // pinned to the bottom, so the screen's scrollable content must reserve
  // enough bottom padding to clear it.
  scrollsBehind: boolean;
  // Status line / total row rendered above the buttons, inside the footer
  // (on the plate when scrollsBehind, not floating on the page background).
  slot?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function ActionFooter({ children, scrollsBehind, slot, style }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        { paddingBottom: 16 + insets.bottom },
        scrollsBehind ? styles.plate : styles.transparent,
        style,
      ]}
    >
      {slot ? <View style={styles.slot}>{slot}</View> : null}
      <View style={styles.buttons}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  plate: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: 'rgba(18, 24, 31, 0.08)',
  },
  transparent: {
    backgroundColor: 'transparent',
  },
  slot: {
    marginBottom: 10,
  },
  buttons: {
    gap: 10,
  },
});
