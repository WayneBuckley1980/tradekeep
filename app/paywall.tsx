import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { PaywallSheet } from '@/components/PaywallSheet';
import { colors, spacing } from '@/constants/theme';

export default function PaywallScreen() {
  const { reason } = useLocalSearchParams<{ reason?: string }>();

  return (
    <View style={styles.container}>
      <Pressable style={styles.close} onPress={() => router.back()}>
        <Text style={styles.closeText}>Close</Text>
      </Pressable>
      <PaywallSheet reason={reason} onClose={() => router.back()} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  close: {
    alignSelf: 'flex-end',
    padding: spacing.md,
  },
  closeText: {
    color: colors.textSecondary,
    fontSize: 16,
  },
});
