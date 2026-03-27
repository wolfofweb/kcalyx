import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { supabase } from '../services/supabase';

WebBrowser.maybeCompleteAuthSession();

const C = {
  bg: '#0A0B0D',
  surface: '#13151A',
  surfaceElevated: '#1C1F27',
  border: '#242830',
  accent: '#6EE7B7',
  accentDim: '#1A3B30',
  indigo: '#818CF8',
  google: '#4285F4',
  googleDim: '#0F1E3A',
  text: '#F1F5F9',
  textMuted: '#64748B',
  textSubtle: '#94A3B8',
};

export default function LoginScreen() {
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleLogin = async () => {
    if (isLoading) return;
    setIsLoading(true);

    try {
      // Build redirect URI using Expo Linking (no expo-auth-session needed)
      const redirectTo = Linking.createURL('/');

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          skipBrowserRedirect: true,
        },
      });

      if (error) throw error;
      if (!data?.url) throw new Error('No OAuth URL returned');

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

      if (result.type === 'success' && result.url) {
        // Parse hash fragment — Supabase returns tokens in URL #hash
        const hash = result.url.split('#')[1] ?? '';
        const params = new URLSearchParams(hash);
        const access_token = params.get('access_token');
        const refresh_token = params.get('refresh_token');

        if (access_token && refresh_token) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token,
            refresh_token,
          });
          if (sessionError) throw sessionError;
        }
      }
    } catch (err: any) {
      console.error('Google login error:', err);
      Alert.alert(
        'Login Failed',
        err.message || 'Could not sign in with Google. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <View style={styles.container}>
        {/* Logo & Branding */}
        <View style={styles.hero}>
          <View style={styles.logoWrap}>
            <Text style={styles.logoEmoji}>🥗</Text>
          </View>
          <Text style={styles.appName}>Kcalyx</Text>
          <Text style={styles.tagline}>Track your calories smartly</Text>
          <View style={styles.taglinePill}>
            <Text style={styles.taglinePillText}>✦ AI-powered nutrition tracking</Text>
          </View>
        </View>

        {/* Feature highlights */}
        <View style={styles.features}>
          {[
            { icon: '🤖', text: 'AI food recognition' },
            { icon: '📊', text: 'Smart insights & trends' },
            { icon: '🔥', text: 'Daily streaks & goals' },
          ].map((f) => (
            <View key={f.text} style={styles.featureRow}>
              <View style={styles.featureIconWrap}>
                <Text style={styles.featureIcon}>{f.icon}</Text>
              </View>
              <Text style={styles.featureText}>{f.text}</Text>
            </View>
          ))}
        </View>

        {/* Auth section */}
        <View style={styles.authSection}>
          <TouchableOpacity
            style={[styles.googleBtn, isLoading && styles.googleBtnLoading]}
            onPress={handleGoogleLogin}
            activeOpacity={0.85}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <View style={styles.googleLogoWrap}>
                <Text style={styles.googleLogoText}>G</Text>
              </View>
            )}
            <Text style={styles.googleBtnText}>
              {isLoading ? 'Signing in…' : 'Continue with Google'}
            </Text>
          </TouchableOpacity>

          <Text style={styles.disclaimer}>
            By continuing, you agree to our Terms of Service and Privacy Policy.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: C.bg,
  },
  container: {
    flex: 1,
    paddingHorizontal: 28,
    justifyContent: 'space-between',
    paddingBottom: 40,
    paddingTop: 20,
  },

  // Hero
  hero: {
    alignItems: 'center',
    paddingTop: 40,
  },
  logoWrap: {
    width: 96,
    height: 96,
    borderRadius: 28,
    backgroundColor: C.accentDim,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 1.5,
    borderColor: C.accent + '40',
    shadowColor: C.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 12,
  },
  logoEmoji: {
    fontSize: 44,
  },
  appName: {
    fontSize: 40,
    fontWeight: '900',
    color: C.text,
    letterSpacing: -1.5,
    marginBottom: 8,
  },
  tagline: {
    fontSize: 17,
    color: C.textSubtle,
    fontWeight: '500',
    marginBottom: 16,
    letterSpacing: -0.2,
  },
  taglinePill: {
    backgroundColor: C.accentDim,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: C.accent + '30',
  },
  taglinePillText: {
    fontSize: 12,
    color: C.accent,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  // Features
  features: {
    gap: 12,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: C.surface,
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: C.border,
  },
  featureIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: C.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureIcon: {
    fontSize: 18,
  },
  featureText: {
    fontSize: 15,
    color: C.text,
    fontWeight: '500',
  },

  // Auth section
  authSection: {
    gap: 14,
  },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: C.google,
    borderRadius: 16,
    paddingVertical: 16,
    shadowColor: C.google,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  googleBtnLoading: {
    opacity: 0.7,
  },
  googleLogoWrap: {
    width: 26,
    height: 26,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleLogoText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#fff',
  },
  googleBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -0.2,
  },
  disclaimer: {
    textAlign: 'center',
    fontSize: 12,
    color: C.textMuted,
    lineHeight: 18,
  },
});
