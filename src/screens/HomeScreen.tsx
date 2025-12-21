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
            <Image source={require('../../assets/images/splyce-logo.png')} style={styles.logo} />
            <View>
              {/* <Text style={styles.heroSubtitle}>Welcome to</Text> */}
              <Text style={styles.heroTitle}>Splyce.ai</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={() => router.push('/Settings')}
            accessibilityLabel="Open settings"
          >
            <Ionicons name="settings-outline" size={22} color="#ffffff" />
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
          <Text style={styles.emptyText}>No previous splices yet.</Text>
        ) : (
          <FlatList
            data={receipts}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            renderItem={({ item }) => (
              <View style={styles.splitCard}>
                <View style={styles.splitCardContent}>
                  <Ionicons
                    name="receipt-outline"
                    size={20}
                    color="#1ec873"
                    style={styles.splitCardIcon}
                  />
                  <View>
                    <Text style={styles.splitTitle}>{item.restaurantName}</Text>
                    <Text style={styles.splitSubtitle}>
                      {new Date(item.date).toLocaleDateString()}
                    </Text>
                  </View>
                </View>
                <View style={styles.splitActions}>
                  <Text style={styles.splitAmount}>${item.total.toFixed(2)}</Text>
                  <TouchableOpacity onPress={() => handleDelete(item.id)} hitSlop={8}>
                    <Ionicons name="trash-outline" size={20} color="#d94c3f" />
                  </TouchableOpacity>
                </View>
              </View>
            )}
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
    backgroundColor: 'rgba(46,183,116,1.00)',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 60,
    // backgroundColor: '#2acd84',
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
    color: '#ffffff',
    fontSize: 32,
    fontWeight: '700',
  },
  heroText: {
    color: '#e8ffef',
    marginTop: 5,
    fontSize: 15,
  },
  settingsButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  cardGrid: {
    marginTop: -28,
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
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  splitCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  splitCardIcon: {
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#2eb774',
    color: 'white',
  },
  splitTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f1b2d',
  },
  splitSubtitle: {
    color: '#7a8a9b',
    marginTop: 2,
  },
  splitAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f1b2d',
  },
  splitActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  emptyText: {
    color: '#7a8a9b',
  },
});

export default HomeScreen;
