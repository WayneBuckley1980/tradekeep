import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';

import { Card } from '@/components/Card';
import { UrgencyBanner } from '@/components/UrgencyBanner';
import { colors, inputStyle, spacing, typography } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { deleteCustomer, fetchCustomer, updateCustomer } from '@/lib/customers';
import { formatDisplayDate, formatRelativeDate } from '@/lib/dates';
import {
  cancelNotificationIds,
  ensureNotificationPermissions,
  scheduleFollowUpNotifications,
} from '@/lib/notifications';
import type { Customer } from '@/types/database';

export default function CustomerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [notes, setNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user?.id || !id) return;
    const data = await fetchCustomer(user.id, id);
    setCustomer(data);
    setNotes(data?.notes ?? '');
  }, [user?.id, id]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load()
        .catch(console.error)
        .finally(() => setLoading(false));
    }, [load]),
  );

  const saveNotes = async () => {
    if (!user?.id || !customer) return;
    setSavingNotes(true);
    try {
      const updated = await updateCustomer(user.id, customer.id, { notes: notes.trim() || null });
      setCustomer(updated);
    } finally {
      setSavingNotes(false);
    }
  };

  const handleDelete = () => {
    Alert.alert('Delete client', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          if (!user?.id || !customer) return;
          await cancelNotificationIds(customer.notification_ids);
          await deleteCustomer(user.id, customer.id);
          router.back();
        },
      },
    ]);
  };

  if (loading || !customer) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.textPrimary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <UrgencyBanner followUpAt={customer.follow_up_at} customerName={customer.name} />

      <Text style={styles.name}>{customer.name}</Text>

      <Card style={styles.card}>
        <Text style={styles.label}>Last appointment</Text>
        <Text style={styles.value}>
          {customer.last_appointment
            ? `${formatDisplayDate(customer.last_appointment)} (${formatRelativeDate(customer.last_appointment)})`
            : 'Not recorded'}
        </Text>

        <Text style={[styles.label, styles.spaced]}>Amount paid</Text>
        <Text style={styles.value}>
          {customer.amount_paid != null ? `£${Number(customer.amount_paid).toFixed(2)}` : 'Not recorded'}
        </Text>

        <Text style={[styles.label, styles.spaced]}>Follow-up</Text>
        <Text style={styles.value}>
          {customer.follow_up_at ? formatDisplayDate(customer.follow_up_at) : 'Not set'}
        </Text>
      </Card>

      <Card style={styles.card}>
        <Text style={styles.label}>Notes / preferences</Text>
        <TextInput
          style={[styles.notesInput, inputStyle]}
          value={notes}
          onChangeText={setNotes}
          multiline
          placeholder="Add notes about this client"
          placeholderTextColor={colors.textMuted}
          onBlur={saveNotes}
        />
        {savingNotes ? <Text style={styles.saving}>Saving…</Text> : null}
      </Card>

      <Pressable style={styles.editButton} onPress={() => router.push(`/customer/${customer.id}/edit`)}>
        <Text style={styles.editText}>Edit client</Text>
      </Pressable>

      <Pressable onPress={handleDelete}>
        <Text style={styles.delete}>Delete client</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  name: {
    ...typography.title,
    color: colors.textPrimary,
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  card: {
    marginBottom: spacing.md,
  },
  label: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  spaced: {
    marginTop: spacing.md,
  },
  value: {
    ...typography.body,
    color: colors.textPrimary,
    marginTop: spacing.xs,
  },
  notesInput: {
    marginTop: spacing.sm,
    minHeight: 120,
    textAlignVertical: 'top',
  },
  saving: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  editButton: {
    backgroundColor: colors.ctaBackground,
    borderRadius: 12,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  editText: {
    ...typography.label,
    color: colors.ctaText,
    fontWeight: '700',
  },
  delete: {
    ...typography.body,
    color: '#FF6B6B',
    textAlign: 'center',
  },
});
