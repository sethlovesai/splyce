import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, SafeAreaView } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { RootStackParamList } from '../types/navigation';
import { FREE_SCANS_PER_MONTH, getUsage, hasFreeScansLeft, UsageState } from '../services/usage';
import { UNLOCK_PRICE_FALLBACK, getUnlockPrice, purchaseUnlock, restoreUnlock } from '../services/iap';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Paywall'>;

const PERKS = [
  'Unlimited receipt scans, every month',
  'One-time payment — not a subscription',
  'Yours forever, on every device you sign in',
];

export default function PaywallScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [price, setPrice] = React.useState(UNLOCK_PRICE_FALLBACK);
  const [usage, setUsage] = React.useState<UsageState | null>(null);
  const [busy, setBusy] = React.useState<null | 'buy' | 'restore'>(null);

  React.useEffect(() => {
    getUsage().then(setUsage).catch(() => {});
    getUnlockPrice().then(setPrice).catch(() => {});
  }, []);

  const outOfScans = usage != null && !hasFreeScansLeft(usage);

  const handlePurchase = async () => {
    if (busy) return;
    setBusy('buy');
    try {
      const outcome = await purchaseUnlock();
      if (outcome === 'purchased') {
        Alert.alert('Unlocked!', 'You now have unlimited scans. Thanks for supporting Splyce!', [
          { text: 'Great', onPress: () => navigation.goBack() },
        ]);
      } else if (outcome === 'unavailable') {
        Alert.alert('Not available yet', 'In-app purchases aren’t enabled in this build yet.');
      } else if (outcome === 'error') {
        Alert.alert('Purchase failed', 'Something went wrong. Please try again.');
      }
      // 'cancelled' → stay silently
    } finally {
      setBusy(null);
    }
  };

  const handleRestore = async () => {
    if (busy) return;
    setBusy('restore');
    try {
      const restored = await restoreUnlock();
      if (restored) {
        Alert.alert('Purchase restored', 'Your unlimited scans are back.', [
          { text: 'Great', onPress: () => navigation.goBack() },
        ]);
      } else {
        Alert.alert('Nothing to restore', 'We couldn’t find a previous purchase on this account.');
      }
    } finally {
      setBusy(null);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topRow}>
        <TouchableOpacity style={styles.closeButton} onPress={() => navigation.goBack()} hitSlop={12}>
          <Ionicons name="close" size={20} color="#0f1b2d" />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <View style={styles.iconWrap}>
          <Ionicons name="sparkles" size={30} color="#1ec873" />
        </View>

        <Text style={styles.heading}>
          {outOfScans
            ? `You’ve used your ${FREE_SCANS_PER_MONTH} free scans this month`
            : 'Go unlimited on scans'}
        </Text>
        <Text style={styles.subheading}>Scan as many receipts as you want, with no monthly limit.</Text>

        <View style={styles.perks}>
          {PERKS.map((perk) => (
            <View key={perk} style={styles.perkRow}>
              <Ionicons name="checkmark-circle" size={20} color="#1ec873" />
              <Text style={styles.perkText}>{perk}</Text>
            </View>
          ))}
        </View>

        <View style={styles.spacer} />

        <View style={styles.priceBlock}>
          <Text style={styles.priceMain}>
            Just <Text style={styles.priceValue}>{price}</Text>
          </Text>
          <Text style={styles.priceSub}>One-time payment. Unlocks scans forever.</Text>
        </View>

        <TouchableOpacity
          style={[styles.buyButton, busy && styles.buttonBusy]}
          onPress={handlePurchase}
          disabled={!!busy}
          activeOpacity={0.9}
        >
          {busy === 'buy' ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.buyButtonText}>Continue</Text>}
        </TouchableOpacity>

        <View style={styles.linksRow}>
          <TouchableOpacity onPress={handleRestore} disabled={!!busy} hitSlop={8}>
            <Text style={styles.linkText}>{busy === 'restore' ? 'Restoring…' : 'Restore Purchases'}</Text>
          </TouchableOpacity>
          <Text style={styles.linkDivider}>· </Text>
          <TouchableOpacity onPress={() => navigation.navigate('TermsOfService')} hitSlop={8}>
            <Text style={styles.linkText}>Terms</Text>
          </TouchableOpacity>
          <Text style={styles.linkDivider}>· </Text>
          <TouchableOpacity onPress={() => navigation.navigate('PrivacyPolicy')} hitSlop={8}>
            <Text style={styles.linkText}>Privacy</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  closeButton: {
    height: 32,
    width: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f2f4',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 24,
  },
  iconWrap: {
    alignSelf: 'center',
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: '#e8fff2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  heading: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f1b2d',
    textAlign: 'center',
  },
  subheading: {
    marginTop: 10,
    fontSize: 15,
    color: '#6b7b8e',
    textAlign: 'center',
    lineHeight: 21,
  },
  perks: {
    marginTop: 26,
    gap: 14,
  },
  perkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  perkText: {
    fontSize: 15,
    color: '#1c2433',
    fontWeight: '500',
    flex: 1,
  },
  spacer: {
    flex: 1,
  },
  priceBlock: {
    alignItems: 'center',
    marginBottom: 20,
  },
  priceMain: {
    fontSize: 17,
    fontWeight: '600',
    color: '#0f1b2d',
  },
  priceValue: {
    fontWeight: '800',
    fontSize: 19,
  },
  priceSub: {
    marginTop: 4,
    fontSize: 13,
    color: '#8a95a3',
  },
  buyButton: {
    backgroundColor: '#1ec873',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  buttonBusy: {
    opacity: 0.8,
  },
  buyButtonText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '800',
  },
  linksRow: {
    marginTop: 18,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  linkText: {
    color: '#6b7b8e',
    fontSize: 13,
    fontWeight: '600',
  },
  linkDivider: {
    color: '#c3ccd4',
    fontSize: 13,
    marginHorizontal: 6,
  },
});
