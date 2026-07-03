import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  SectionList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';

import { BusinessTypeGate, BusinessTypePicker } from '@/components/BusinessTypePicker';
import { Card } from '@/components/Card';
import { CustomerRow } from '@/components/CustomerRow';
import { EmptyState } from '@/components/EmptyState';
import { SearchBar } from '@/components/SearchBar';
import { SwipeToDelete } from '@/components/SwipeToDelete';
import { FREE_TIER_LIMIT, spacing, typography, type ThemeColors } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useTerminology } from '@/hooks/useTerminology';
import { fetchCustomers, updateProfile, deleteCustomer } from '@/lib/customers';
import { filterCustomers, groupCustomers, sortCustomers } from '@/lib/customerGroups';
import { convertLeadToClient, deleteLead, fetchLeads, leadStatusLabel } from '@/lib/leads';
import { DEFAULT_JOB_TEMPLATES } from '@/lib/terminology';
import { seedDefaultTemplates } from '@/lib/templates';
import type { BusinessType, Customer, Lead } from '@/types/database';

export default function HomeScreen() {
  const { user, isPro, profile, refreshProfile } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const terms = useTerminology();
  const needsBusinessType = !profile?.business_type;

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<'clients' | 'leads'>('clients');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingType, setSavingType] = useState(false);

  const load = useCallback(async () => {
    if (!user?.id) return;
    const [data, leadData] = await Promise.all([fetchCustomers(user.id), fetchLeads(user.id)]);
    setCustomers(sortCustomers(data));
    setLeads(leadData.filter((l) => l.status !== 'won' && l.status !== 'lost'));
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load()
        .catch(console.error)
        .finally(() => setLoading(false));
    }, [load]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  };

  const handleSelectBusinessType = async (type: BusinessType) => {
    if (!user?.id) return;
    setSavingType(true);
    try {
      await updateProfile(user.id, { business_type: type });
      await seedDefaultTemplates(
        user.id,
        DEFAULT_JOB_TEMPLATES[type].map((t) => ({ ...t, description: null })),
      );
      await refreshProfile();
    } catch (error) {
      Alert.alert('Could not save', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setSavingType(false);
    }
  };

  const handleConvertLead = async (lead: Lead) => {
    if (!user?.id) return;
    try {
      const customer = await convertLeadToClient(user.id, lead.id);
      await load();
      router.push(`/customer/${customer.id}`);
    } catch (error) {
      Alert.alert('Could not convert', error instanceof Error ? error.message : 'Unknown error');
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.textPrimary} />
      </View>
    );
  }

  if (needsBusinessType) {
    return (
      <View style={styles.container}>
        <BusinessTypeGate onSelect={handleSelectBusinessType} saving={savingType} />
      </View>
    );
  }

  const filtered = filterCustomers(customers, query);
  const sections = groupCustomers(filtered);
  const filteredLeads = leads.filter(
    (l) =>
      !query.trim() ||
      l.name.toLowerCase().includes(query.toLowerCase()) ||
      l.requested_service?.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <View style={styles.container}>
      <View style={styles.typeBar}>
        <Text style={styles.typeLabel}>Business type</Text>
        <BusinessTypePicker
          compact
          value={profile?.business_type ?? null}
          onChange={handleSelectBusinessType}
        />
      </View>

      <View style={styles.tabRow}>
        <Pressable style={[styles.tab, tab === 'clients' && styles.tabActive]} onPress={() => setTab('clients')}>
          <Text style={styles.tabText}>{terms.clients}</Text>
        </Pressable>
        <Pressable style={[styles.tab, tab === 'leads' && styles.tabActive]} onPress={() => setTab('leads')}>
          <Text style={styles.tabText}>Leads ({leads.length})</Text>
        </Pressable>
      </View>

      <Pressable onPress={() => router.push('/search')} style={styles.searchWrap}>
        <SearchBar value={query} onChangeText={setQuery} placeholder={`Search ${terms.clients.toLowerCase()}, leads…`} />
      </Pressable>

      {!isPro && tab === 'clients' ? (
        <Text style={styles.limit}>
          {customers.length}/{FREE_TIER_LIMIT} clients on free plan
        </Text>
      ) : null}

      {tab === 'leads' ? (
        <SectionList
          sections={[{ title: 'Active leads', data: filteredLeads }]}
          keyExtractor={(item) => item.id}
          renderSectionHeader={() => null}
          renderItem={({ item }) => (
            <SwipeToDelete
              deleteLabel="Delete"
              confirmTitle="Delete lead"
              confirmMessage="Remove this enquiry?"
              onDelete={async () => {
                if (!user?.id) return;
                await deleteLead(user.id, item.id);
                await load();
              }}
            >
              <Card style={styles.leadCard}>
                <Pressable onPress={() => router.push(`/lead/${item.id}` as never)}>
                  <Text style={styles.leadName}>{item.name}</Text>
                  {item.requested_service ? <Text style={styles.leadService}>{item.requested_service}</Text> : null}
                  <Text style={styles.leadStatus}>{leadStatusLabel(item.status)}</Text>
                </Pressable>
                <Pressable style={styles.convertBtn} onPress={() => void handleConvertLead(item)}>
                  <Text style={styles.convertText}>Convert to client</Text>
                </Pressable>
              </Card>
            </SwipeToDelete>
          )}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.textPrimary} />
          }
          ListEmptyComponent={
            <EmptyState title="No leads yet" message="Capture enquiries before they become clients." />
          }
          ListHeaderComponent={
            <Pressable style={styles.addLead} onPress={() => router.push('/lead/new' as never)}>
              <Text style={styles.addLeadText}>+ New lead</Text>
            </Pressable>
          }
        />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          renderSectionHeader={({ section: { title } }) => (
            <Text style={styles.sectionTitle}>{title}</Text>
          )}
          renderItem={({ item }) => (
            <SwipeToDelete
              deleteLabel="Delete"
              confirmTitle={`Delete ${terms.client.toLowerCase()}`}
              confirmMessage="This cannot be undone."
              onDelete={async () => {
                if (!user?.id) return;
                await deleteCustomer(user.id, item.id);
                await load();
              }}
            >
              <CustomerRow customer={item} />
            </SwipeToDelete>
          )}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.textPrimary} />
          }
          ListEmptyComponent={
            <EmptyState
              title={`Add your first ${terms.client.toLowerCase()}`}
              message="Tap a client to manage quotes, work, and invoices in one place."
            />
          }
        />
      )}
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  typeBar: { paddingTop: spacing.sm, paddingBottom: spacing.xs, borderBottomWidth: 1, borderBottomColor: colors.borderSubtle },
  typeLabel: { ...typography.caption, color: colors.textMuted, paddingHorizontal: spacing.md, marginBottom: spacing.xs },
  tabRow: { flexDirection: 'row', paddingHorizontal: spacing.md, gap: spacing.sm, marginTop: spacing.sm, marginBottom: spacing.sm },
  tab: { flex: 1, borderWidth: 1, borderColor: colors.borderSubtle, borderRadius: 10, padding: spacing.sm, alignItems: 'center' },
  tabActive: { borderColor: colors.textPrimary, backgroundColor: colors.surfaceElevated },
  tabText: { ...typography.label, color: colors.textPrimary, fontWeight: '600' },
  searchWrap: { paddingHorizontal: spacing.md },
  limit: { ...typography.caption, color: colors.textSecondary, paddingHorizontal: spacing.md, marginBottom: spacing.sm },
  sectionTitle: {
    ...typography.label,
    color: colors.textSecondary,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  listContent: { paddingHorizontal: spacing.md, paddingBottom: 120 },
  leadCard: { marginBottom: spacing.sm },
  leadName: { ...typography.heading, color: colors.textPrimary, fontSize: 18 },
  leadService: { ...typography.body, color: colors.textSecondary, marginTop: spacing.xs },
  leadStatus: { ...typography.caption, color: colors.textMuted, marginTop: spacing.xs, textTransform: 'capitalize' },
  convertBtn: { marginTop: spacing.sm, backgroundColor: colors.surfaceElevated, borderRadius: 8, padding: spacing.sm, alignItems: 'center', borderWidth: 1, borderColor: colors.borderSubtle },
  convertText: { ...typography.caption, color: colors.textPrimary, fontWeight: '700' },
  addLead: { backgroundColor: colors.ctaBackground, borderRadius: 10, padding: spacing.md, alignItems: 'center', marginBottom: spacing.md },
  addLeadText: { ...typography.label, color: colors.ctaText, fontWeight: '700' },
  });
}
