import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import useStore from '@/store/useStore';
import { IconSymbol } from '@/components/ui/icon-symbol';

const COLORS = {
  bg: '#000000',
  surface: '#121212',
  surfaceElevated: '#1E1E1E',
  border: '#2A2A2A',
  accent: '#6EE7B7',
  text: '#FFFFFF',
  textMuted: '#9BA1A6',
  danger: '#F87171',
  success: '#34D399',
};

export default function ConnectAIScreen() {
  const router = useRouter();
  const setApiKey = useStore((s: any) => s.setApiKey);
  
  const [keyInput, setKeyInput] = useState('');
  const [isValid, setIsValid] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'idle' | 'success' | 'error'; message: string }>({
    type: 'idle',
    message: '',
  });

  const validateApiKey = async (apiKey: string): Promise<{ valid: boolean; message?: string }> => {
    // 1. Regex check — allowing for 'v1-' and other dash variants
    const formatRegex = /^sk-or-[a-zA-Z0-9-]{20,}$/;
    if (!formatRegex.test(apiKey.trim())) {
      return { valid: false, message: "Invalid key format" };
    }

    try {
      // 2. OpenRouter API check
      const response = await fetch('https://openrouter.ai/api/v1/models', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey.trim()}`,
        },
      });

      if (response.ok) {
        return { valid: true };
      } else {
        return { valid: false, message: "Invalid API key" };
      }
    } catch (err) {
      console.error("Network validation error:", err);
      return { valid: false, message: "Network error. Please try again." };
    }
  };

  const handleVerify = async () => {
    if (!keyInput.trim()) return;
    
    setIsLoading(true);
    setStatus({ type: 'idle', message: '' });

    const result = await validateApiKey(keyInput);
    if (result.valid) {
      setIsValid(true);
      setStatus({ type: 'success', message: 'API Key verified successfully!' });
    } else {
      setIsValid(false);
      setStatus({ type: 'error', message: result.message || 'Verification failed.' });
    }
    setIsLoading(false);
  };

  const user = useStore((s: any) => s.user);
  const { saveApiKey } = require('@/services/apiEncryption');

  const handleContinue = async () => {
    if (isValid && user?.id) {
      setIsLoading(true);
      const result = await saveApiKey(user.id, keyInput.trim());
      
      if (result.success) {
        await setApiKey(keyInput.trim());
        router.replace('/(tabs)');
      } else {
        setStatus({ type: 'error', message: result.error || 'Failed to save key to cloud.' });
      }
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Connect AI</Text>
            <Text style={styles.subtitle}>To track calories, we need an AI key (1 minute setup)</Text>
          </View>

          {/* Instruction Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>How to get your key:</Text>
            
            <View style={styles.step}>
              <View style={styles.stepNumber}><Text style={styles.stepNumberText}>1</Text></View>
              <TouchableOpacity onPress={() => Linking.openURL('https://openrouter.ai/')}>
                <Text style={styles.stepText}>Go to <Text style={styles.link}>OpenRouter.ai</Text></Text>
              </TouchableOpacity>
            </View>

            <View style={styles.step}>
              <View style={styles.stepNumber}><Text style={styles.stepNumberText}>2</Text></View>
              <Text style={styles.stepText}>Sign in or Create an account</Text>
            </View>

            <View style={styles.step}>
              <View style={styles.stepNumber}><Text style={styles.stepNumberText}>3</Text></View>
              <Text style={styles.stepText}>Go to Keys and click <Text style={styles.bold}>Create Key</Text></Text>
            </View>

            <View style={styles.step}>
              <View style={styles.stepNumber}><Text style={styles.stepNumberText}>4</Text></View>
              <Text style={styles.stepText}>Copy the key and paste it below</Text>
            </View>
          </View>

          {/* Input Section */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>OpenRouter API Key</Text>
            <View style={styles.inputWrap}>
              <TextInput
                style={styles.input}
                value={keyInput}
                onChangeText={(text) => {
                  setKeyInput(text);
                  setIsValid(false);
                  setStatus({ type: 'idle', message: '' });
                }}
                placeholder="sk-or-v1-..."
                placeholderTextColor={COLORS.textMuted}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {status.message ? (
              <View style={styles.statusBox}>
                <Text style={[
                  styles.statusText,
                  status.type === 'error' ? styles.errorText : styles.successText
                ]}>
                  {status.type === 'error' ? '✕ ' : '✓ '}
                  {status.message}
                </Text>
              </View>
            ) : null}

            <TouchableOpacity
              style={[styles.verifyBtn, (!keyInput || isLoading) && styles.disabledBtn]}
              onPress={handleVerify}
              disabled={!keyInput || isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color={COLORS.bg} />
              ) : (
                <Text style={styles.verifyBtnText}>Verify Key</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={{ flex: 1 }} />

          {/* Footer Action */}
          <TouchableOpacity
            style={[styles.continueBtn, !isValid && styles.continueBtnDisabled]}
            onPress={handleContinue}
            disabled={!isValid}
          >
            <Text style={styles.continueBtnText}>Continue to Dashboard</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  scrollContent: {
    padding: 24,
    minHeight: '100%',
  },
  header: {
    marginTop: 20,
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textMuted,
    lineHeight: 22,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 32,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  stepNumberText: {
    color: COLORS.accent,
    fontSize: 12,
    fontWeight: '700',
  },
  stepText: {
    fontSize: 15,
    color: COLORS.text,
    opacity: 0.9,
  },
  link: {
    color: COLORS.accent,
    textDecorationLine: 'underline',
  },
  bold: {
    fontWeight: '700',
  },
  inputContainer: {
    width: '100%',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textMuted,
    marginBottom: 8,
    marginLeft: 4,
  },
  inputWrap: {
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 16,
    height: 60,
    justifyContent: 'center',
  },
  input: {
    color: COLORS.text,
    fontSize: 16,
    width: '100%',
  },
  statusBox: {
    marginTop: 12,
    paddingLeft: 4,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
  },
  errorText: {
    color: COLORS.danger,
  },
  successText: {
    color: COLORS.success,
  },
  verifyBtn: {
    backgroundColor: COLORS.text,
    borderRadius: 16,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  verifyBtnText: {
    color: COLORS.bg,
    fontSize: 16,
    fontWeight: '700',
  },
  disabledBtn: {
    opacity: 0.3,
  },
  continueBtn: {
    backgroundColor: COLORS.accent,
    borderRadius: 18,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
  },
  continueBtnDisabled: {
    backgroundColor: COLORS.surfaceElevated,
    opacity: 0.5,
  },
  continueBtnText: {
    color: '#000000',
    fontSize: 18,
    fontWeight: '700',
  },
});
