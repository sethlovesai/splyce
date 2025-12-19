import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';

type Props = {
  title: string;
  subtitle?: string;
  onBack?: () => void;
};

export function GradientHeader({ title, subtitle, onBack }: Props) {
  const navigation = useNavigation();

  const handleBack = () => {
    if (onBack) {
      onBack();
      return;
    }
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  };

  return (
    <View style={styles.hero}>
      <View style={styles.heroOverlay} />
      <View style={styles.heroContent}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <View style={styles.textBlock}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    paddingTop: 54,
    paddingBottom: 22,
    paddingHorizontal: 20,
    backgroundColor: '#1fcf7c',
    overflow: 'hidden',
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0cae63',
    opacity: 0.12,
  },
  heroContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 0,
  },
  backButton: {
    height: 36,
    width: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textBlock: {
    flex: 1,
  },
  title: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '800',
  },
  subtitle: {
    color: '#e6fff2',
    marginTop: 4,
    fontSize: 15,
  },
});
