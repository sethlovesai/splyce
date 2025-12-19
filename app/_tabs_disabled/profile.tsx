import React, { useState } from 'react';
import { ScrollView, View, Text, StyleSheet, TouchableOpacity, Switch } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

export default function ProfileScreen() {
  const [pushEnabled, setPushEnabled] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <View style={styles.heroOverlay} />
        <Text style={styles.heroTitle}>Profile & Settings</Text>
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>JS</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>Jordan Smith</Text>
            <Text style={styles.email}>jordan@example.com</Text>
          </View>
          <TouchableOpacity activeOpacity={0.8}>
            <Text style={styles.editText}>Edit</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.body}>
        <Text style={styles.sectionLabel}>Account</Text>

        <View style={styles.listCard}>
          <Row icon="mail-outline" title="Email" subtitle="jordan@example.com" />
          <View style={styles.divider} />
          <Row icon="card-outline" title="Payment Method" subtitle="PayPal" />
        </View>

        <Text style={[styles.sectionLabel, { marginTop: 22 }]}>Preferences</Text>

        <View style={styles.listCard}>
          <ToggleRow
            icon="notifications-outline"
            title="Push Notifications"
            subtitle="Get notified of payment requests"
            value={pushEnabled}
            onValueChange={setPushEnabled}
          />
          <View style={styles.divider} />
          <ToggleRow
            icon="moon-outline"
            title="Dark Mode"
            subtitle="Switch to dark theme"
            value={darkMode}
            onValueChange={setDarkMode}
          />
        </View>
      </View>
    </ScrollView>
  );
}

function Row({
  icon,
  title,
  subtitle,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.rowLeft}>
        <View style={styles.rowIcon}>
          <Ionicons name={icon} size={22} color="#7a8a9b" />
        </View>
        <View>
          <Text style={styles.rowTitle}>{title}</Text>
          <Text style={styles.rowSubtitle}>{subtitle}</Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#c2cad2" />
    </View>
  );
}

function ToggleRow({
  icon,
  title,
  subtitle,
  value,
  onValueChange,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.rowLeft}>
        <View style={styles.rowIcon}>
          <Ionicons name={icon} size={22} color="#7a8a9b" />
        </View>
        <View>
          <Text style={styles.rowTitle}>{title}</Text>
          <Text style={styles.rowSubtitle}>{subtitle}</Text>
        </View>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        thumbColor={value ? '#ffffff' : undefined}
        trackColor={{ false: '#d9e2ec', true: '#19c173' }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f8f7',
  },
  content: {
    paddingBottom: 40,
  },
  hero: {
    paddingTop: 64,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: '#1fcf7c',
    overflow: 'hidden',
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.12,
    backgroundColor: '#0cae63',
  },
  heroTitle: {
    color: '#ffffff',
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 16,
  },
  profileCard: {
    backgroundColor: '#24d787',
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatar: {
    height: 56,
    width: 56,
    borderRadius: 16,
    backgroundColor: '#14bb70',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '800',
  },
  name: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
  },
  email: {
    color: '#e6fff2',
    marginTop: 4,
  },
  editText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  body: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  sectionLabel: {
    color: '#7a8a9b',
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 10,
  },
  listCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  rowIcon: {
    height: 42,
    width: 42,
    borderRadius: 12,
    backgroundColor: '#f2f4f7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1c2433',
  },
  rowSubtitle: {
    color: '#7a8a9b',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#edf1f4',
    marginHorizontal: 16,
  },
});
