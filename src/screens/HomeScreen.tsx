import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  FlatList,
  Image,
  Alert,
  Linking,
  Platform,
} from 'react-native';

import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { getReceipts, StoredReceipt, removeReceipt } from '../storage/receipts';

// Receipt-card tints, white (most recent) → very light green (older), for a
// subtle recency hierarchy that stays soft enough not to compete with the
// primary action button. Index clamps at the last tint for long histories.
const CARD_TINTS = ['#ffffff', '#f5faf7', '#eef5f0', '#e7f1ea'];
const tintForIndex = (i: number) => CARD_TINTS[Math.min(i, CARD_TINTS.length - 1)];

const initialOf = (name: string) => (name?.trim()?.charAt(0) || '?').toUpperCase();
const MAX_AVATARS = 3;

const HomeScreen: React.FC = () => {
  const router = useRouter();
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

  const handleDelete = (id: string) => {
    Alert.alert('Delete receipt?', 'Are you sure you want to delete this receipt?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await removeReceipt(id);
          const data = await getReceipts();
          setReceipts(data);
        },
      },
    ]);
  };

  const handleUploadReceipt = async () => {
    const existing_perms = await ImagePicker.requestMediaLibraryPermissionsAsync();

    let finalStatus = existing_perms.status;

    if (finalStatus !== 'granted' && existing_perms.canAskAgain) {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      Alert.alert(
        'Permission needed',
        'Please enable photo library access in your device settings to upload a receipt.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Open Settings',
            onPress: () => {
              if (Platform.OS === 'ios') {
                Linking.openURL('app-settings:');
              } else {
                Linking.openSettings(); // works for Android
              }
            },
          },
        ],
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      base64: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets?.length) {
      const asset = result.assets[0];
      router.push({
        pathname: '/ScanReceipt',
        params: {
          imageUri: asset.uri,
          imageBase64: asset.base64,
        },
      });
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        {/* <View style={styles.heroOverlay} /> */}
        <View style={styles.brandRow}>
          <View style={styles.brandLeft}>
            <Image source={require('../../assets/images/splyce-logo-green.png')} style={styles.logo} />
            <View>
              {/* <Text style={styles.heroSubtitle}>Welcome to</Text> */}
              <Text style={styles.heroTitle}>
                
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={() => router.push('/Settings')}
            accessibilityLabel="Open settings"
          >
            <Ionicons name="settings-outline" size={22} color="#0f1b2d" />
          </TouchableOpacity>
        </View>
        <Text style={styles.heroText}>Scan, split, and settle up in seconds.</Text>
      </View>

      <View style={styles.cardGrid}>
        <TouchableOpacity
          style={[styles.actionCard, styles.primaryCard]}
          onPress={() => router.push('/ScanReceipt')}
          activeOpacity={0.9}
        >
          <View style={styles.cardHeader}>
            <Ionicons name="scan" size={30} color="#ffffff" />
            <Text style={[styles.cardTitle, styles.cardTitleOnPrimary]}>Scan Receipt</Text>
          </View>
          <Text style={[styles.cardText, styles.cardTextOnPrimary]}>Let AI read your bill</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionCard}
          onPress={handleUploadReceipt}
          activeOpacity={0.9}
        >
          <View style={styles.cardHeader}>
            <Ionicons name="image-outline" size={30} color="#1ec873" />
            <Text style={styles.cardTitle}>Upload a Receipt</Text>
          </View>
          <Text style={styles.cardText}>Already have an existing photo?</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Previous Splices</Text>
          <TouchableOpacity onPress={() => router.push('/BillHistory')}>
            <Text style={styles.sectionButtonText}>View All</Text>
          </TouchableOpacity>
        </View>

        {receipts.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="sparkles-outline" size={22} color="#1ec873" />
            </View>
            <View style={styles.emptyCopy}>
              <Text style={styles.emptyTitle}>No splices yet</Text>
              <Text style={styles.emptySubtitle}>
                Scan your first receipt to start tracking and splitting bills.
              </Text>
              <View style={styles.emptyActions}>
                <TouchableOpacity
                  style={styles.emptyPrimaryButton}
                  onPress={() => router.push('/ScanReceipt')}
                  activeOpacity={0.9}
                >
                  <Ionicons name="scan-outline" size={16} color="#ffffff" />
                  <Text style={styles.emptyPrimaryText}>Scan Receipt</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.emptySecondaryButton}
                  onPress={handleUploadReceipt}
                  activeOpacity={0.9}
                >
                  <Ionicons name="image-outline" size={16} color="#1ec873" />
                  <Text style={styles.emptySecondaryText}>Upload Photo</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ) : (
          <FlatList
            data={receipts}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            renderItem={({ item, index }) => {
              const people = item.summary ?? [];
              const splitCount = people.length;
              const isSplit = splitCount > 1;
              const visible = people.slice(0, MAX_AVATARS);
              const overflow = splitCount - visible.length;
              return (
                <View style={[styles.splitCard, { backgroundColor: tintForIndex(index) }]}>
                  <View style={styles.splitTopRow}>
                    <View style={styles.splitTitleBlock}>
                      <Text style={styles.splitTitle} numberOfLines={1}>
                        {item.restaurantName}
                      </Text>
                      <Text style={styles.splitSubtitle}>
                        {new Date(item.date).toLocaleDateString()}
                      </Text>
                    </View>
                    <Text style={styles.splitAmount}>${item.total.toFixed(2)}</Text>
                  </View>

                  <View style={styles.splitBottomRow}>
                    {isSplit ? (
                      <View style={styles.avatarCluster}>
                        <View style={styles.avatarStack}>
                          {visible.map((p, i) => (
                            <View
                              key={`${p.name}-${i}`}
                              style={[styles.avatarCircle, i > 0 && styles.avatarOverlap]}
                            >
                              <Text style={styles.avatarInitial}>{initialOf(p.name)}</Text>
                            </View>
                          ))}
                          {overflow > 0 ? (
                            <View style={[styles.avatarCircle, styles.avatarOverlap, styles.avatarMore]}>
                              <Text style={styles.avatarInitial}>+{overflow}</Text>
                            </View>
                          ) : null}
                        </View>
                        <Text style={styles.splitWaysText}>split {splitCount} ways</Text>
                      </View>
                    ) : (
                      <View />
                    )}
                    <TouchableOpacity
                      onPress={() => handleDelete(item.id)}
                      hitSlop={8}
                      style={styles.deleteButton}
                      accessibilityLabel="Delete receipt"
                    >
                      <Ionicons name="trash-outline" size={16} color="#b8c2cc" />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            }}
          />
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  content: {
    paddingBottom: 32,
    flexGrow: 1,
  },
  hero: {
    backgroundColor: '#f5f7fa',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 24,
    overflow: 'hidden',
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#39d98a',
    opacity: 0.6,
    transform: [{ skewY: '-6deg' }],
  },
  brandRow: {
    marginVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  brandLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logo: {
    width: 44,
    height: 44,
    borderRadius: 12,
  },
  heroSubtitle: {
    color: '#e8ffef',
    fontSize: 14,
    marginBottom: 6,
  },
  heroTitle: {
    color: '#0f1b2d',
    fontSize: 32,
    fontWeight: '700',
  },
  heroText: {
    color: '#556274',
    marginTop: 5,
    fontSize: 15,
  },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e6ecf2',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardGrid: {
    marginTop: 4,
    paddingHorizontal: 20,
  },
  actionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  primaryCard: {
    backgroundColor: 'rgb(12 144 78)',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f1b2d',
  },
  cardTitleOnPrimary: {
    color: '#ffffff',
  },
  cardText: {
    marginTop: 6,
    color: '#556274',
    fontSize: 14,
  },
  cardTextOnPrimary: {
    color: '#e8ffef',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    marginTop: 10,
  },
  sectionButtonText: {
    color: '#1ec873',
    fontSize: 14,
    fontWeight: '700',
  },
  section: {
    paddingHorizontal: 20,
    marginTop: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f1b2d',
  },
  splitCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#eef2ef',
    shadowColor: '#0f1b2d',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  splitTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  splitTitleBlock: {
    flex: 1,
    minWidth: 0,
  },
  splitTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0f1b2d',
  },
  splitSubtitle: {
    color: '#7a8a9b',
    marginTop: 3,
    fontSize: 13,
    fontWeight: '500',
  },
  splitAmount: {
    fontSize: 22,
    fontWeight: '800',
    color: '#12a05a',
  },
  splitBottomRow: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  avatarCluster: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatarStack: {
    flexDirection: 'row',
  },
  avatarCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#c9ead7',
    borderWidth: 1.5,
    borderColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarOverlap: {
    marginLeft: -9,
  },
  avatarMore: {
    backgroundColor: '#b6e2c8',
  },
  avatarInitial: {
    color: '#2f9e5f',
    fontSize: 11,
    fontWeight: '800',
  },
  splitWaysText: {
    color: '#7a8a9b',
    fontSize: 13,
    fontWeight: '600',
  },
  deleteButton: {
    padding: 4,
  },
  emptyText: {
    color: '#7a8a9b',
  },
  emptyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e6ecf2',
    flexDirection: 'row',
    gap: 14,
    alignItems: 'flex-start',
  },
  emptyIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#e8fff2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCopy: {
    flex: 1,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f1b2d',
  },
  emptySubtitle: {
    marginTop: 4,
    color: '#6b7b8e',
    fontSize: 13,
    lineHeight: 18,
  },
  emptyActions: {
    marginTop: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  emptyPrimaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1ec873',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  emptyPrimaryText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  emptySecondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f1f7f4',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#d9eee2',
  },
  emptySecondaryText: {
    color: '#1ec873',
    fontSize: 13,
    fontWeight: '700',
  },
});

export default HomeScreen;
