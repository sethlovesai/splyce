import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { GradientHeader } from '../components/GradientHeader';
import { getReceipts, StoredReceipt } from '../storage/receipts';

type GroupedBills = {
  heading: string;
  bills: StoredReceipt[];
};

export default function BillHistoryScreen() {
  const [receipts, setReceipts] = useState<StoredReceipt[]>([]);

  useFocusEffect(
    useCallback(() => {
      const load = async () => {
        const data = await getReceipts();
        setReceipts(data);
      };
      load();
    }, []),
  );

  const totalSpent = receipts.reduce((sum, r) => sum + r.total, 0);
  const avgMeal = receipts.length ? totalSpent / receipts.length : 0;
  const grouped = groupReceipts(receipts);

  return (
    <View style={styles.container}>
      <GradientHeader title="Bill History" subtitle="Your spending insights" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.statsRow}>
          <StatCard label="Total Spent" value={`$${totalSpent.toFixed(0)}`} />
          <StatCard label="Avg/Meal" value={`$${avgMeal.toFixed(0)}`} />
          <StatCard label="Bills Split" value={`${receipts.length}`} />
        </View>

        <View style={styles.insightCard}>
          <View style={styles.insightIcon}>
            <Ionicons name="trending-up" size={22} color="#7b3aed" />
          </View>
          <View>
            <Text style={styles.insightTitle}>Monthly Insights</Text>
            <Text style={styles.insightSubtitle}>
              You spent ${totalSpent.toFixed(0)} across {receipts.length} bills
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>All Bills</Text>

        {grouped.map((group) => (
          <View key={group.heading} style={{ marginBottom: 12 }}>
            <Text style={styles.groupHeading}>{group.heading}</Text>
            {group.bills.map((bill) => (
              <View key={bill.id} style={styles.billCard}>
                <View style={styles.billLeft}>
                  <View style={styles.billIcon}>
                    <Ionicons name="receipt-outline" size={20} color="#8ba0ae" />
                  </View>
                  <View>
                    <Text style={styles.billTitle}>{bill.restaurantName}</Text>
                    <View style={styles.billMeta}>
                      <Ionicons name="people-outline" size={14} color="#7a8a9b" />
                      <Text style={styles.billMetaText}>Split</Text>
                      <View style={styles.dot} />
                      <Text style={styles.billMetaText}>
                        {new Date(bill.date).toLocaleDateString()}
                      </Text>
                    </View>
                  </View>
                </View>
                <View style={styles.billRight}>
                  <Text style={styles.billAmount}>${bill.total.toFixed(2)}</Text>
                  <View style={[styles.statusPill, { backgroundColor: '#d7f6e8' }]}>
                    <Text style={[styles.statusText, { color: '#1fbf74' }]}>settled</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

function groupReceipts(receipts: StoredReceipt[]): GroupedBills[] {
  const now = new Date();
  const groups: Record<string, StoredReceipt[]> = {
    Today: [],
    'This Week': [],
    'This Month': [],
    Older: [],
  };

  receipts.forEach((r) => {
    const d = new Date(r.date);
    const diffDays = (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24);
    if (diffDays < 1) groups['Today'].push(r);
    else if (diffDays < 7) groups['This Week'].push(r);
    else if (diffDays < 30) groups['This Month'].push(r);
    else groups['Older'].push(r);
  });

  return Object.entries(groups)
    .filter(([, arr]) => arr.length)
    .map(([heading, bills]) => ({ heading, bills }));
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
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
    paddingBottom: 32,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#1ec873',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 12,
  },
  statValue: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '800',
  },
  statLabel: {
    color: '#e6fff2',
    marginTop: 6,
  },
  insightCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#efe9ff',
    marginBottom: 18,
    gap: 12,
  },
  insightIcon: {
    height: 44,
    width: 44,
    borderRadius: 12,
    backgroundColor: '#d9c9ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  insightTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1c2433',
  },
  insightSubtitle: {
    color: '#546070',
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1c2433',
    marginBottom: 10,
  },
  groupHeading: {
    color: '#7a8a9b',
    fontSize: 13,
    marginBottom: 8,
    marginTop: 6,
  },
  billCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 14,
    backgroundColor: '#ffffff',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  billLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  billIcon: {
    height: 44,
    width: 44,
    borderRadius: 12,
    backgroundColor: '#f2f4f7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  billTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1c2433',
  },
  billMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  billMetaText: {
    color: '#7a8a9b',
    fontSize: 13,
  },
  dot: {
    height: 4,
    width: 4,
    borderRadius: 2,
    backgroundColor: '#c7d0d8',
  },
  billRight: {
    alignItems: 'flex-end',
    gap: 6,
    marginLeft: 12,
  },
  billAmount: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1c2433',
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  statusText: {
    fontWeight: '700',
    fontSize: 12,
    textTransform: 'lowercase',
  },
});
