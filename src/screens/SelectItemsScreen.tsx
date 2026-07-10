import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Pressable,
  Alert,
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
import { subscribeToSession, closeSession, addGuestClaim } from '../services/liveSession';
import { LiveSession } from '../types/session';
import {
  flattenLiveClaims,
  portionLabel,
  buildHybridSummary,
  computeGuestTotals,
  ManualItem,
} from '../services/liveClaims';
import { expandReceiptItems } from '../utils/receiptItems';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'SelectItems'>;
type RouteProps = RouteProp<RootStackParamList, 'SelectItems'>;

type SelectionMap = Record<string, Set<string>>;

const PARTICIPANT_COLORS = ['#1ec873', '#f59e0b', '#3b82f6', '#ef4444', '#8b5cf6', '#10b981', '#f97316'];

const SelectItemsScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { items: rawItems, participants, restaurantName, totals, sessionId } = route.params;

  // Expand quantities to unit-level rows. Uses the same helper that builds the
  // live session, so each expanded row's id matches a live session item id.
  const expandedItems = React.useMemo(() => expandReceiptItems(rawItems), [rawItems]);

  const buildSelectionMap = React.useCallback(() => {
    const map: SelectionMap = {};
    expandedItems.forEach((item) => {
      map[item.id] = new Set();
    });
    return map;
  }, [expandedItems]);

  const [activeParticipant, setActiveParticipant] = React.useState<string>(participants[0]);
  const [selectedByItem, setSelectedByItem] = React.useState<SelectionMap>(buildSelectionMap);

  // --- Live session (host side): session was created on the participants screen
  // and passed in via route params. Subscribe to watch guest claims in real time.
  const [liveSession, setLiveSession] = React.useState<LiveSession | null>(null);

  React.useEffect(() => {
    if (!sessionId) return;
    return subscribeToSession(sessionId, setLiveSession, (err) =>
      console.warn('Live session listener error:', err.message),
    );
  }, [sessionId]);

  const claimLines = React.useMemo(() => flattenLiveClaims(liveSession), [liveSession]);

  // Unit ids that a live guest has already claimed (session item ids now match
  // the expanded unit ids 1:1).
  const claimedItemIds = React.useMemo(() => {
    const set = new Set<string>();
    liveSession?.items.forEach((item) => {
      if (item.claims.length > 0) set.add(item.itemId);
    });
    return set;
  }, [liveSession]);

  // Live claims on a specific unit (for read-only display next to manual assignment).
  const liveClaimsFor = React.useCallback(
    (unitId: string) => {
      const item = liveSession?.items.find((i) => i.itemId === unitId);
      return item?.claims ?? [];
    },
    [liveSession],
  );

  const finalizeAndClose = async () => {
    if (!sessionId) return;
    const manualItems: ManualItem[] = expandedItems.map((i) => ({
      id: i.id,
      sourceId: i.sourceId,
      name: i.name,
      price: i.price,
    }));
    const selections: Record<string, string[]> = {};
    Object.entries(selectedByItem).forEach(([id, set]) => {
      selections[id] = Array.from(set);
    });
    // Write per-guest final totals (combined live + manual) so the web page can
    // show each guest what they owe.
    const results = computeGuestTotals(liveSession, manualItems, selections, totals);
    try {
      await closeSession(sessionId, results);
    } catch (err) {
      console.warn('Failed to close session:', err);
    }
    const summary = buildHybridSummary(liveSession, manualItems, selections, totals);
    navigation.navigate('Summary', { summary, restaurantName, totals });
  };

  const handleCloseSession = () => {
    if (!sessionId) return;
    // Warn if any items are neither claimed live nor manually assigned — their
    // cost would otherwise silently drop out of the split.
    const unclaimed = expandedItems.filter(
      (i) => !claimedItemIds.has(i.id) && !selectedByItem[i.id]?.size,
    );
    if (unclaimed.length > 0) {
      const amount = unclaimed.reduce((sum, i) => sum + i.price, 0);
      Alert.alert(
        'Some items are unassigned',
        `${unclaimed.length} item${unclaimed.length > 1 ? 's' : ''} ($${amount.toFixed(
          2,
        )}) aren't claimed or assigned to anyone. Their cost won't be included in the split.`,
        [
          { text: 'Keep assigning', style: 'cancel' },
          { text: 'Close anyway', style: 'destructive', onPress: finalizeAndClose },
        ],
      );
      return;
    }
    finalizeAndClose();
  };

  // Dev-only: fake a guest claim so the live listener can be verified before the
  // guest web page (Stage 3) exists.
  const handleSimulateGuestClaim = async () => {
    if (!sessionId || !liveSession || liveSession.items.length === 0) return;
    const item = liveSession.items[Math.floor(Math.random() * liveSession.items.length)];
    const fakeGuests: [string, string][] = [
      ['g-alice', 'Alice'],
      ['g-bob', 'Bob'],
      ['g-cara', 'Cara'],
    ];
    const [guestId, guestName] = fakeGuests[Math.floor(Math.random() * fakeGuests.length)];
    const portion = Math.random() < 0.5 ? 0.5 : 1;
    try {
      await addGuestClaim(sessionId, item.itemId, guestId, guestName, portion);
    } catch (err) {
      console.warn('Simulated claim failed:', err);
    }
  };

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
        {sessionId ? (
          <View style={styles.livePanel}>
            <View style={styles.liveHeaderRow}>
              <View style={styles.liveDot} />
              <Text style={styles.liveTitle}>Live session active</Text>
            </View>
            <Text style={styles.liveSub}>
              {liveSession?.guests.length ?? 0} joined • live claims show on items; tap to add more people to any item
            </Text>
            {claimLines.length === 0 ? (
              <Text style={styles.liveEmpty}>No claims yet — waiting for guests…</Text>
            ) : (
              <View style={styles.liveClaimList}>
                {claimLines.map((line) => (
                  <Text key={line.key} style={styles.liveClaimLine}>
                    <Text style={styles.liveClaimName}>{line.guestName}</Text> claimed:{' '}
                    {portionLabel(line.portion)}
                    {line.itemName} (${line.amount.toFixed(2)})
                  </Text>
                ))}
              </View>
            )}
            {__DEV__ ? (
              <TouchableOpacity
                style={styles.devButton}
                onPress={handleSimulateGuestClaim}
                activeOpacity={0.8}
              >
                <Text style={styles.devButtonText}>+ Simulate guest claim (dev)</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}

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
            // Claiming NEVER locks an item — it stays toggleable so more people
            // (manual or live) can share it. Live claims are shown read-only.
            const liveClaims = sessionId ? liveClaimsFor(item.id) : [];
            const isSelected = selectedByItem[item.id]?.has(activeParticipant);
            const selectedUsers = selectedByItem[item.id]
              ? Array.from(selectedByItem[item.id])
              : [];
            return (
              <Pressable
                key={item.id}
                style={styles.itemCard}
                onPress={() => {
                  if (!activeParticipant) return;
                  toggleSelection(item.id);
                }}
              >
                <View style={styles.itemInfo}>
                  <View style={styles.indicatorOuter}>
                    <View style={[styles.indicatorInner, isSelected && styles.indicatorSelected]} />
                  </View>
                  <View style={styles.itemTextContainer}>
                    <Text style={styles.itemName}>{item.name}</Text>
                    {liveClaims.length > 0 ? (
                      <View style={styles.claimTagRow}>
                        {liveClaims.map((c) => (
                          <View key={c.guestId} style={styles.claimTag}>
                            <Text style={styles.claimTagText}>
                              {c.guestName}
                              {c.portion !== 1 ? ` (${portionLabel(c.portion).trim() || c.portion})` : ''} · live
                            </Text>
                          </View>
                        ))}
                      </View>
                    ) : null}
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
        {sessionId ? (
          <TouchableOpacity
            style={styles.closeButton}
            onPress={handleCloseSession}
            activeOpacity={0.9}
          >
            <Text style={styles.calculateText}>Close Session &amp; Split</Text>
          </TouchableOpacity>
        ) : (
          <>
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
          </>
        )}
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
  claimTagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  claimTag: {
    backgroundColor: '#efedfd',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  claimTagText: {
    color: '#5b4ddb',
    fontWeight: '600',
    fontSize: 12,
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
  livePanel: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e0dcfb',
  },
  liveHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  liveDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#ef4444',
  },
  liveTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f1b2d',
  },
  liveSub: {
    color: '#6b7b8e',
    fontSize: 12,
    marginTop: 4,
  },
  liveClaimList: {
    marginTop: 10,
    gap: 6,
  },
  liveClaimLine: {
    color: '#0f1b2d',
    fontSize: 14,
  },
  liveClaimName: {
    fontWeight: '700',
  },
  liveEmpty: {
    marginTop: 10,
    color: '#9aa8b6',
    fontStyle: 'italic',
  },
  devButton: {
    marginTop: 12,
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#c6c0f5',
  },
  devButtonText: {
    color: '#5b4ddb',
    fontWeight: '700',
    fontSize: 13,
  },
  closeButton: {
    alignSelf: 'stretch',
    backgroundColor: '#ef4444',
    paddingVertical: 16,
    borderRadius: 999,
    alignItems: 'center',
  },
});

export default SelectItemsScreen;
