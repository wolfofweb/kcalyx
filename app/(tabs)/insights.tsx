import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// ─────────────────────────────────────────────
// Theme
// ─────────────────────────────────────────────
const C = {
  bg: '#0A0B0D',
  surface: '#13151A',
  border: '#242830',
  text: '#F1F5F9',
  textMuted: '#64748B',
  indigo: '#818CF8',
};

export default function InsightsScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.screenTitle}>Insights</Text>
          <Text style={styles.screenSub}>Personalized AI recommendations</Text>
        </View>

        <View style={styles.comingSoonCard}>
          <Text style={styles.emoji}>✨</Text>
          <Text style={styles.title}>Insights coming soon</Text>
          <Text style={styles.subtitle}>
            We're building an advanced AI engine to provide personal recommendations based on your habits.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  container: { flex: 1, paddingHorizontal: 20 },
  
  header: {
    paddingTop: 16,
    paddingBottom: 20,
  },
  screenTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: C.text,
    letterSpacing: -0.5,
  },
  screenSub: {
    fontSize: 13,
    color: C.textMuted,
    marginTop: 2,
  },

  comingSoonCard: {
    flex: 1,
    backgroundColor: C.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: C.border,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    maxHeight: 400,
    marginTop: 8,
  },
  emoji: {
    fontSize: 48,
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: C.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: C.textMuted,
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 280,
  },
});
