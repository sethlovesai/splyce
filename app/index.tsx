import React, { useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';

const ONBOARDING_KEY = 'splyce:onboarding_complete';

export default function IndexRoute() {
  const router = useRouter();

  useEffect(() => {
    const checkOnboarding = async () => {
      const completed = await AsyncStorage.getItem(ONBOARDING_KEY);
      router.replace(completed ? '/Home' : '/Onboarding');
      await SplashScreen.hideAsync();
    };

    checkOnboarding();
  }, [router]);

  return null;
}
