import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Linking, ScrollView } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { GradientHeader } from '../components/GradientHeader';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { clearReceipts } from '../storage/receipts';

const accent = '#1ec873';
const sectionBg = '#ffffff';
const rowBorder = '#edf1f4';

export default function SettingsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const handleClearHistory = () => {
    Alert.alert(
      'Clear Receipt History?',
      'This will permanently delete all saved receipts. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            await clearReceipts();
          },
        },
      ],
    );
  };

  const openLink = (url: string) => {
    Linking.openURL(url).catch(() => {});
  };

  const openMail = (mailto: string) => {
    Linking.openURL(mailto).catch(() => {});
  };

  return (
    <View style={styles.container}>
      <GradientHeader title="Settings" subtitle="Manage your preferences" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Data</Text>
          <TouchableOpacity style={styles.row} onPress={handleClearHistory} activeOpacity={0.9}>
            <Text style={styles.rowText}>Clear Receipt History</Text>
            <Ionicons name="chevron-forward" size={18} color="#9aa3ad" />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Support</Text>
          <TouchableOpacity
            style={styles.row}
            onPress={() => openMail('mailto:support@splyce.app')}
            activeOpacity={0.9}
          >
            <Text style={styles.rowText}>Contact Us</Text>
            <Ionicons name="chevron-forward" size={18} color="#9aa3ad" />
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity
            style={styles.row}
            onPress={() => openMail('mailto:feedback@splyce.app')}
            activeOpacity={0.9}
          >
            <Text style={styles.rowText}>Send Feedback</Text>
            <Ionicons name="chevron-forward" size={18} color="#9aa3ad" />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Legal</Text>
          <TouchableOpacity
            style={styles.row}
            onPress={() => navigation.navigate('PrivacyPolicy')}
            activeOpacity={0.9}
          >
            <Text style={styles.rowText}>Privacy Policy</Text>
            <Ionicons name="chevron-forward" size={18} color="#9aa3ad" />
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity
            style={styles.row}
            onPress={() => navigation.navigate('TermsOfService')}
            activeOpacity={0.9}
          >
            <Text style={styles.rowText}>Terms of Service</Text>
            <Ionicons name="chevron-forward" size={18} color="#9aa3ad" />
          </TouchableOpacity>
        </View>

        <View style={styles.aboutCard}>
          <Text style={styles.aboutTitle}>Version 1.0.0</Text>
          <Text style={styles.aboutSubtitle}>Splyce helps you scan receipts and split bills easily.</Text>
        </View>
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
    padding: 16,
    gap: 14,
    paddingBottom: 32,
  },
  section: {
    backgroundColor: sectionBg,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  sectionLabel: {
    color: '#7a8a9b',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 6,
    marginLeft: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  rowText: {
    fontSize: 16,
    color: '#1c2433',
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: rowBorder,
  },
  aboutCard: {
    backgroundColor: sectionBg,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e6ecf2',
  },
  aboutTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1c2433',
  },
  aboutSubtitle: {
    marginTop: 6,
    color: '#6b7b8e',
  },
});
