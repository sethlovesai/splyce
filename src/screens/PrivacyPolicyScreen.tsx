import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { GradientHeader } from '../components/GradientHeader';

export default function PrivacyPolicyScreen() {
  return (
    <View style={styles.container}>
      <GradientHeader title="Privacy Policy" subtitle="How we handle your data" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.updated}>Last updated: 19 August 2026</Text>

        <Text style={styles.sectionTitle}>What We Process</Text>
        <Text style={styles.paragraph}>
          - Photos of receipts you scan or upload.{'\n'}
          - The details read from them (items, prices, totals, restaurant name).{'\n'}
          - Names you or your guests enter when splitting a bill.{'\n'}
          - An anonymous device identifier, used to track your monthly free-scan usage and to
          enable live bill-splitting sessions.{'\n'}
          - Purchase validation data, if you buy Splyce Pro — handled by Apple and RevenueCat; we
          never see your payment card details.
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
          - A few hours after the split ends, the session automatically expires — at that point
          no one, host or guest, can access it any longer, and it&apos;s periodically deleted from
          our database.
        </Text>

        <Text style={styles.sectionTitle}>Splyce Pro Purchases</Text>
        <Text style={styles.paragraph}>
          - If you purchase Splyce Pro, purchase validation is handled by Apple and our payment
          processing partner, RevenueCat.{'\n'}
          - We do not store your payment card details.
        </Text>

        <Text style={styles.sectionTitle}>Where Your Data Is Stored</Text>
        <Text style={styles.paragraph}>
          - Your receipt history is stored locally on your device.{'\n'}
          - Live-split session data is stored in Google Firebase only for the life of the session;
          once it expires, it's inaccessible to everyone and periodically removed.
        </Text>

        <Text style={styles.sectionTitle}>Third-Party Services</Text>
        <Text style={styles.paragraph}>
          - OpenAI — reads your receipt image to extract items and totals.{'\n'}
          - Google Firebase — powers live splitting and free-scan usage tracking (temporary
          storage and anonymous sign-in).{'\n'}
          - RevenueCat — manages and validates Splyce Pro purchases.
        </Text>

        <Text style={styles.sectionTitle}>What We Don&apos;t Collect</Text>
        <Text style={styles.paragraph}>
          - No accounts, emails, or passwords.{'\n'}
          - No location, contacts, or payment card information.{'\n'}
          - No advertising or analytics tracking.
        </Text>

        <Text style={styles.sectionTitle}>Children&apos;s Privacy</Text>
        <Text style={styles.paragraph}>
          Splyce is not directed at children under 13, and we do not knowingly collect data from
          children under 13.
        </Text>

        <Text style={styles.sectionTitle}>Data Retention &amp; Deletion</Text>
        <Text style={styles.paragraph}>
          - On-device receipts stay until you clear your history or uninstall the app.{'\n'}
          - Live-split data automatically becomes inaccessible within about a day of the session
          ending, and is periodically deleted from our database thereafter.{'\n'}
          - You can clear your receipt history anytime in Settings, and cancel a live session from
          the app.
        </Text>

        <Text style={styles.sectionTitle}>Your Choices</Text>
        <Text style={styles.paragraph}>
          Since Splyce doesn&apos;t require an account, most of your data is tied to your device —
          uninstalling the app removes what&apos;s stored locally.
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
