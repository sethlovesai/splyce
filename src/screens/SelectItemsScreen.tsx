import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Pressable,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import {
  RootStackParamList,
  SummaryEntry,
  ReceiptItem,
} from '../types/navigation';
import { GradientHeader } from '../components/GradientHeader';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'SelectItems'>;
type RouteProps = RouteProp<RootStackParamList, 'SelectItems'>;

type SelectionMap = Record<string, Set<string>>;

const PARTICIPANT_COLORS = ['#1ec873', '#f59e0b', '#3b82f6', '#ef4444', '#8b5cf6', '#10b981', '#f97316'];

const SelectItemsScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { items: rawItems, participants, restaurantName, totals } = route.params;

  // Expand quantity > 1 into individual rows with unit pricing
  const expandedItems = React.useMemo(() => {
    return rawItems.flatMap((item) => {
      const qty = Math.max(1, item.quantity || 1);
      const unitPrice = qty > 1 ? Number((item.price / qty).toFixed(2)) : item.price;
      return Array.from({ length: qty }).map((_, idx) => ({
        ...item,
        id: `${item.id}-${idx + 1}`,
        quantity: 1,
        price: unitPrice,
      }));
    });
  }, [rawItems]);

  const buildSelectionMap = React.useCallback(() => {
    const map: SelectionMap = {};
    expandedItems.forEach((item) => {
      map[item.id] = new Set();
    });
    return map;
  }, [expandedItems]);

  const [activeParticipant, setActiveParticipant] = React.useState<string>(participants[0]);
  const [selectedByItem, setSelectedByItem] = React.useState<SelectionMap>(buildSelectionMap);

  // Reset selection map if items change (e.g., new scan)
  React.useEffect(() => {
    setSelectedByItem(buildSelectionMap());
  }, [buildSelectionMap]);

  // count the number of items that have been selected by at least one participant
  const itemsSelectedCount = React.useMemo(
    () => expandedItems.filter((item) => selectedByItem[item.id]?.size).length,
    [expandedItems, selectedByItem],
  );

  const totalItems = expandedItems.length;

  const toggleSelection = (itemId: string) => {
    setSelectedByItem((prev) => {
      const next: SelectionMap = {};
      Object.entries(prev).forEach(([id, value]) => {
        next[id] = new Set(value);
      });

      const currentSet = next[itemId] || new Set<string>();
      if (currentSet.has(activeParticipant)) {
        currentSet.delete(activeParticipant);
      } else {
        currentSet.add(activeParticipant);
      }
      next[itemId] = currentSet;
      return next;
    });
  };

  const calculateSplit = () => {
    const summaryMap: Record<string, SummaryEntry> = participants.reduce(
      (acc, name) => ({
        ...acc,
        [name]: { name, itemsCount: 0, totalOwed: 0, items: [] },
      }),
      {} as Record<string, SummaryEntry>,
    );

    expandedItems.forEach((item: ReceiptItem) => {
      const selection = selectedByItem[item.id];
      if (selection && selection.size > 0) {
        const share = item.price / selection.size;
        selection.forEach((person) => {
          summaryMap[person].totalOwed += share;
          summaryMap[person].itemsCount += 1;
          summaryMap[person].items?.push({ name: item.name, share });
        });
      }
    });

    const taxRate = totals.taxRate ?? (totals.subtotal > 0 ? (totals.tax / totals.subtotal) * 100 : 0);
    const summary = Object.values(summaryMap).map((entry) => {
      const taxAmount = taxRate > 0 ? entry.totalOwed * (taxRate / 100) : 0;
      const totalWithTax = entry.totalOwed + taxAmount;
      return {
        ...entry,
        taxAmount: Number(taxAmount.toFixed(2)),
        taxRate: Number(taxRate.toFixed(2)),
        totalOwed: Number(totalWithTax.toFixed(2)),
        items: entry.items?.map((i) => ({ ...i, share: Number(i.share.toFixed(2)) })),
      };
    });

    const selectionForNav: Record<string, string[]> = {};
    Object.entries(selectedByItem).forEach(([id, set]) => {
      selectionForNav[id] = Array.from(set);
    });

    navigation.navigate('ReviewSelections', {
      items: expandedItems,
      selections: selectionForNav,
      participants,
      restaurantName,
      totals,
      summary,
    });
  };

  const handleDone = () => {
    const currentIndex = participants.indexOf(activeParticipant);
    const nextIndex = currentIndex + 1;
    if (nextIndex < participants.length) {
      setActiveParticipant(participants[nextIndex]);
      return;
    }
    calculateSplit();
  };

  return (
    <View style={styles.container}>
      <GradientHeader title="Select Your Items" subtitle={`${restaurantName} • ${expandedItems.length} items`} />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.participantRow}
          contentContainerStyle={{ paddingVertical: 4 }}
        >
          {participants.map((person) => {
            const isActive = person === activeParticipant;
            return (
              <TouchableOpacity
                key={person}
                style={[styles.chip, isActive && styles.activeChip]}
                onPress={() => setActiveParticipant(person)}
                activeOpacity={0.9}
              >
                <Text style={[styles.chipText, isActive && styles.activeChipText]}>
                  {person}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={styles.list}>
          {expandedItems.map((item) => {
            const isSelected = selectedByItem[item.id]?.has(activeParticipant);
            const selectedUsers = selectedByItem[item.id]
              ? Array.from(selectedByItem[item.id])
              : [];
            return (
              <Pressable
                key={item.id}
                style={styles.itemCard}
                onPress={() => toggleSelection(item.id)}
              >
                <View style={styles.itemInfo}>
                  <View style={styles.indicatorOuter}>
                    <View style={[styles.indicatorInner, isSelected && styles.indicatorSelected]} />
                  </View>
                  <View style={styles.itemTextContainer}>
                    <Text style={styles.itemName}>{item.name}</Text>
                    {/* <Text style={styles.itemMeta}>
                      Qty {item.quantity} • ${item.price.toFixed(2)}
                    </Text> */}
                    {selectedUsers.length > 0 ? (
                      <View style={styles.avatarRow}>
                        {selectedUsers.map((user) => {
                          const idx = participants.indexOf(user);
                          const color = PARTICIPANT_COLORS[idx % PARTICIPANT_COLORS.length] || '#1ec873';
                          return (
                            <View key={user} style={[styles.avatar, { backgroundColor: color }]}>
                              <Text style={styles.avatarText}>{user[0]?.toUpperCase()}</Text>
                            </View>
                          );
                        })}
                      </View>
                    ) : null}
                  </View>
                </View>
                <Text style={styles.itemPrice}>${item.price.toFixed(2)}</Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Text style={styles.footerHint}>
          Items selected {itemsSelectedCount}/{totalItems}
        </Text>
        <TouchableOpacity
          style={[
            styles.calculateButton,
            itemsSelectedCount === 0 && styles.calculateButtonDisabled,
          ]}
          disabled={itemsSelectedCount === 0}
          onPress={handleDone}
          activeOpacity={0.9}
        >
          <Text style={styles.calculateText}>Done</Text>
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
    paddingBottom: 120,
  },
  participantRow: {
    marginBottom: 12,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#e6f6ed',
    borderRadius: 18,
    marginRight: 8,
  },
  activeChip: {
    backgroundColor: '#1ec873',
  },
  chipText: {
    color: '#0f1b2d',
    fontWeight: '600',
  },
  activeChipText: {
    color: '#ffffff',
  },
  list: {
    marginTop: 4,
  },
  itemCard: {
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
  itemInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemTextContainer: {
    marginLeft: 10,
  },
  indicatorOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#c6d9d6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  indicatorInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  indicatorSelected: {
    backgroundColor: '#1ec873',
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f1b2d',
  },
  itemMeta: {
    color: '#7a8a9b',
    marginTop: 2,
  },
  avatarRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 8,
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
  itemPrice: {
    fontWeight: '700',
    color: '#0f1b2d',
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: 30,
    paddingTop: 20,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderColor: '#e6ecf2',
    alignItems: 'center',
  },
  footerHint: {
    fontSize: 12,
    color: '#6b7b8e',
    marginBottom: 10,
  },
  calculateButton: {
    alignSelf: 'stretch',
    backgroundColor: '#5b4ddb',
    paddingVertical: 16,
    borderRadius: 999,
    alignItems: 'center',
  },
  calculateButtonDisabled: {
    opacity: 0.6,
  },
  calculateText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 16,
  },
});

export default SelectItemsScreen;
