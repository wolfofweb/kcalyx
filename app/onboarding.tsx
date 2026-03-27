import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import useStore from '../store/useStore';
import { supabase } from '../services/supabase';

const C = {
  bg: '#0A0B0D',
  surface: '#13151A',
  surfaceElevated: '#1C1F27',
  border: '#242830',
  accent: '#6EE7B7',
  accentDim: '#1A3B30',
  indigo: '#818CF8',
  indigoDim: '#1E1F3A',
  text: '#F1F5F9',
  textMuted: '#64748B',
  textSubtle: '#94A3B8',
};

interface FieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  unit: string;
  placeholder: string;
  accent?: string;
}

function MetricField({ label, value, onChange, unit, placeholder, accent = C.accent }: FieldProps) {
  return (
    <View style={styles.fieldWrap}>
      <View style={styles.fieldLabelRow}>
        <Text style={styles.fieldLabel}>{label}</Text>
        <Text style={styles.fieldUnit}>{unit}</Text>
      </View>
      <View style={[styles.inputWrap, { borderColor: value ? accent + '60' : C.border }]}>
        <TextInput
          style={[styles.input, { color: accent }]}
          value={value}
          onChangeText={onChange}
          keyboardType="decimal-pad"
          returnKeyType="done"
          placeholder={placeholder}
          placeholderTextColor={C.textMuted}
          selectTextOnFocus
          maxLength={6}
        />
        <Text style={styles.unitLabel}>{unit}</Text>
      </View>
    </View>
  );
}

export default function OnboardingScreen() {
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [targetWeight, setTargetWeight] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const setHasOnboarded = useStore((s: any) => s.setHasOnboarded);
  const setBodyMetrics = useStore((s: any) => s.setBodyMetrics);
  const user = useStore((s: any) => s.user);

  const isValid = height.trim() && weight.trim() && targetWeight.trim() && !isSubmitting;

  const handleContinue = async () => {
    if (!isValid) {
      if (!isSubmitting) Alert.alert('Missing Info', 'Please fill in all three fields to continue.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (!user?.id) throw new Error('User not authenticated');

      // 1. Save to Supabase
      const { error } = await supabase.from('profiles').upsert({
        id: user.id,
        height: parseFloat(height),
        weight: parseFloat(weight),
        target_weight: parseFloat(targetWeight),
      });

      if (error) throw error;

      // 2. Update local store
      await setBodyMetrics({ height, weight, targetWeight });
      await setHasOnboarded(true);
    } catch (err: any) {
      console.error('Onboarding save failed:', err);
      Alert.alert('Error', 'Failed to save your profile. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.step}>Step 1 of 1</Text>
            <Text style={styles.title}>Let's set up{'\n'}your profile</Text>
            <Text style={styles.subtitle}>
              We'll use this to calculate your daily calorie goal.
            </Text>
          </View>

          {/* Fields */}
          <View style={styles.fields}>
            <MetricField
              label="Height"
              value={height}
              onChange={setHeight}
              unit="cm"
              placeholder="175"
              accent={C.indigo}
            />
            <MetricField
              label="Current Weight"
              value={weight}
              onChange={setWeight}
              unit="kg"
              placeholder="75"
              accent={C.accent}
            />
            <MetricField
              label="Target Weight"
              value={targetWeight}
              onChange={setTargetWeight}
              unit="kg"
              placeholder="70"
              accent={C.accent}
            />
          </View>

          {/* Info pill */}
          {height && weight && targetWeight && (
            <View style={styles.infoPill}>
              <Text style={styles.infoPillText}>
                {parseFloat(weight) > parseFloat(targetWeight)
                  ? `Goal: lose ${(parseFloat(weight) - parseFloat(targetWeight)).toFixed(1)} kg 🎯`
                  : parseFloat(weight) < parseFloat(targetWeight)
                  ? `Goal: gain ${(parseFloat(targetWeight) - parseFloat(weight)).toFixed(1)} kg 💪`
                  : 'Already at your target weight 🎉'}
              </Text>
            </View>
          )}

          {/* Continue button */}
          <TouchableOpacity
            style={[styles.continueBtn, !isValid && styles.continueBtnDisabled]}
            onPress={handleContinue}
            activeOpacity={0.85}
            disabled={!isValid}
          >
            <Text style={styles.continueBtnText}>
              {isSubmitting ? 'Saving...' : 'Continue'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: C.bg,
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 40,
    justifyContent: 'space-between',
  },

  // Header
  header: {
    marginBottom: 36,
  },
  step: {
    fontSize: 12,
    fontWeight: '700',
    color: C.accent,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  title: {
    fontSize: 34,
    fontWeight: '900',
    color: C.text,
    letterSpacing: -1,
    lineHeight: 40,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 15,
    color: C.textSubtle,
    lineHeight: 22,
    fontWeight: '400',
  },

  // Fields
  fields: {
    gap: 16,
    marginBottom: 20,
  },
  fieldWrap: {
    gap: 8,
  },
  fieldLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: C.textMuted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  fieldUnit: {
    fontSize: 12,
    color: C.textMuted,
    fontWeight: '500',
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surface,
    borderRadius: 16,
    borderWidth: 1.5,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  input: {
    flex: 1,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
    padding: 0,
  },
  unitLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: C.textMuted,
    marginLeft: 4,
  },

  // Info pill
  infoPill: {
    backgroundColor: C.accentDim,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: C.accent + '30',
    marginBottom: 24,
    alignItems: 'center',
  },
  infoPillText: {
    fontSize: 14,
    fontWeight: '700',
    color: C.accent,
  },

  // Button
  continueBtn: {
    backgroundColor: C.accent,
    borderRadius: 16,
    paddingVertical: 17,
    alignItems: 'center',
    shadowColor: C.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  continueBtnDisabled: {
    backgroundColor: C.surfaceElevated,
    shadowOpacity: 0,
    elevation: 0,
  },
  continueBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: C.bg,
    letterSpacing: 0.3,
  },
});
