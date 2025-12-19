import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { GradientHeader } from '../components/GradientHeader';

export default function TermsOfServiceScreen() {
  return (
    <View style={styles.container}>
      <GradientHeader title="Terms of Service" subtitle="Please review before using Splyce" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>Acceptance</Text>
        <Text style={styles.paragraph}>
          By using Splyce you agree to these terms. If you do not agree, please do not use the app.
        </Text>

        <Text style={styles.sectionTitle}>Bill Estimates</Text>
        <Text style={styles.paragraph}>
          Bill calculations are estimates only. You are responsible for confirming all amounts.
        </Text>

        <Text style={styles.sectionTitle}>No Liability</Text>
        <Text style={styles.paragraph}>
          We are not liable for OCR errors, disputes, or losses arising from incorrect data.
        </Text>

        <Text style={styles.sectionTitle}>User Responsibility</Text>
        <Text style={styles.paragraph}>
          You must verify receipt data and ensure it is accurate before splitting or sharing.
        </Text>

        <Text style={styles.sectionTitle}>Acceptable Use</Text>
        <Text style={styles.paragraph}>Do not use Splyce for illegal, harmful, or abusive content.</Text>

        <Text style={styles.sectionTitle}>Changes</Text>
        <Text style={styles.paragraph}>
          We may update these terms. Continued use after changes means you accept the updated terms.
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
