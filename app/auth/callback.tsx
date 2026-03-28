import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import useStore from '@/store/useStore';

export default function AuthCallback() {
  const router = useRouter();
  const user = useStore((s: any) => s.user);

  // If the user becomes available (onAuthStateChange in layout handled it),
  // we can potentially redirect manually, though the root layout usually takes over.
  useEffect(() => {
    if (user) {
      router.replace('/(tabs)');
    }
  }, [user]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#6EE7B7" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
