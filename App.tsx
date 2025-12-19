import React from 'react';
import { StatusBar } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from './src/screens/HomeScreen';
import ScanReceiptScreen from './src/screens/ScanReceiptScreen';
import SelectItemsScreen from './src/screens/SelectItemsScreen';
import SummaryScreen from './src/screens/SummaryScreen';
import { RootStackParamList } from './src/types/navigation';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar barStyle="dark-content" />
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{
          headerShadowVisible: false,
          headerTitleAlign: 'center',
        }}
      >
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="ScanReceipt"
          component={ScanReceiptScreen}
          options={{ title: 'Scan Receipt' }}
        />
        <Stack.Screen
          name="SelectItems"
          component={SelectItemsScreen}
          options={{ title: 'Select Items' }}
        />
        <Stack.Screen
          name="Summary"
          component={SummaryScreen}
          options={{ title: 'Split Summary' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
