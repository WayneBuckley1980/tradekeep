import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';

import { Card } from '@/components/Card';
import { StatusBadge } from '@/components/StatusBadge';
import { colors, spacing, typography } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { fetchCustomer } from '@/lib/customers';
import { fetchInvoiceForQuote } from '@/lib/invoices';
import { pipelineErrorMessage } from '@/lib/jobPipeline';
import { acceptQuoteAndActivateJob, sendQuoteByEmail } from '@/lib/jobWorkflow';
import { formatMoney } from '@/lib/money';
import { fetchQuote, quoteSendButtonLabel, quoteStatusLabel, updateQuote } from '@/lib/quotes';
import type { Customer } from '@/types/database';

export default function QuoteDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, profile } = useAuth();
  const [quote, setQuote] = useState<Awaited<ReturnType<typeof fetchQuote>>>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [invoicedRef, setInvoicedRef] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [acceptModalVisible, setAcceptModalVisible] = useState(false);
  const [startAt, setStartAt] = useState(new Date());
  const [addToCalendar, setAddToCalendar] = useState(false);
  const [showStartPicker, setShowStartPicker] = useState(false);

  const load = useCallback(async () => {
    if (!user?.id || !id) return;
    const q = await fetchQuote(user.id, id);
    setQuote(q);
    if (q) {
      const [c, invoice] = await Promise.all([
        fetchCustomer(user.id, q.customer_id),
        fetchInvoiceForQuote(user.id, q.id),
      ]);
      setCustomer(c);
      setInvoicedRef(invoice?.reference ?? null);
    }
  }, [user?.id, id]);

  useFocusEffect(useCallback(() => {
    setLoading(true);
    load().catch(console.error).finally(() => setLoading(false));
  }, [load]));

  const handleSendQuote = async () => {
    if (!user?.id || !quote || !customer || !profile) return;
    setBusy(true);
    try {
      await sendQuoteByEmail(user.id, profile, customer, quote);
      Alert.alert('Quote sent', 'Your mail app opened with the quote PDF attached.');
      load();
    } catch (error) {
      Alert.alert('Could not send quote', pipelineErrorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const handleAccept = async () => {
    if (!user?.id || !quote || !customer) return;
    setBusy(true);
    try {
      const job = await acceptQuoteAndActivateJob(user.id, quote, {
        startAt: startAt.toISOString(),
        addToCalendar,
        customer,
      });
      setAcceptModalVisible(false);
      router.push(`/job/${job.id}`);
    } catch (error) {
      Alert.alert('Could not accept quote', pipelineErrorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  if (loading || !quote) return <View style={styles.center}><ActivityIndicator color={colors.textPrimary} /></View>;

  return (
    <>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>{quote.title}</Text>
          <StatusBadge label={quoteStatusLabel(quote)} status={quote.status} />
        </View>
        <Text style={styles.meta}>{quote.reference} · {customer?.name}</Text>
        {invoicedRef ? <Text style={styles.meta}>Invoiced as {invoicedRef}</Text> : null}
        <Text style={styles.amount}>{formatMoney(Number(quote.amount))}</Text>
        {quote.description ? <Card style={styles.card}><Text style={styles.body}>{quote.description}</Text></Card> : null}
        {quote.status !== 'accepted' && quote.status !== 'rejected' ? (
          <Pressable style={[styles.btn, busy && styles.btnDisabled]} disabled={busy} onPress={handleSendQuote}>
            <Text style={styles.btnText}>{quoteSendButtonLabel(quote)}</Text>
          </Pressable>
        ) : null}
        <Pressable
          style={styles.btnSecondary}
          onPress={() => router.push({ pathname: '/quote/new', params: { quoteId: quote.id } })}
        >
          <Text style={styles.btnSecondaryText}>Edit quote</Text>
        </Pressable>
        <Pressable style={[styles.btnSecondary, busy && styles.btnDisabled]} disabled={busy} onPress={() => setAcceptModalVisible(true)}>
          <Text style={styles.btnSecondaryText}>Client accepted → Activate job</Text>
        </Pressable>
        <Pressable style={styles.btnSecondary} onPress={async () => {
          if (!user?.id) return;
          await updateQuote(user.id, quote.id, { status: 'rejected' });
          load();
        }}><Text style={styles.btnSecondaryText}>Mark rejected</Text></Pressable>
      </ScrollView>

      <Modal visible={acceptModalVisible} transparent animationType="slide" onRequestClose={() => setAcceptModalVisible(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setAcceptModalVisible(false)}>
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>Job start date</Text>
            <Pressable style={styles.dateBtn} onPress={() => setShowStartPicker(true)}>
              <Text style={styles.dateText}>{startAt.toLocaleString('en-GB')}</Text>
            </Pressable>
            {showStartPicker ? (
              <>
                <DateTimePicker
                  value={startAt}
                  mode="datetime"
                  themeVariant="dark"
                  onChange={(_e, d) => d && setStartAt(d)}
                />
                {Platform.OS === 'ios' ? (
                  <Pressable onPress={() => setShowStartPicker(false)}>
                    <Text style={styles.done}>Done</Text>
                  </Pressable>
                ) : null}
              </>
            ) : null}
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Add to calendar</Text>
              <Switch value={addToCalendar} onValueChange={setAddToCalendar} />
            </View>
            <Pressable style={[styles.btn, busy && styles.btnDisabled]} disabled={busy} onPress={handleAccept}>
              <Text style={styles.btnText}>Activate job</Text>
            </Pressable>
            <Pressable style={styles.btnSecondary} onPress={() => setAcceptModalVisible(false)}>
              <Text style={styles.btnSecondaryText}>Cancel</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  content: { padding: spacing.md },
  header: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  title: { ...typography.title, color: colors.textPrimary, flex: 1, fontSize: 22 },
  meta: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.sm },
  amount: { ...typography.heading, color: colors.textPrimary, marginVertical: spacing.md },
  card: { marginBottom: spacing.md },
  body: { ...typography.body, color: colors.textPrimary },
  btn: { backgroundColor: colors.ctaBackground, borderRadius: 12, padding: spacing.md, alignItems: 'center', marginBottom: spacing.sm },
  btnDisabled: { opacity: 0.6 },
  btnText: { ...typography.label, color: colors.ctaText, fontWeight: '700' },
  btnSecondary: { borderWidth: 1, borderColor: colors.borderSubtle, borderRadius: 12, padding: spacing.md, alignItems: 'center', marginBottom: spacing.sm },
  btnSecondaryText: { ...typography.label, color: colors.textPrimary },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: colors.surface, borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: spacing.lg },
  modalTitle: { ...typography.heading, color: colors.textPrimary, marginBottom: spacing.md },
  dateBtn: { borderWidth: 1, borderColor: colors.borderSubtle, borderRadius: 10, padding: spacing.md, marginBottom: spacing.sm },
  dateText: { ...typography.body, color: colors.textPrimary },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  switchLabel: { ...typography.body, color: colors.textPrimary },
  done: { ...typography.caption, color: colors.textPrimary, textAlign: 'right', marginBottom: spacing.sm },
});
