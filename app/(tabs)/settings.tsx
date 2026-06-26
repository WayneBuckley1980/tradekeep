import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

import { Card } from '@/components/Card';
import { colors, FREE_TIER_LIMIT, spacing, typography } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { restorePurchases } from '@/lib/purchases';

export default function SettingsScreen() {
  const { user, isPro, signOut, refreshProfile } = useAuth();

  const handleRestore = async () => {
    try {
      const restored = await restorePurchases();
      await refreshProfile();
      Alert.alert(
        restored ? 'Restored' : 'No subscription',
        restored
          ? 'Your Pro subscription is active.'
          : 'We could not find an active Pro subscription.',
      );
    } catch (error) {
      Alert.alert('Restore failed', error instanceof Error ? error.message : 'Unknown error');
    }
  };

  const handleSignOut = () => {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          await signOut();
          router.replace('/(auth)/sign-in');
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <Card style={styles.card}>
        <Text style={styles.label}>Account</Text>
        <Text style={styles.value}>{user?.email ?? 'Signed in with Apple'}</Text>
      </Card>

      <Card style={styles.card}>
        <Text style={styles.label}>Plan</Text>
        <Text style={styles.value}>{isPro ? 'Pro — unlimited clients' : `Free — up to ${FREE_TIER_LIMIT} clients`}</Text>
        {!isPro ? (
          <Pressable style={styles.linkButton} onPress={() => router.push('/paywall')}>
            <Text style={styles.link}>Upgrade to Pro</Text>
          </Pressable>
        ) : null}
      </Card>

      <Pressable style={styles.row} onPress={handleRestore}>
        <Text style={styles.rowText}>Restore purchases</Text>
      </Pressable>

      <Pressable style={styles.row} onPress={handleSignOut}>
        <Text style={[styles.rowText, styles.destructive]}>Sign out</Text>
      </Pressable>

      <Text style={styles.footer}>TradeKeep v1.0.0</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.md,
  },
  card: {
    marginBottom: spacing.md,
  },
  label: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  value: {
    ...typography.body,
    color: colors.textPrimary,
  },
  linkButton: {
    marginTop: spacing.sm,
  },
  link: {
    ...typography.label,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  row: {
    ...StyleSheet.flatten([
      {
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.borderSubtle,
        borderRadius: 12,
        padding: spacing.md,
        marginBottom: spacing.sm,
      },
    ]),
  },
  rowText: {
    ...typography.body,
    color: colors.textPrimary,
  },
  destructive: {
    color: '#FF6B6B',
  },
  footer: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
});
