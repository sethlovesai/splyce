import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
} from 'react-native';
import { useIsFocused, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp, RouteProp } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import { CameraView, useCameraPermissions } from 'expo-camera';
import Ionicons from '@expo/vector-icons/Ionicons';
import { RootStackParamList, ReceiptItem, Totals } from '../types/navigation';
import { parseReceiptViaBackend } from '../services/receiptApi';
import { GradientHeader } from '../components/GradientHeader';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'ScanReceipt'>;
type RouteProps = RouteProp<RootStackParamList, 'ScanReceipt'>;

const mockItems: ReceiptItem[] = [
  { id: '1', name: 'Chicken Sandwich', price: 29.98, quantity: 2 },
  { id: '2', name: 'Caesar Salad', price: 12.5, quantity: 1 },
  { id: '3', name: 'Margherita Pizza', price: 18.99, quantity: 1 },
  { id: '4', name: 'French Fries', price: 17.97, quantity: 3 },
];

const mockTotals: Totals = {
  subtotal: 61.96,
  tax: 5.58,
  tip: 9.29,
};

const mockParticipants = ['You', 'Alex', 'Sam', 'Jordan'];

const ScanReceiptScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const isFocused = useIsFocused();
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraRef, setCameraRef] = useState<CameraView | null>(null);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusText, setStatusText] = useState<string | null>(null);

  const ensureCameraPermission = async () => {
    if (permission?.granted) return true;
    const res = await requestPermission();
    if (!res.granted) {
      setError('Camera access is required to take a photo.');
      return false;
    }
    return true;
  };

  const handleCapture = async () => {
    const ok = await ensureCameraPermission();
    if (!ok) return;
    setError(null);
    const photo = await cameraRef?.takePictureAsync({ quality: 0.7, base64: true });
    if (photo) {
      setImageUri(photo.uri);
      setImageBase64(photo.base64 ?? null);
    }
  };

  // const pickFromLibrary = async () => {
  //   setError(null);
  //   const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  //   if (status !== 'granted') {
  //     setError('Library access is required to upload a photo.');
  //     return;
  //   }

  //   const result = await ImagePicker.launchImageLibraryAsync({
  //     base64: true,
  //     quality: 0.8,
  //     allowsEditing: false,
  //   });

  //   if (!result.canceled && result.assets?.length) {
  //     setImageUri(result.assets[0].uri);
  //     setImageBase64(result.assets[0].base64 ?? null);
  //   }
  // };

  const handleUploadReceipt = async () => {
    const existingPerms = await ImagePicker.requestMediaLibraryPermissionsAsync();
    let finalStatus = existingPerms.status;

    if (finalStatus !== 'granted' && existingPerms.canAskAgain) {
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
                Linking.openSettings();
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
      setImageUri(result.assets[0].uri);
      setImageBase64(result.assets[0].base64 ?? null);
    }
  };

  const handleUsePhoto = async () => {
    if (!imageUri) return;
    setError(null);
    setStatusText('Reading receipt with AI...');
    setIsProcessing(true);

    try {
      if (!imageBase64) {
        throw new Error('No image base64 found');
      }

      const parsed = await parseReceiptViaBackend(imageBase64);

      if (!parsed.items.length) {
        setError(
          'No items found on this image. ' +
          'Please retake the photo so the full receipt and prices are visible.'
        );
        return; 
      }

      const parsedItems = parsed.items.length ? parsed.items : mockItems;
      const normalizedItems: ReceiptItem[] = parsedItems.map((item, index) => ({
        ...item,
        id: item.id ?? `${item.name}-${index}`,
      }));
      const parsedTotals = parsed.totals ?? mockTotals;
      const computedSubtotal = normalizedItems.reduce(
        (sum, item) => sum + item.price * (item.quantity || 1),
        0,
      );
      const parsedSubtotal = parsedTotals.subtotal ?? computedSubtotal;
      const delta = Math.abs(parsedSubtotal - computedSubtotal);
      const mismatchWarning =
        delta > 0.05
          ? {
              computedSubtotal: Number(computedSubtotal.toFixed(2)),
              parsedSubtotal: Number(parsedSubtotal.toFixed(2)),
              delta: Number(delta.toFixed(2)),
            }
          : undefined;

      navigation.navigate('ReceiptReview', {
        items: normalizedItems,
        restaurantName: parsed.restaurantName ?? 'Receipt',
        totals: parsedTotals,
        mismatchWarning,
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Unable to parse receipt.';
      setError(`${message} Try retaking or uploading a clearer photo.`);
    } finally {
      setIsProcessing(false);
      setStatusText(null);
    }
  };

  const handleRetake = async () => {
    if (error) {
      setError(null);
    }
    
    setImageUri(null);
    setImageBase64(null);
    await ensureCameraPermission();
  };

  useEffect(() => {
    if (route.params?.imageUri) {
      setImageUri(route.params.imageUri);
      setImageBase64(route.params.imageBase64 ?? null);
    }
  }, [route.params]);

  return (
    <View style={styles.container}>
      <GradientHeader title="Scan Receipt" subtitle="Take a clear photo of your bill" />

      <View style={styles.content}>
        <View style={styles.previewBox}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.previewImage} />
          ) : permission?.granted && isFocused ? (
            <CameraView
              style={styles.camera}
              ref={(ref) => setCameraRef(ref)}
              facing="back"
              ratio="16:9"
            />
          ) : (
            <View style={styles.placeholder}>
              <Text style={styles.cameraIcon}>📷</Text>
              <Text style={styles.previewText}>Position your receipt</Text>
              {!permission?.granted ? (
                <TouchableOpacity style={styles.permissionButton} onPress={ensureCameraPermission}>
                  <Text style={styles.permissionText}>Enable Camera</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          )}
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle-outline" size={22} color="#e1594a" />
            <View style={{ flex: 1 }}>
              <Text style={styles.errorTitle}>Couldn&apos;t read receipt</Text>
              <Text style={styles.errorBody}>
                We had trouble reading your receipt. Please make sure it&apos;s clear and well-lit, then try again.
              </Text>
            </View>
          </View>
        ) : null}

        <View style={styles.tips}>
          {statusText ? <Text style={styles.statusText}>{statusText}</Text> : <Text style={styles.tipText}>💡 Tips: Good lighting helps • Keep receipt flat • Include the total</Text>}
        </View>

        <View style={styles.actions}>
          {imageUri ? (
            <>
              <TouchableOpacity
                style={[styles.primaryButton, isProcessing && styles.disabledButton]}
                onPress={handleUsePhoto}
                activeOpacity={0.9}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.primaryButtonText}>Use Photo</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={handleRetake}
                activeOpacity={0.9}
                disabled={isProcessing}
              >
                <Text style={styles.secondaryButtonText}>Retake Photo</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={handleCapture}
                activeOpacity={0.9}
              >
                <Text style={styles.primaryButtonText}>Capture</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={handleUploadReceipt}
                activeOpacity={0.9}
              >
                <Text style={styles.secondaryButtonText}>Upload from Library</Text>
              </TouchableOpacity>
            </>
          )}
          <TouchableOpacity style={styles.ghostButton} onPress={() => navigation.goBack()}>
            <Text style={styles.ghostButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
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
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  previewBox: {
    flex: 1,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#8fd6b5',
    borderRadius: 16,
    backgroundColor: '#ffffff',
    marginVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewImage: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  camera: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  cameraIcon: {
    fontSize: 42,
  },
  previewText: {
    marginTop: 12,
    color: '#6b7b8e',
    fontSize: 16,
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tips: {
    marginBottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipText: {
    color: '#7a8a9b',
    marginBottom: 4,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#f1b6ae',
    backgroundColor: '#fff4f2',
    padding: 12,
    marginBottom: 12,
  },
  errorTitle: {
    color: '#d94c3f',
    fontWeight: '800',
    fontSize: 15,
    marginBottom: 2,
  },
  errorBody: {
    color: '#d94c3f',
    fontSize: 14,
  },
  actions: {
    paddingBottom: 8,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  primaryButton: {
    width: '80%',
    backgroundColor: '#1ec873',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '700',
  },
  secondaryButton: {
    width: '80%',
    backgroundColor: '#ffffff',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#dfe5ec',
  },
  secondaryButtonText: {
    color: '#1c2433',
    fontSize: 15,
    fontWeight: '700',
  },
  permissionButton: {
    marginTop: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#1ec873',
  },
  permissionText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  disabledButton: {
    opacity: 0.8,
  },
  ghostButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  ghostButtonText: {
    color: '#6b7b8e',
    fontSize: 15,
    fontWeight: '600',
  },
  statusText: {
    marginTop: 10,
    textAlign: 'center',
    color: '#6b7b8e',
  },
});

export default ScanReceiptScreen;
