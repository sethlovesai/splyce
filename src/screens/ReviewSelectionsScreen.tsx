import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GradientHeader } from '../components/GradientHeader';
import { RootStackParamList, ReceiptItem, SummaryEntry } from '../types/navigation';
import { unassignedItemsMessage } from '../utils/receiptItems';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'ReviewSelections'>;
type RouteProps = RouteProp<RootStackParamList, 'ReviewSelections'>;

const PARTICIPANT_COLORS = ['#1ec873', '#f59e0b', '#3b82f6', '#ef4444', '#8b5cf6', '#10b981', '#f97316'];

export default function ReviewSelectionsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const insets = useSafeAreaInsets();
  const { items, selections, participants, restaurantName, totals, summary, suggestedCategory } = route.params;
  const totalBill = totals.total ?? totals.subtotal + totals.tax + totals.tip + (totals.serviceCharge ?? 0);

  const getColor = (user: string) => {
    const idx = participants.indexOf(user);
    return PARTICIPANT_COLORS[idx % PARTICIPANT_COLORS.length] || '#1ec873';
  };

  const proceedToSummary = () => {
    navigation.navigate('Summary', { summary, restaurantName, totals, suggestedCategory });
  };

  const handleContinue = () => {
    // Warn if any item has nobody assigned — its cost silently drops out of
    // everyone's share — but let the host override and split anyway.
    const unassigned = items.filter((item) => !(selections[item.id]?.length));
    if (unassigned.length > 0) {
      Alert.alert('Assign every item first', unassignedItemsMessage(unassigned.map((i) => i.name)), [
        { text: 'Keep assigning', style: 'cancel' },
        { text: 'Splyce anyway', style: 'destructive', onPress: proceedToSummary },
      ]);
      return;
    }
    proceedToSummary();
  };

  return (
    <View style={styles.container}>
      <GradientHeader title="Review Selections" subtitle={`${restaurantName} • Who picked what`} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.list}>
          {items.map((item: ReceiptItem) => {
            const selectedUsers = selections[item.id] ?? [];
            return (
              <View key={item.id} style={styles.itemCard}>
                <View style={styles.itemHeader}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.itemPrice}>${item.price.toFixed(2)}</Text>
                </View>
                <Text style={styles.itemMeta}>Qty {item.quantity}</Text>
                {selectedUsers.length > 0 ? (
                  <View style={styles.avatarRow}>
                    {selectedUsers.map((user) => (
                      <View key={user} style={[styles.avatar, { backgroundColor: getColor(user) }]}>
                        <Text style={styles.avatarText}>{user[0]?.toUpperCase()}</Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.unassigned}>Not assigned yet</Text>
                )}
              </View>
            );
          })}
        </View>

      </ScrollView>
      <View style={[styles.footer, { paddingBottom: 20 + insets.bottom }]}>
        {/* <TouchableOpacity style={styles.secondaryButton} onPress={() => navigation.goBack()} activeOpacity={0.9}>
          <Text style={styles.secondaryText}>Back to Selection</Text>
        </TouchableOpacity> */}
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total Bill:</Text>
          <Text style={styles.totalValue}>${totalBill.toFixed(2)}</Text>
        </View>
        <TouchableOpacity style={styles.primaryButton} onPress={handleContinue} activeOpacity={0.9}>
          <Text style={styles.primaryText}>Splyce the Receipt</Text>
        </TouchableOpacity>
      </View>
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
    paddingBottom: 180,
    gap: 16,
  },
  list: {
    gap: 12,
  },
  itemCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  itemName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f1b2d',
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f1b2d',
  },
  itemMeta: {
    color: '#7a8a9b',
    marginTop: 4,
  },
  avatarRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 10,
  },
  avatar: {
    height: 28,
    width: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 12,
  },
  unassigned: {
    marginTop: 8,
    color: '#d97757',
    fontWeight: '600',
  },
  actions: {
    gap: 10,
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: 20,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderColor: '#e6ecf2',
    gap: 10,
  },
  primaryButton: {
    backgroundColor: '#1ec873',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  primaryText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 16,
  },
  secondaryButton: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
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
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    paddingHorizontal: 4,
  },
  totalLabel: {
    color: '#7a8a9b',
    fontWeight: '700',
  },
  totalValue: {
    color: '#0f1b2d',
    fontWeight: '800',
    fontSize: 16,
  },
});
