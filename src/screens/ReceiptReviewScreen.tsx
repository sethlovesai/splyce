import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
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
  const { items, totals, restaurantName } = route.params;

  const [editableItems, setEditableItems] = React.useState(
    items.map((item, index) => ({
      ...item,
      id: item.id ?? `${item.name}-${index}`,
      priceStr: item.price.toFixed(2),
    })),
  );
  const [chargeInputs, setChargeInputs] = React.useState({
    serviceCharge: totals.serviceCharge != null ? String(totals.serviceCharge) : '0',
    tax: totals.tax != null ? String(totals.tax) : '0',
    tip: totals.tip != null ? String(totals.tip) : '0',
  });
  const [adjustMode, setAdjustMode] = React.useState<'item' | 'charge' | null>(null);
  const [newItemName, setNewItemName] = React.useState('');
  const [newItemPrice, setNewItemPrice] = React.useState('');
  const [newChargeLabel, setNewChargeLabel] = React.useState('');
  const [newChargeAmount, setNewChargeAmount] = React.useState('');
  const [newChargeKind, setNewChargeKind] = React.useState<'extra' | 'discount'>('extra');
  const [showChargeKindMenu, setShowChargeKindMenu] = React.useState(false);
  const [editTarget, setEditTarget] = React.useState<
    | { type: 'item'; id: string }
    | { type: 'charge'; id: string }
    | { type: 'baseCharge'; key: 'serviceCharge' | 'tax' | 'tip' }
    | null
  >(null);
  const [editName, setEditName] = React.useState('');
  const [editQuantity, setEditQuantity] = React.useState('1');
  const [editPrice, setEditPrice] = React.useState('');
  const [editChargeKind, setEditChargeKind] = React.useState<'extra' | 'discount'>('extra');
  const [showEditKindMenu, setShowEditKindMenu] = React.useState(false);
  const [baseChargeLabels, setBaseChargeLabels] = React.useState({
    serviceCharge: 'Service Charge',
    tax: 'Tax',
    tip: 'Tip',
  });
  const [baseChargeQuantities, setBaseChargeQuantities] = React.useState({
    serviceCharge: 1,
    tax: 1,
    tip: 1,
  });
  const [extraCharges, setExtraCharges] = React.useState<
    {
      id: string;
      name: string;
      amount: number;
      amountStr: string;
      kind: 'extra' | 'discount';
      quantity: number;
    }[]
  >([]);

  const subtotal = React.useMemo(
    () => editableItems.reduce((sum, item) => sum + (isNaN(item.price) ? 0 : item.price), 0),
    [editableItems],
  );

  const parsedCharges = {
    serviceCharge: Number(parseFloat(chargeInputs.serviceCharge) || 0),
    tax: Number(parseFloat(chargeInputs.tax) || 0),
    tip: Number(parseFloat(chargeInputs.tip) || 0),
  };

  const extraChargesTotal = React.useMemo(
    () =>
      extraCharges.reduce(
        (sum, charge) => sum + (charge.kind === 'discount' ? -charge.amount : charge.amount),
        0,
      ),
    [extraCharges],
  );

  const total = subtotal + parsedCharges.tax + parsedCharges.tip + parsedCharges.serviceCharge + extraChargesTotal;

  const sanitizeDecimalInput = (value: string) => {
    const sanitized = value.replace(/[^0-9.]/g, '');
    const parts = sanitized.split('.');
    return parts.length > 1 ? `${parts[0]}.${parts.slice(1).join('')}` : sanitized;
  };

  const normalizeTrailingDot = (value: string) => (value.endsWith('.') ? value.slice(0, -1) : value);

  const handleAddItem = () => {
    const name = newItemName.trim();
    const price = Number(parseFloat(newItemPrice) || 0);
    if (!name || price <= 0) {
      return;
    }
    const id = `${name}-${Date.now()}`;
    setEditableItems((prev) => [
      ...prev,
      { id, name, quantity: 1, price, priceStr: price.toFixed(2) },
    ]);
    setNewItemName('');
    setNewItemPrice('');
    closeAdjustModal();
  };

  const handleAddCharge = () => {
    const label =
      newChargeLabel.trim() || (newChargeKind === 'discount' ? 'Discount' : 'Additional charge');
    const amount = Number(parseFloat(newChargeAmount) || 0);
    if (amount <= 0) {
      return;
    }
    const id = `${label}-${Date.now()}`;
    setExtraCharges((prev) => [
      ...prev,
      { id, name: label, amount, amountStr: amount.toFixed(2), kind: newChargeKind, quantity: 1 },
    ]);
    setNewChargeLabel('');
    setNewChargeAmount('');
    setNewChargeKind('extra');
    setShowChargeKindMenu(false);
    closeAdjustModal();
  };

  const openEditItem = (item: typeof editableItems[number]) => {
    setAdjustMode(null);
    setEditTarget({ type: 'item', id: item.id });
    setEditName(item.name);
    setEditQuantity(String(item.quantity ?? 1));
    setEditPrice(item.priceStr ?? item.price.toFixed(2));
    setShowEditKindMenu(false);
  };

  const openEditCharge = (charge: typeof extraCharges[number]) => {
    setAdjustMode(null);
    setEditTarget({ type: 'charge', id: charge.id });
    setEditName(charge.name);
    setEditQuantity(String(charge.quantity ?? 1));
    setEditPrice(charge.amountStr ?? charge.amount.toFixed(2));
    setEditChargeKind(charge.kind);
    setShowEditKindMenu(false);
  };

  const openEditBaseCharge = (key: 'serviceCharge' | 'tax' | 'tip') => {
    setAdjustMode(null);
    setEditTarget({ type: 'baseCharge', key });
    setEditName(baseChargeLabels[key]);
    setEditQuantity(String(baseChargeQuantities[key]));
    setEditPrice(chargeInputs[key]);
    setShowEditKindMenu(false);
  };

  const handleEditQuantityChange = (value: string) => {
    const sanitized = value.replace(/[^0-9]/g, '');
    setEditQuantity(sanitized);
  };

  const handleEditPriceChange = (value: string) => {
    setEditPrice(sanitizeDecimalInput(value));
  };

  const handleEditPriceBlur = () => {
    setEditPrice((prev) => normalizeTrailingDot(prev));
  };

  const handleSaveEdit = () => {
    if (!editTarget) return;
    const name = editName.trim();
    const quantity = Math.max(1, parseInt(editQuantity, 10) || 1);
    const normalizedPrice = normalizeTrailingDot(editPrice);
    const priceValue = Number(parseFloat(normalizedPrice) || 0);
    if (!name) {
      return;
    }
    if (editTarget.type === 'item') {
      setEditableItems((prev) =>
        prev.map((item) =>
          item.id === editTarget.id
            ? {
                ...item,
                name,
                quantity,
                price: priceValue,
                priceStr: Number.isNaN(priceValue) ? item.priceStr : priceValue.toFixed(2),
              }
            : item,
        ),
      );
    } else if (editTarget.type === 'charge') {
      setExtraCharges((prev) =>
        prev.map((charge) =>
          charge.id === editTarget.id
            ? {
                ...charge,
                name,
                quantity,
                amount: priceValue,
                amountStr: Number.isNaN(priceValue) ? charge.amountStr : priceValue.toFixed(2),
                kind: editChargeKind,
              }
            : charge,
        ),
      );
    } else {
      setBaseChargeLabels((prev) => ({ ...prev, [editTarget.key]: name }));
      setBaseChargeQuantities((prev) => ({ ...prev, [editTarget.key]: quantity }));
      setChargeInputs((prev) => ({ ...prev, [editTarget.key]: priceValue.toFixed(2) }));
    }
    closeEditModal();
  };

  const closeAdjustModal = () => {
    setAdjustMode(null);
    setShowChargeKindMenu(false);
  };

  const closeEditModal = () => {
    setEditTarget(null);
    setShowEditKindMenu(false);
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

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Items</Text>
          <Text style={styles.helperText}>Prices below are line totals (price x quantity).</Text>
          <View style={styles.items}>
            {editableItems.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.row}
                onPress={() => openEditItem(item)}
                activeOpacity={0.8}
              >
                <View style={styles.itemTextBlock}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.itemMeta}>Qty: {item.quantity}</Text>
                </View>
                <View style={styles.priceInputWrapper}>
                  <Text style={styles.prefix}>$</Text>
                  <Text style={styles.priceDisplay}>{item.priceStr}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity
            style={styles.addInlineButton}
            onPress={() => setAdjustMode('item')}
            activeOpacity={0.9}
          >
            <Text style={styles.addInlineText}>Add food or drink item</Text>
          </TouchableOpacity>

          <View style={styles.divider} />

          <Text style={styles.subheading}>Additional Charges</Text>
          <View style={styles.row}>
            <Text style={styles.chargeLabel}>Subtotal</Text>
            <Text style={styles.chargeValue}>${subtotal.toFixed(2)}</Text>
          </View>
          {extraCharges.map((charge) => (
            <TouchableOpacity
              key={charge.id}
              style={styles.row}
              onPress={() => openEditCharge(charge)}
              activeOpacity={0.8}
            >
              <View style={styles.chargeLabelBlock}>
                <Text style={styles.chargeLabel}>{charge.name}</Text>
                <Text style={styles.chargeMeta}>
                  {charge.kind === 'discount' ? 'Discount' : 'Extra charge'} • Qty: {charge.quantity}
                </Text>
              </View>
              <View style={styles.priceInputWrapper}>
                <Text style={styles.prefix}>{charge.kind === 'discount' ? '-$' : '$'}</Text>
                <Text style={styles.priceDisplay}>{charge.amountStr}</Text>
              </View>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={styles.row}
            onPress={() => openEditBaseCharge('serviceCharge')}
            activeOpacity={0.8}
          >
            <View style={styles.chargeLabelBlock}>
              <Text style={styles.chargeLabel}>{baseChargeLabels.serviceCharge}</Text>
              <Text style={styles.chargeMeta}>Qty: {baseChargeQuantities.serviceCharge}</Text>
            </View>
            <View style={styles.priceInputWrapper}>
              <Text style={styles.prefix}>$</Text>
              <Text style={styles.priceDisplay}>{chargeInputs.serviceCharge}</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.row}
            onPress={() => openEditBaseCharge('tax')}
            activeOpacity={0.8}
          >
            <View style={styles.chargeLabelBlock}>
              <Text style={styles.chargeLabel}>{baseChargeLabels.tax}</Text>
              <Text style={styles.chargeMeta}>Qty: {baseChargeQuantities.tax}</Text>
            </View>
            <View style={styles.priceInputWrapper}>
              <Text style={styles.prefix}>$</Text>
              <Text style={styles.priceDisplay}>{chargeInputs.tax}</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.row}
            onPress={() => openEditBaseCharge('tip')}
            activeOpacity={0.8}
          >
            <View style={styles.chargeLabelBlock}>
              <Text style={styles.chargeLabel}>{baseChargeLabels.tip}</Text>
              <Text style={styles.chargeMeta}>Qty: {baseChargeQuantities.tip}</Text>
            </View>
            <View style={styles.priceInputWrapper}>
              <Text style={styles.prefix}>$</Text>
              <Text style={styles.priceDisplay}>{chargeInputs.tip}</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.addInlineButton}
            onPress={() => setAdjustMode('charge')}
            activeOpacity={0.9}
          >
            <Text style={styles.addInlineText}>Add additional charge</Text>
          </TouchableOpacity>

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
      </KeyboardAvoidingView>

      <Modal
        transparent
        visible={adjustMode !== null}
        animationType="fade"
        onRequestClose={closeAdjustModal}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <View style={styles.modalBackdrop}>
            <TouchableWithoutFeedback onPress={() => {}} accessible={false}>
              <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {adjustMode === 'item' ? 'Add item' : 'Add charge'}
            </Text>
            <Text style={styles.modalSubtitle}>
              {adjustMode === 'item'
                ? 'Add a missing food or drink item.'
                : 'Add an extra charge or discount.'}
            </Text>

            {adjustMode === 'item' ? (
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Item details</Text>
                <View style={styles.modalFieldRow}>
                  <Text style={styles.modalLabel}>Name</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={newItemName}
                    onChangeText={setNewItemName}
                    placeholder="Item name"
                    placeholderTextColor="#9aa8b6"
                  />
                </View>
                <View style={styles.modalFieldRow}>
                  <Text style={styles.modalLabel}>Total</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={newItemPrice}
                    onChangeText={setNewItemPrice}
                    placeholder="Total amount"
                    placeholderTextColor="#9aa8b6"
                    keyboardType="decimal-pad"
                    inputMode="decimal"
                  />
                </View>
                <TouchableOpacity style={styles.modalActionButton} onPress={handleAddItem} activeOpacity={0.9}>
                  <Text style={styles.modalActionText}>Add item</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Charge details</Text>
                <View style={styles.modalFieldRow}>
                  <Text style={styles.modalLabel}>Name</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={newChargeLabel}
                    onChangeText={setNewChargeLabel}
                    placeholder="Charge name"
                    placeholderTextColor="#9aa8b6"
                  />
                </View>
                <View style={styles.modalFieldRow}>
                  <Text style={styles.modalLabel}>Amount</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={newChargeAmount}
                    onChangeText={setNewChargeAmount}
                    placeholder="Amount"
                    placeholderTextColor="#9aa8b6"
                    keyboardType="decimal-pad"
                    inputMode="decimal"
                  />
                </View>
                <View style={styles.modalFieldRow}>
                  <Text style={styles.modalLabel}>Type</Text>
                  <View style={styles.dropdownWrap}>
                    <TouchableOpacity
                      style={styles.dropdownButton}
                      onPress={() => setShowChargeKindMenu((prev) => !prev)}
                      activeOpacity={0.9}
                    >
                      <Text style={styles.dropdownText}>
                        {newChargeKind === 'discount' ? 'Discount' : 'Extra charge'}
                      </Text>
                    </TouchableOpacity>
                    {showChargeKindMenu ? (
                      <View style={styles.dropdownMenu}>
                        <TouchableOpacity
                          style={styles.dropdownOption}
                          onPress={() => {
                            setNewChargeKind('extra');
                            setShowChargeKindMenu(false);
                          }}
                        >
                          <Text style={styles.dropdownOptionText}>Extra charge</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.dropdownOption}
                          onPress={() => {
                            setNewChargeKind('discount');
                            setShowChargeKindMenu(false);
                          }}
                        >
                          <Text style={styles.dropdownOptionText}>Discount</Text>
                        </TouchableOpacity>
                      </View>
                    ) : null}
                  </View>
                </View>
                <TouchableOpacity style={styles.modalActionButton} onPress={handleAddCharge} activeOpacity={0.9}>
                  <Text style={styles.modalActionText}>Add charge</Text>
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity style={styles.modalCloseButton} onPress={closeAdjustModal}>
              <Text style={styles.modalCloseText}>Cancel</Text>
            </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      <Modal
        transparent
        visible={editTarget !== null}
        animationType="fade"
        onRequestClose={closeEditModal}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <View style={styles.modalBackdrop}>
            <TouchableWithoutFeedback onPress={() => {}} accessible={false}>
              <View style={styles.modalCard}>
                <Text style={styles.modalTitle}>
                  {editTarget?.type === 'item' ? 'Edit item' : 'Edit charge'}
                </Text>
                <Text style={styles.modalSubtitle}>
                  {editTarget?.type === 'item'
                    ? 'Update the item details below.'
                    : 'Update the charge details below.'}
                </Text>

                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>
                    {editTarget?.type === 'item' ? 'Item details' : 'Charge details'}
                  </Text>
                  <View style={styles.modalFieldRow}>
                    <Text style={styles.modalLabel}>Name</Text>
                    <TextInput
                      style={styles.modalInput}
                      value={editName}
                      onChangeText={setEditName}
                      placeholder={editTarget?.type === 'item' ? 'Item name' : 'Charge name'}
                      placeholderTextColor="#9aa8b6"
                    />
                  </View>
                  <View style={styles.modalFieldRow}>
                    <Text style={styles.modalLabel}>Qty</Text>
                    <TextInput
                      style={styles.modalInput}
                      value={editQuantity}
                      onChangeText={handleEditQuantityChange}
                      placeholder="Quantity"
                      placeholderTextColor="#9aa8b6"
                      keyboardType="number-pad"
                    />
                  </View>
                  <View style={styles.modalFieldRow}>
                    <Text style={styles.modalLabel}>Price</Text>
                    <TextInput
                      style={styles.modalInput}
                      value={editPrice}
                      onChangeText={handleEditPriceChange}
                      onBlur={handleEditPriceBlur}
                      placeholder="Price"
                      placeholderTextColor="#9aa8b6"
                      keyboardType="decimal-pad"
                      inputMode="decimal"
                    />
                  </View>
                  {editTarget?.type === 'charge' ? (
                    <View style={styles.modalFieldRow}>
                      <Text style={styles.modalLabel}>Type</Text>
                      <View style={styles.dropdownWrap}>
                        <TouchableOpacity
                          style={styles.dropdownButton}
                          onPress={() => setShowEditKindMenu((prev) => !prev)}
                          activeOpacity={0.9}
                        >
                          <Text style={styles.dropdownText}>
                            {editChargeKind === 'discount' ? 'Discount' : 'Extra charge'}
                          </Text>
                        </TouchableOpacity>
                        {showEditKindMenu ? (
                          <View style={styles.dropdownMenu}>
                            <TouchableOpacity
                              style={styles.dropdownOption}
                              onPress={() => {
                                setEditChargeKind('extra');
                                setShowEditKindMenu(false);
                              }}
                            >
                              <Text style={styles.dropdownOptionText}>Extra charge</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={styles.dropdownOption}
                              onPress={() => {
                                setEditChargeKind('discount');
                                setShowEditKindMenu(false);
                              }}
                            >
                              <Text style={styles.dropdownOptionText}>Discount</Text>
                            </TouchableOpacity>
                          </View>
                        ) : null}
                      </View>
                    </View>
                  ) : null}
                  <TouchableOpacity style={styles.modalActionButton} onPress={handleSaveEdit} activeOpacity={0.9}>
                    <Text style={styles.modalActionText}>Save changes</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity style={styles.modalCloseButton} onPress={closeEditModal}>
                  <Text style={styles.modalCloseText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f8f7',
  },
  flex: {
    flex: 1,
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
  chargeLabelBlock: {
    flex: 1,
    minWidth: 0,
  },
  chargeMeta: {
    color: '#9aa8b6',
    marginTop: 2,
    fontSize: 12,
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
  priceDisplay: {
    minWidth: 60,
    textAlign: 'right',
    color: '#1c2433',
    fontWeight: '700',
  },
  addInlineButton: {
    marginTop: 12,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#dfe5ec',
    backgroundColor: '#f7faf9',
  },
  addInlineText: {
    color: '#1c2433',
    fontWeight: '700',
    fontSize: 14,
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(19, 24, 33, 0.45)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 18,
    maxHeight: '90%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1c2433',
  },
  modalSubtitle: {
    color: '#6b7b8e',
    marginTop: 6,
    marginBottom: 12,
  },
  modalSection: {
    marginBottom: 14,
  },
  modalFieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  modalLabel: {
    width: 64,
    color: '#6b7b8e',
    fontWeight: '700',
  },
  modalSectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1c2433',
    marginBottom: 8,
  },
  modalRow: {
    flexDirection: 'row',
    gap: 10,
  },
  dropdownWrap: {
    flex: 1,
  },
  dropdownButton: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#f8fafc',
  },
  dropdownText: {
    color: '#1c2433',
    fontWeight: '600',
  },
  dropdownMenu: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#ffffff',
  },
  dropdownOption: {
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  dropdownOptionText: {
    color: '#1c2433',
    fontWeight: '600',
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#1c2433',
    backgroundColor: '#f8fafc',
    flex: 1,
  },
  modalInputCompact: {
    flex: 1,
  },
  modalActionButton: {
    backgroundColor: '#1ec873',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalActionText: {
    color: '#ffffff',
    fontWeight: '800',
  },
  modalCloseButton: {
    backgroundColor: 'darkgray',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalCloseText: {
    color: '#ffffff',
    fontWeight: '800',
  },
});
