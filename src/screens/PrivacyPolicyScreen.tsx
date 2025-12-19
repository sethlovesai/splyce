import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { GradientHeader } from '../components/GradientHeader';

export default function PrivacyPolicyScreen() {
  return (
    <View style={styles.container}>
      <GradientHeader title="Privacy Policy" subtitle="How we handle your data" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>What We Process</Text>
        <Text style={styles.paragraph}>
          - Receipt images you choose to scan or upload.{'\n'}
          - Text extracted from receipts (items, totals).
        </Text>

        <Text style={styles.sectionTitle}>How We Use It</Text>
        <Text style={styles.paragraph}>
          - To read your receipt and calculate bill splits.{'\n'}
          - To show you past receipts on your device.
        </Text>

        <Text style={styles.sectionTitle}>Where It&apos;s Stored</Text>
        <Text style={styles.paragraph}>- Locally on your device only.</Text>

        <Text style={styles.sectionTitle}>Third-Party Services</Text>
        <Text style={styles.paragraph}>- OpenAI API is used to extract receipt details.</Text>

        <Text style={styles.sectionTitle}>What We Don&apos;t Collect</Text>
        <Text style={styles.paragraph}>
          - No account details, location, payment info, or analytics.{'\n'}
          - We do not upload or keep your data on our own servers.
        </Text>

        <Text style={styles.sectionTitle}>Data Retention</Text>
        <Text style={styles.paragraph}>
          - Data stays on your device until you clear receipt history or uninstall the app.
        </Text>

        <Text style={styles.sectionTitle}>Your Control</Text>
        <Text style={styles.paragraph}>
          - You can delete receipts anytime from the app.{'\n'}- Uninstalling the app removes all
          stored data.
        </Text>

        <Text style={styles.sectionTitle}>Contact</Text>
        <Text style={styles.paragraph}>support@splyce.app</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f8f7',
  },
  content: {
    padding: 20,
    paddingBottom: 32,
    gap: 14,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1c2433',
  },
  paragraph: {
    color: '#4a5565',
    lineHeight: 20,
  },
});
