import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState, useRef } from 'react';
import { ActivityIndicator, View, Animated, Image, StyleSheet, Dimensions, Text } from 'react-native';
import 'react-native-reanimated';
import * as Linking from 'expo-linking';

import { useColorScheme } from '@/hooks/use-color-scheme';
import useStore from '@/store/useStore';
import { supabase } from '@/services/supabase';
import LoginScreen from '@/app/login';
import OnboardingScreen from '@/app/onboarding';
import ConnectAIScreen from '@/app/connect-ai';

const { width } = Dimensions.get('window');

function AnimatedSplashScreen({ onFinish, isDataLoaded }: { onFinish: () => void, isDataLoaded: boolean }) {
  const fadeAnim = useRef(new Animated.Value(0.3)).current;
  const scaleBy = useRef(new Animated.Value(0.8)).current;
  const containerFade = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Intro animation: Fade and Pulse
    Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(fadeAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
          Animated.timing(scaleBy, { toValue: 1.05, duration: 1200, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(fadeAnim, { toValue: 0.7, duration: 1200, useNativeDriver: true }),
          Animated.timing(scaleBy, { toValue: 1.0, duration: 1200, useNativeDriver: true }),
        ])
      ])
    ).start();
  }, []);

  useEffect(() => {
    // Wait for minimum time + data loaded before fading out
    const timeout = setTimeout(() => {
      if (isDataLoaded) {
        Animated.timing(containerFade, { toValue: 0, duration: 600, useNativeDriver: true }).start(() => {
          onFinish();
        });
      }
    }, 2000); // Minimum 2s for premium feel
    return () => clearTimeout(timeout);
  }, [isDataLoaded]);

  return (
    <Animated.View style={[styles.splashContainer, { opacity: containerFade }]}>
      <Animated.View style={{ opacity: fadeAnim, transform: [{ scale: scaleBy }] }}>
        <Image 
          source={require('@/assets/images/splash-icon.png')} 
          style={styles.splashLogo} 
          resizeMode="contain" 
        />
      </Animated.View>
      <View style={styles.splashTextWrap}>
        <Text style={styles.splashTitle}>KCALYX</Text>
        <Text style={styles.splashSub}>AI POWERED TRACKING</Text>
      </View>
    </Animated.View>
  );
}

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

  const [isSplashDone, setIsSplashDone] = useState(false);

  useEffect(() => {
    loadOnboardingState().catch(console.error);

    // 1.1 Load persisted API key
    useStore.getState().loadApiKey().catch(console.error);

    // 2. Check for existing session
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      if (!data.session) setLoading(false); 
    });

    // 3. Listen for auth state changes 
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const handleDeepLink = (event: { url: string }) => {
      // Supabase automatically picks up hash fragments if we listen to onAuthStateChange
    };

    const subscribe = Linking.addEventListener('url', handleDeepLink);

    Linking.getInitialURL().then((url) => {
      if (url) handleDeepLink({ url });
    });

    return () => {
      subscription.unsubscribe();
      subscribe.remove();
    };
  }, []);

  useEffect(() => {
    if (user) {
      fetchProfile().catch(console.error);
      fetchEntries().catch(console.error);
      fetchWeeklyData().catch(console.error);
      loadGoalCalories().catch(console.error);
      useStore.getState().loadApiKey().catch(console.error);
    }
  }, [user]);

  const apiKey = useStore((s: any) => s.apiKey);
  const isApiKeyLoading = useStore((s: any) => s.isApiKeyLoading);

  // Combined readiness check
  const isDataReady = !isLoading && (!user || (!isProfileLoading && !isApiKeyLoading));

  if (!isSplashDone) {
    return (
      <View style={{ flex: 1, backgroundColor: '#000000' }}>
        <AnimatedSplashScreen onFinish={() => setIsSplashDone(true)} isDataLoaded={isDataReady} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#000000' }}>
      {!user ? (
        <>
          <LoginScreen />
          <StatusBar style="light" />
        </>
      ) : !hasOnboarded ? (
        <>
          <OnboardingScreen />
          <StatusBar style="light" />
        </>
      ) : !apiKey ? (
        <>
          <ConnectAIScreen />
          <StatusBar style="light" />
        </>
      ) : (
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <Stack>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
            <Stack.Screen name="connect-ai" options={{ headerShown: false }} />
          </Stack>
          <StatusBar style="auto" />
        </ThemeProvider>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  splashLogo: {
    width: width * 0.45,
    height: width * 0.45,
  },
  splashTextWrap: {
    marginTop: 40,
    alignItems: 'center',
  },
  splashTitle: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: 10,
    marginBottom: 8,
    fontFamily: 'Outfit_700Bold', // Falls back if not loaded
  },
  splashSub: {
    color: '#6EE7B7',
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 4,
    opacity: 0.8,
  }
});
