import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';

import { Card } from '@/components/Card';
import { ContactActions } from '@/components/CustomerRow';
import { KeyboardSafeScroll } from '@/components/KeyboardSafeScroll';
import { colors, inputStyle, spacing, typography } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import {
  convertLeadToClient,
  deleteLead,
  fetchLead,
  leadStatusLabel,
  LEAD_STATUSES,
  updateLead,
} from '@/lib/leads';
import type { Lead, LeadStatus } from '@/types/database';

export default function LeadDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [converting, setConverting] = useState(false);

  const load = useCallback(async () => {
    if (!user?.id || !id) return;
    setLead(await fetchLead(user.id, id));
  }, [user?.id, id]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load()
        .catch(console.error)
        .finally(() => setLoading(false));
    }, [load]),
  );

  const setStatus = async (status: LeadStatus) => {
    if (!user?.id || !lead) return;
    setLead(await updateLead(user.id, lead.id, { status }));
  };

  const handleConvert = async () => {
    if (!user?.id || !lead) return;
    setConverting(true);
    try {
      const customer = await convertLeadToClient(user.id, lead.id);
      router.replace(`/customer/${customer.id}`);
    } catch (error) {
      Alert.alert('Could not convert', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setConverting(false);
    }
  };

  const handleDelete = () => {
    Alert.alert('Delete lead', 'Remove this enquiry?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          if (!user?.id || !lead) return;
          await deleteLead(user.id, lead.id);
          router.back();
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.textPrimary} />
      </View>
    );
  }

  if (!lead) {
    return (
      <View style={styles.center}>
        <Text style={styles.body}>Lead not found.</Text>
      </View>
    );
  }

  const pseudoCustomer = {
    id: lead.id,
    name: lead.name,
    phone: lead.phone,
    email: lead.email,
    address_line1: null,
    address_line2: null,
    city: null,
    postcode: null,
    notes: null,
    is_favourite: false,
    next_action: null,
    next_action_due_at: null,
    last_appointment: null,
    amount_paid: null,
    follow_up_at: null,
    notification_ids: null,
    rating: null,
    archived_at: null,
    last_contacted_at: null,
    lead_id: null,
    reminder_type: null,
    reminder_offset_days: null,
    user_id: lead.user_id,
    created_at: lead.created_at,
    updated_at: lead.updated_at,
  };

  return (
    <KeyboardSafeScroll contentContainerStyle={styles.content}>
      <Text style={styles.name}>{lead.name}</Text>
      {lead.requested_service ? (
        <Text style={styles.requested}>Requested: {lead.requested_service}</Text>
      ) : null}
      <ContactActions customer={pseudoCustomer} />

      <Card style={styles.card}>
        <Text style={styles.label}>Status</Text>
        <View style={styles.statusRow}>
          {LEAD_STATUSES.map((status) => (
            <Pressable
              key={status}
              style={[styles.chip, lead.status === status && styles.chipActive]}
              onPress={() => setStatus(status)}
            >
              <Text style={styles.chipText}>{leadStatusLabel(status)}</Text>
            </Pressable>
          ))}
        </View>
      </Card>

      {lead.notes ? (
        <Card style={styles.card}>
          <Text style={styles.label}>Notes</Text>
          <Text style={styles.value}>{lead.notes}</Text>
        </Card>
      ) : null}

      {lead.converted_customer_id ? (
        <Pressable
          style={styles.btn}
          onPress={() => router.push(`/customer/${lead.converted_customer_id}`)}
        >
          <Text style={styles.btnText}>View client</Text>
        </Pressable>
      ) : (
        <Pressable style={styles.btn} onPress={handleConvert} disabled={converting}>
          <Text style={styles.btnText}>{converting ? 'Converting…' : 'Convert to client'}</Text>
        </Pressable>
      )}

      <Pressable onPress={handleDelete}>
        <Text style={styles.delete}>Delete lead</Text>
      </Pressable>
    </KeyboardSafeScroll>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  name: { ...typography.title, color: colors.textPrimary, marginBottom: spacing.xs },
  requested: { ...typography.body, color: colors.textSecondary, marginBottom: spacing.sm },
  body: { ...typography.body, color: colors.textPrimary },
  card: { marginBottom: spacing.md },
  label: { ...typography.caption, color: colors.textSecondary },
  value: { ...typography.body, color: colors.textPrimary, marginTop: spacing.xs },
  statusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
  chip: { borderWidth: 1, borderColor: colors.borderSubtle, borderRadius: 8, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  chipActive: { borderColor: colors.textPrimary, backgroundColor: colors.surfaceElevated },
  chipText: { ...typography.caption, color: colors.textPrimary },
  btn: { backgroundColor: colors.ctaBackground, borderRadius: 12, padding: spacing.md, alignItems: 'center', marginTop: spacing.md },
  btnText: { ...typography.label, color: colors.ctaText, fontWeight: '700' },
  delete: { ...typography.body, color: colors.statusOverdue, textAlign: 'center', marginTop: spacing.lg },
});
