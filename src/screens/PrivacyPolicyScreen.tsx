import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { GradientHeader } from '../components/GradientHeader';

export default function PrivacyPolicyScreen() {
  return (
    <View style={styles.container}>
      <GradientHeader title="Privacy Policy" subtitle="How we handle your data" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.updated}>Last updated: July 2026</Text>

        <Text style={styles.sectionTitle}>What We Process</Text>
        <Text style={styles.paragraph}>
          - Photos of receipts you scan or upload.{'\n'}
          - The details read from them (items, prices, totals, restaurant name).{'\n'}
          - Names you or your guests enter when splitting a bill.
        </Text>

        <Text style={styles.sectionTitle}>How Receipt Scanning Works</Text>
        <Text style={styles.paragraph}>
          When you scan or upload a receipt, the image is sent to our server and to OpenAI to read
          the items and prices. The image is used only to extract these details and is not stored
          after processing.
        </Text>

        <Text style={styles.sectionTitle}>Live Splitting</Text>
        <Text style={styles.paragraph}>
          - If you start a live split, the restaurant name, items, and the names of people in the
          split are stored temporarily in Google Firebase so everyone you invite can claim their
          items in real time.{'\n'}
          - Starting a session creates an anonymous ID for you via Firebase — no name, email, or
          login, just a random identifier so only you can manage your session.{'\n'}
          - When someone opens your invite link, the name they enter is stored with the session and
          in their own browser.{'\n'}
          - This session data is deleted automatically a few hours after the split ends.
        </Text>

        <Text style={styles.sectionTitle}>Where Your Data Is Stored</Text>
        <Text style={styles.paragraph}>
          - Your receipt history is stored locally on your device.{'\n'}
          - Live-split session data is stored in Google Firebase only for the life of the session,
          then removed.
        </Text>

        <Text style={styles.sectionTitle}>Third-Party Services</Text>
        <Text style={styles.paragraph}>
          - OpenAI — reads your receipt image to extract items and totals.{'\n'}
          - Google Firebase — powers live splitting (temporary storage and anonymous sign-in).
        </Text>

        <Text style={styles.sectionTitle}>What We Don&apos;t Collect</Text>
        <Text style={styles.paragraph}>
          - No accounts, emails, or passwords.{'\n'}
          - No location, contacts, or payment information.{'\n'}
          - No advertising or analytics tracking.
        </Text>

        <Text style={styles.sectionTitle}>Data Retention &amp; Deletion</Text>
        <Text style={styles.paragraph}>
          - On-device receipts stay until you clear your history or uninstall the app.{'\n'}
          - Live-split data expires automatically within about a day of the session ending.{'\n'}
          - You can clear your receipt history anytime in Settings, and cancel a live session from
          the app.
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
  updated: {
    color: '#8a97a5',
    fontSize: 12,
    marginBottom: 2,
  },
});
