import React from 'react';
import { ScrollView, View, Text, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

const bills = [
  { id: '1', title: 'Tokyo Deli', people: 4, date: 'Mar 15, 2025', amount: '$142', status: 'settled' },
  { id: '2', title: 'Pizza Paradise', people: 3, date: 'Mar 8, 2025', amount: '$89', status: 'pending' },
  { id: '3', title: 'Burger Haven', people: 2, date: 'Mar 1, 2025', amount: '$67', status: 'settled' },
];

const stats = [
  { label: 'Total Spent', value: '$488' },
  { label: 'Avg/Meal', value: '$98' },
  { label: 'Bills Split', value: '5' },
];

export default function HistoryScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <View style={styles.heroOverlay} />
        <Text style={styles.heroTitle}>Bill History</Text>
        <Text style={styles.heroSubtitle}>Your spending insights</Text>
        <View style={styles.statRow}>
          {stats.map((stat) => (
            <View key={stat.label} style={styles.statCard}>
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.body}>
        <View style={styles.insightCard}>
          <View style={styles.insightIcon}>
            <Ionicons name="trending-up" size={24} color="#7b3aed" />
          </View>
          <View>
            <Text style={styles.insightTitle}>March Insights</Text>
            <Text style={styles.insightSubtitle}>You spent $298 on dining this month</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>All Bills</Text>

        {bills.map((bill) => {
          const statusStyles = getStatusStyles(bill.status);
          return (
            <View key={bill.id} style={styles.billCard}>
              <View style={styles.billLeft}>
                <View style={styles.billIcon}>
                  <Ionicons name="receipt-outline" size={22} color="#8ba0ae" />
                </View>
                <View>
                  <Text style={styles.billTitle}>{bill.title}</Text>
                  <View style={styles.billMeta}>
                    <Ionicons name="people-outline" size={14} color="#7a8a9b" />
                    <Text style={styles.billMetaText}>{bill.people} people</Text>
                    <View style={styles.dot} />
                    <Text style={styles.billMetaText}>{bill.date}</Text>
                  </View>
                </View>
              </View>
              <View style={styles.billRight}>
                <Text style={styles.billAmount}>{bill.amount}</Text>
                <View style={[styles.statusPill, statusStyles.pill]}>
                  <Text style={[styles.statusText, statusStyles.text]}>{bill.status}</Text>
                </View>
              </View>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

function getStatusStyles(status: string) {
  if (status === 'pending') {
    return { pill: { backgroundColor: '#ffe5d7' }, text: { color: '#f97316' } };
  }
  return { pill: { backgroundColor: '#d7f6e8' }, text: { color: '#1fbf74' } };
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
    paddingBottom: 24,
    backgroundColor: '#1fcf7c',
    overflow: 'hidden',
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.15,
    backgroundColor: '#0cae63',
  },
  heroTitle: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '800',
  },
  heroSubtitle: {
    color: '#e6fff2',
    marginTop: 6,
    fontSize: 15,
    marginBottom: 18,
  },
  statRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: '#22d586',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  statValue: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '800',
  },
  statLabel: {
    color: '#e6fff2',
    fontSize: 13,
    marginTop: 4,
  },
  body: {
    paddingHorizontal: 20,
    paddingTop: 18,
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
    marginBottom: 12,
  },
  billCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 14,
    backgroundColor: '#ffffff',
    marginBottom: 12,
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
