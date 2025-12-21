import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

export const unstable_settings = {
  initialRouteName: 'index',
};

export default function RootLayout() {
  return (
    <>
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
        <Stack.Screen name="PrivacyPolicy" />
        <Stack.Screen name="TermsOfService" />
      </Stack>
      <StatusBar style="dark" />
    </>
  );
}
