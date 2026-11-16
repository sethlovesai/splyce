import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';

import { initPurchases } from '../src/services/iap';

SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  initialRouteName: 'index',
};

export default function RootLayout() {
  React.useEffect(() => {
    // Configure RevenueCat once at startup (safe no-op in Expo Go / without a key).
    initPurchases().catch(() => {});
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <Stack
          screenOptions={{
            headerShadowVisible: false,
            headerTitleAlign: 'center',
            headerShown: false,
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="Onboarding" />
          <Stack.Screen name="Home" />
          <Stack.Screen name="ScanReceipt" />
          <Stack.Screen name="ReceiptReview" />
          <Stack.Screen name="BillHistory" />
          <Stack.Screen name="ReviewSelections" />
          <Stack.Screen name="AddParticipants" />
          <Stack.Screen name="SelectItems" />
          <Stack.Screen name="Summary" />
          <Stack.Screen name="Settings" />
          <Stack.Screen name="Paywall" />
          <Stack.Screen name="Analytics" />
          <Stack.Screen name="PrivacyPolicy" />
          <Stack.Screen name="TermsOfService" />
        </Stack>
        <StatusBar style="dark" />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
