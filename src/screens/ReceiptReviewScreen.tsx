import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';

import { RootStackParamList, ReceiptItem } from '../types/navigation';
import { GradientHeader } from '../components/GradientHeader';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'ReceiptReview'>;
type RouteProps = RouteProp<RootStackParamList, 'ReceiptReview'>;

export default function ReceiptReviewScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { items, totals, restaurantName, mismatchWarning } = route.params;

  const [editableItems, setEditableItems] = React.useState(
    items.map((item, index) => ({
      ...item,
      id: item.id ?? `${item.name}-${index}`,
      priceStr: item.price.toFixed(2),
    })),
  );
  const [chargeInputs, setChargeInputs] = React.useState({
    serviceCharge: totals.serviceCharge ?? 0,
    tax: totals.tax,
    tip: totals.tip,
  });

  const subtotal = React.useMemo(
    () => editableItems.reduce((sum, item) => sum + (isNaN(item.price) ? 0 : item.price), 0),
    [editableItems],
  );

  const parsedCharges = {
    serviceCharge: Number(chargeInputs.serviceCharge) || 0,
    tax: Number(chargeInputs.tax) || 0,
    tip: Number(chargeInputs.tip) || 0,
  };

  const total = subtotal + parsedCharges.tax + parsedCharges.tip + parsedCharges.serviceCharge;

  const handleItemPriceChange = (id: string, value: string) => {
    setEditableItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, priceStr: value, price: Number(parseFloat(value) || 0) }
          : item,
      ),
    );
  };

  const handleChargeChange = (key: 'serviceCharge' | 'tax' | 'tip', value: string) => {
    const numeric = Number(parseFloat(value) || 0);
    setChargeInputs((prev) => ({ ...prev, [key]: numeric }));
  };

  const handleContinue = () => {
    const taxRate = subtotal > 0 && parsedCharges.tax > 0 ? (parsedCharges.tax / subtotal) * 100 : totals.taxRate;
    const updatedTotals = {
      ...totals,
      subtotal,
      tax: parsedCharges.tax,
      tip: parsedCharges.tip,
      serviceCharge: parsedCharges.serviceCharge,
      total,
      taxRate: taxRate ? Number(taxRate.toFixed(2)) : undefined,
    };

    const cleanedItems: ReceiptItem[] = editableItems.map(({ priceStr, ...rest }) => rest);

    navigation.navigate('AddParticipants', {
      items: cleanedItems,
      restaurantName,
      totals: updatedTotals,
    });
  };

  const handleScanAgain = () => {
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <GradientHeader title="Review Receipt" subtitle={restaurantName || 'Check the details'} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Items</Text>
          <Text style={styles.helperText}>Prices below are line totals (price x quantity).</Text>
          {mismatchWarning ? (
            <View style={styles.warnBox}>
              <Text style={styles.warnTitle}>Totals don&apos;t match</Text>
              <Text style={styles.warnBody}>
                Parsed subtotal ${mismatchWarning.parsedSubtotal.toFixed(2)} vs computed $
                {mismatchWarning.computedSubtotal.toFixed(2)}. Please review the line totals.
              </Text>
            </View>
          ) : null}
          <View style={styles.items}>
            {editableItems.map((item) => (
              <View key={item.id} style={styles.row}>
                <View style={styles.itemTextBlock}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.itemMeta}>Qty: {item.quantity}</Text>
                </View>
                <View style={styles.priceInputWrapper}>
                  <Text style={styles.prefix}>$</Text>
                  <TextInput
                    style={styles.priceInput}
                    value={item.priceStr}
                    onChangeText={(val) => handleItemPriceChange(item.id, val)}
                    keyboardType="decimal-pad"
                    inputMode="decimal"
                  />
                </View>
              </View>
            ))}
          </View>

          <View style={styles.divider} />

          <Text style={styles.subheading}>Additional Charges</Text>
          <View style={styles.row}>
            <Text style={styles.chargeLabel}>Subtotal</Text>
            <Text style={styles.chargeValue}>${subtotal.toFixed(2)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.chargeLabel}>Service Charge</Text>
            <View style={styles.priceInputWrapper}>
              <Text style={styles.prefix}>$</Text>
              <TextInput
                style={styles.priceInput}
                value={parsedCharges.serviceCharge.toString()}
                onChangeText={(val) => handleChargeChange('serviceCharge', val)}
                keyboardType="decimal-pad"
                inputMode="decimal"
              />
            </View>
          </View>
          <View style={styles.row}>
            <Text style={styles.chargeLabel}>Tax</Text>
            <View style={styles.priceInputWrapper}>
              <Text style={styles.prefix}>$</Text>
              <TextInput
                style={styles.priceInput}
                value={parsedCharges.tax.toString()}
                onChangeText={(val) => handleChargeChange('tax', val)}
                keyboardType="decimal-pad"
                inputMode="decimal"
              />
            </View>
          </View>
          <View style={styles.row}>
            <Text style={styles.chargeLabel}>Tip</Text>
            <View style={styles.priceInputWrapper}>
              <Text style={styles.prefix}>$</Text>
              <TextInput
                style={styles.priceInput}
                value={parsedCharges.tip.toString()}
                onChangeText={(val) => handleChargeChange('tip', val)}
                keyboardType="decimal-pad"
                inputMode="decimal"
              />
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>${total.toFixed(2)}</Text>
          </View>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity style={styles.secondaryButton} onPress={handleScanAgain} activeOpacity={0.9}>
            <Text style={styles.secondaryText}>Scan Again</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.primaryButton} onPress={handleContinue} activeOpacity={0.9}>
            <Text style={styles.primaryText}>Continue to Split</Text>
          </TouchableOpacity>
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
    padding: 20,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e8f0ec',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1c2433',
    marginBottom: 10,
  },
  items: {
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
  },
  itemTextBlock: {
    flex: 1,
    minWidth: 0,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1c2433',
  },
  itemMeta: {
    color: '#7a8a9b',
    marginTop: 2,
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1c2433',
  },
  priceInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 90,
    maxWidth: 120,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: '#f8fafc',
  },
  prefix: {
    color: '#6b7b8e',
    marginRight: 4,
  },
  priceInput: {
    minWidth: 60,
    textAlign: 'right',
    color: '#1c2433',
    fontWeight: '700',
  },
  warnBox: {
    marginTop: 10,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#fff4f2',
    borderWidth: 1,
    borderColor: '#f4b7ab',
  },
  warnTitle: {
    color: '#d94c3f',
    fontWeight: '800',
    marginBottom: 4,
  },
  warnBody: {
    color: '#d94c3f',
  },
  helperText: {
    color: '#7a8a9b',
    marginBottom: 8,
  },
  divider: {
    height: 1,
    backgroundColor: '#e8f0ec',
    marginVertical: 14,
  },
  subheading: {
    fontSize: 15,
    fontWeight: '700',
    color: '#6b7b8e',
    marginBottom: 10,
  },
  chargeLabel: {
    color: '#6b7b8e',
    fontSize: 15,
  },
  chargeValue: {
    color: '#1c2433',
    fontWeight: '700',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1c2433',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#16b269',
  },
  actions: {
    marginTop: 18,
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
});
