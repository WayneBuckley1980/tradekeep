import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

import { Card } from '@/components/Card';
import { colors, spacing, typography } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { updateProfile } from '@/lib/customers';
import { seedDefaultTemplates } from '@/lib/templates';
import { BUSINESS_TYPES, DEFAULT_JOB_TEMPLATES, WORK_LOCATIONS } from '@/lib/terminology';
import type { BusinessType, WorkLocationType } from '@/types/database';

export default function OnboardingScreen() {
  const { user, refreshProfile } = useAuth();
  const [step, setStep] = useState<1 | 2>(1);
  const [businessType, setBusinessType] = useState<BusinessType>('trades');
  const [workLocation, setWorkLocation] = useState<WorkLocationType>('visit_customers');
  const [saving, setSaving] = useState(false);

  const finish = async () => {
    if (!user?.id) return;
    setSaving(true);
    try {
      await updateProfile(user.id, {
        business_type: businessType,
        work_location: workLocation,
        onboarding_completed: true,
      });
      await seedDefaultTemplates(
        user.id,
        DEFAULT_JOB_TEMPLATES[businessType].map((t) => ({ ...t, description: null })),
      );
      await refreshProfile();
      router.replace('/(tabs)/home');
    } finally {
      setSaving(false);
    }
  };

  if (saving) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.textPrimary} />
        <Text style={styles.subtitle}>Setting up TradeKeepCRM…</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Welcome to TradeKeepCRM</Text>
      <Text style={styles.subtitle}>
        {step === 1 ? 'What best describes your business?' : 'How do you usually work?'}
      </Text>

      {step === 1 ? (
        <>
          {BUSINESS_TYPES.map((item) => (
            <Pressable key={item.id} onPress={() => setBusinessType(item.id)}>
              <Card style={StyleSheet.flatten([styles.card, businessType === item.id && styles.cardSelected])}>
                <Text style={styles.cardIcon}>{item.icon}</Text>
                <Text style={styles.cardLabel}>{item.label}</Text>
              </Card>
            </Pressable>
          ))}
          <Pressable style={styles.btn} onPress={() => setStep(2)}>
            <Text style={styles.btnText}>Continue</Text>
          </Pressable>
        </>
      ) : (
        <>
          {WORK_LOCATIONS.map((item) => (
            <Pressable key={item.id} onPress={() => setWorkLocation(item.id)}>
              <Card style={StyleSheet.flatten([styles.card, styles.cardRow, workLocation === item.id && styles.cardSelected])}>
                <Text style={styles.cardLabel}>{item.label}</Text>
              </Card>
            </Pressable>
          ))}
          <Pressable style={styles.btnSecondary} onPress={() => setStep(1)}>
            <Text style={styles.btnSecondaryText}>Back</Text>
          </Pressable>
          <Pressable style={styles.btn} onPress={finish}>
            <Text style={styles.btnText}>Get started</Text>
          </Pressable>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xl * 2 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background, padding: spacing.lg },
  title: { ...typography.title, color: colors.textPrimary, marginBottom: spacing.sm },
  subtitle: { ...typography.body, color: colors.textSecondary, marginBottom: spacing.lg },
  card: { marginBottom: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  cardRow: { paddingVertical: spacing.md },
  cardSelected: { borderColor: colors.textPrimary, borderWidth: 2 },
  cardIcon: { fontSize: 28 },
  cardLabel: { ...typography.body, color: colors.textPrimary, fontWeight: '600', flex: 1 },
  btn: { backgroundColor: colors.ctaBackground, borderRadius: 12, padding: spacing.md, alignItems: 'center', marginTop: spacing.md },
  btnText: { ...typography.label, color: colors.ctaText, fontWeight: '700' },
  btnSecondary: { borderWidth: 1, borderColor: colors.borderSubtle, borderRadius: 12, padding: spacing.md, alignItems: 'center', marginTop: spacing.md },
  btnSecondaryText: { ...typography.label, color: colors.textPrimary, fontWeight: '600' },
});
