import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { GradientHeader } from '../components/GradientHeader';

// Placeholder destination for the home screen's spending-strip card — the
// entry point for a deeper spending-analytics feature, not built yet.
export default function AnalyticsScreen() {
  return (
    <View style={styles.container}>
      <GradientHeader title="Spending" subtitle="Your splits, over time" />
      <View style={styles.content}>
        <View style={styles.iconWrap}>
          <Ionicons name="bar-chart-outline" size={28} color="#1ec873" />
        </View>
        <Text style={styles.title}>Coming soon</Text>
        <Text style={styles.subtitle}>
          Deeper spending insights — trends, category breakdowns, and more — are on the way.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f8f7',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#e8fff2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1c2433',
  },
  subtitle: {
    marginTop: 6,
    textAlign: 'center',
    color: '#6b7b8e',
    fontSize: 14,
    lineHeight: 20,
  },
});
