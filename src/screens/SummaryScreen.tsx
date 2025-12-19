import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Share } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { RootStackParamList } from '../types/navigation';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { GradientHeader } from '../components/GradientHeader';
import { addReceipt } from '../storage/receipts';

type RouteProps = RouteProp<RootStackParamList, 'Summary'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Summary'>;

const SummaryScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { summary, restaurantName, totals } = route.params;
  const totalBill = totals.subtotal + totals.tax + totals.tip;
  const taxRate = totals.taxRate ?? (totals.subtotal > 0 ? (totals.tax / totals.subtotal) * 100 : 0);
  const savedRef = React.useRef(false);
  const saveReceipt = async () => {
    if (savedRef.current) return;
    savedRef.current = true;
    await addReceipt({
      id: Date.now().toString(),
      restaurantName,
      total: totalBill,
      date: new Date().toISOString(),
      summary,
    });
  };

  const shareReceipt = async () => {
    await saveReceipt();

    const lines = summary
      .map(
        (p) =>
          `${p.name}: $${p.totalOwed.toFixed(2)}`,
      )
      .join('\n');
    const breakdownLabel = `Breakdown (${(taxRate || 0).toFixed(2)}% tax):`;
    const message = `*Splyce bill for ${restaurantName}*\nTotal: $${totalBill.toFixed(
      2,
    )}\n\n${breakdownLabel}\n${lines}`;
    await Share.share({ message, title: `Splyce bill for ${restaurantName}` });
  };

  const handleBackHome = async () => {
    await saveReceipt();
    navigation.navigate('Home');
  };

  return (
    <View style={styles.container}>
      <GradientHeader title="Split Summary" subtitle={restaurantName} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.totalCard}>
          <Text style={styles.totalLabel}>Total Bill</Text>
          <Text style={styles.totalAmount}>${totalBill.toFixed(2)}</Text>
          <View style={styles.totalBreakdown}>
            <Text style={styles.breakdownText}>Subtotal ${totals.subtotal.toFixed(2)}</Text>
            <Text style={styles.breakdownText}>Tax ${totals.tax.toFixed(2)}</Text>
            <Text style={styles.breakdownText}>Tip ${totals.tip.toFixed(2)}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Who Owes What</Text>
        <View style={styles.peopleList}>
          {summary.map((person) => {
            return (
              <View key={person.name} style={styles.personCard}>
                <View style={styles.personLeft}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{person.name[0]}</Text>
                  </View>
                  <View style={styles.personTextContainer}>
                    <Text style={styles.personName}>{person.name}</Text>
                    <Text style={styles.personMeta}>{person.itemsCount} items</Text>
                  </View>
                </View>
                <View style={styles.personRight}>
                  <Text style={styles.amount}>${person.totalOwed.toFixed(2)}</Text>
                  {person.taxAmount !== undefined && person.taxAmount > 0 ? (
                    <Text style={styles.taxLine}>
                      Includes tax {person.taxRate ?? taxRate}% • ${person.taxAmount.toFixed(2)}
                    </Text>
                  ) : null}
                  {/* <View style={styles.pendingPill}>
                    <Text style={styles.pendingText}>Pending</Text>
                  </View> */}
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
      <View style={styles.footer}>
        <TouchableOpacity style={styles.shareButton} onPress={shareReceipt} activeOpacity={0.9}>
          <Ionicons name="share-social-outline" size={18} color="#1ec873" />
          <Text style={styles.shareText}>Share receipt</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryButton} onPress={handleBackHome} activeOpacity={0.9}>
          <Text style={styles.secondaryText}>Back to Home</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  content: {
    padding: 20,
    paddingBottom: 32,
  },
  totalCard: {
    backgroundColor: '#1ec873',
    borderRadius: 16,
    padding: 18,
    marginBottom: 18,
  },
  totalLabel: {
    color: '#e8ffef',
    fontSize: 14,
  },
  totalAmount: {
    color: '#ffffff',
    fontSize: 32,
    fontWeight: '700',
    marginTop: 6,
  },
  totalBreakdown: {
    marginTop: 10,
  },
  breakdownText: {
    color: '#e8ffef',
    marginBottom: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f1b2d',
    marginBottom: 10,
  },
  peopleList: {},
  personCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  personLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  personTextContainer: {
    marginLeft: 10,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#e6f6ed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#1ec873',
    fontWeight: '700',
  },
  personName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f1b2d',
  },
  personMeta: {
    color: '#7a8a9b',
    marginTop: 2,
  },
  personRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  amount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f1b2d',
  },
  taxLine: {
    marginTop: 4,
    color: '#7a8a9b',
    fontSize: 12,
  },
  pendingPill: {
    marginTop: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#e6f6ed',
    borderRadius: 12,
  },
  pendingText: {
    color: '#1ec873',
    fontWeight: '600',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderColor: '#e6ecf2',
    backgroundColor: '#ffffff',
    gap: 10,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1ec873',
    backgroundColor: '#e9f7ef',
  },
  shareText: {
    color: '#1ec873',
    fontWeight: '800',
    fontSize: 15,
  },
  secondaryButton: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#dfe5ec',
  },
  secondaryText: {
    color: '#1c2433',
    fontWeight: '700',
    fontSize: 15,
  },
});

export default SummaryScreen;
