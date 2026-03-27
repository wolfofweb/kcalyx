import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import useStore from '@/store/useStore';
import { supabase } from '@/services/supabase';
import LoginScreen from '@/app/login';
import OnboardingScreen from '@/app/onboarding';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const fetchEntries = useStore((s: any) => s.fetchEntries);
  const fetchWeeklyData = useStore((s: any) => s.fetchWeeklyData);
  const loadGoalCalories = useStore((s: any) => s.loadGoalCalories);
  const loadOnboardingState = useStore((s: any) => s.loadOnboardingState);
  const fetchProfile = useStore((s: any) => s.fetchProfile);
  const user = useStore((s: any) => s.user);
  const isLoading = useStore((s: any) => s.isLoading);
  const isProfileLoading = useStore((s: any) => s.isProfileLoading);
  const hasOnboarded = useStore((s: any) => s.hasOnboarded);
  const setUser = useStore((s: any) => s.setUser);
  const setLoading = useStore((s: any) => s.setLoading);

  useEffect(() => {
    // Load persisted onboarding state on app start
    loadOnboardingState().catch(console.error);

    // Check for existing session
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fetch app data when user logs in
  useEffect(() => {
    if (user) {
      fetchProfile().catch(console.error);
      fetchEntries().catch(console.error);
      fetchWeeklyData().catch(console.error);
      loadGoalCalories().catch(console.error);
    }
  }, [user]);

  // Loading spinner while checking session or profile
  if (isLoading || (user && isProfileLoading)) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0A0B0D', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#6EE7B7" />
      </View>
    );
  }

  // Not logged in → Login screen
  if (!user) {
    return (
      <>
        <LoginScreen />
        <StatusBar style="light" />
      </>
    );
  }

  // Logged in but not onboarded → Onboarding screen
  if (!hasOnboarded) {
    return (
      <>
        <OnboardingScreen />
        <StatusBar style="light" />
      </>
    );
  }

  // Fully authenticated + onboarded → Main app
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
