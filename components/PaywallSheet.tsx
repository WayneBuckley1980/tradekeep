import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { PurchasesPackage } from 'react-native-purchases';

import { Card } from '@/components/Card';
import { colors, spacing, typography } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import {
  getOfferings,
  isPurchasesConfigured,
  purchasePackage,
  restorePurchases,
} from '@/lib/purchases';

type PaywallSheetProps = {
  onClose?: () => void;
  reason?: string;
};

export function PaywallSheet({ onClose, reason }: PaywallSheetProps) {
  const { refreshProfile } = useAuth();
  const [monthly, setMonthly] = useState<PurchasesPackage | null>(null);
  const [annual, setAnnual] = useState<PurchasesPackage | null>(null);
  const [selected, setSelected] = useState<'monthly' | 'annual'>('annual');
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);

  useEffect(() => {
    (async () => {
      if (!isPurchasesConfigured) {
        setLoading(false);
        return;
      }
      const offering = await getOfferings();
      setMonthly(offering?.monthly ?? null);
      setAnnual(offering?.annual ?? null);
      setLoading(false);
    })();
  }, []);

  const handlePurchase = async () => {
    const pkg = selected === 'monthly' ? monthly : annual;
    if (!pkg) {
      Alert.alert(
        'Subscriptions unavailable',
        'Connect RevenueCat and App Store products to enable purchases. See README for setup.',
      );
      return;
    }

    setWorking(true);
    try {
      const success = await purchasePackage(pkg);
      if (success) {
        await refreshProfile();
        Alert.alert('Welcome to Pro', 'You now have unlimited clients.');
        onClose?.();
      }
    } catch (error) {
      Alert.alert('Purchase failed', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setWorking(false);
    }
  };

  const handleRestore = async () => {
    setWorking(true);
    try {
      const success = await restorePurchases();
      if (success) {
        await refreshProfile();
        Alert.alert('Restored', 'Your Pro subscription is active.');
        onClose?.();
      } else {
        Alert.alert('No subscription found', 'We could not find an active Pro subscription.');
      }
    } catch (error) {
      Alert.alert('Restore failed', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setWorking(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.textPrimary} />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Upgrade to Pro</Text>
      <Text style={styles.subtitle}>
        {reason ?? 'Unlimited clients, same simple follow-up reminders.'}
      </Text>

      <Card style={styles.planCard}>
        <Pressable
          style={[styles.plan, selected === 'monthly' && styles.planSelected]}
          onPress={() => setSelected('monthly')}
        >
          <Text style={styles.planTitle}>Monthly</Text>
          <Text style={styles.planPrice}>£6.99 / month</Text>
        </Pressable>
        <Pressable
          style={[styles.plan, selected === 'annual' && styles.planSelected]}
          onPress={() => setSelected('annual')}
        >
          <Text style={styles.planTitle}>Annual</Text>
          <Text style={styles.planPrice}>£49 / year</Text>
          <Text style={styles.planHint}>Best value</Text>
        </Pressable>
      </Card>

      <Pressable style={styles.cta} onPress={handlePurchase} disabled={working}>
        <Text style={styles.ctaText}>{working ? 'Working…' : 'Subscribe'}</Text>
      </Pressable>

      <Pressable onPress={handleRestore} disabled={working}>
        <Text style={styles.restore}>Restore purchases</Text>
      </Pressable>

      {!isPurchasesConfigured ? (
        <Text style={styles.devNote}>
          Dev mode: set EXPO_PUBLIC_REVENUECAT_API_KEY to test real purchases.
        </Text>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  title: {
    ...typography.title,
    color: colors.textPrimary,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  planCard: {
    gap: spacing.sm,
  },
  plan: {
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: 12,
  },
  planSelected: {
    borderColor: colors.borderFocus,
  },
  planTitle: {
    ...typography.heading,
    color: colors.textPrimary,
  },
  planPrice: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  planHint: {
    ...typography.caption,
    color: colors.textPrimary,
    marginTop: spacing.xs,
    fontWeight: '600',
  },
  cta: {
    backgroundColor: colors.ctaBackground,
    borderRadius: 12,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  ctaText: {
    ...typography.label,
    color: colors.ctaText,
    fontWeight: '700',
  },
  restore: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  devNote: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
});
