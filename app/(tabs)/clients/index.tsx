import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  SectionList,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';

import { Card } from '@/components/Card';
import { CustomerRow } from '@/components/CustomerRow';
import { EmptyState } from '@/components/EmptyState';
import { SearchBar } from '@/components/SearchBar';
import { colors, FREE_TIER_LIMIT, spacing, typography } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useTerminology } from '@/hooks/useTerminology';
import { fetchCustomers } from '@/lib/customers';
import { filterCustomers, groupCustomers, sortCustomers } from '@/lib/customerGroups';
import { fetchLeads, leadStatusLabel } from '@/lib/leads';
import type { Customer, Lead } from '@/types/database';

export default function ClientsScreen() {
  const { user, isPro } = useAuth();
  const terms = useTerminology();
  const { width } = useWindowDimensions();
  const isWide = width >= 768;

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<'clients' | 'leads'>('clients');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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

  const filtered = filterCustomers(customers, query);
  const sections = groupCustomers(filtered);
  const filteredLeads = leads.filter((l) =>
    !query.trim() || l.name.toLowerCase().includes(query.toLowerCase()) || l.requested_service?.toLowerCase().includes(query.toLowerCase()),
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.textPrimary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, isWide && styles.containerWide]}>
      <View style={[styles.main, isWide && styles.mainWide]}>
        <View style={styles.tabRow}>
          <Pressable style={[styles.tab, tab === 'clients' && styles.tabActive]} onPress={() => setTab('clients')}>
            <Text style={styles.tabText}>{terms.clients}</Text>
          </Pressable>
          <Pressable style={[styles.tab, tab === 'leads' && styles.tabActive]} onPress={() => setTab('leads')}>
            <Text style={styles.tabText}>Leads ({leads.length})</Text>
          </Pressable>
        </View>

        <Pressable onPress={() => router.push('/search')}>
          <SearchBar value={query} onChangeText={setQuery} placeholder="Search name, phone, notes…" />
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
              <Pressable onPress={() => router.push(`/lead/${item.id}` as never)}>
                <Card style={styles.leadCard}>
                  <Text style={styles.leadName}>{item.name}</Text>
                  {item.requested_service ? <Text style={styles.leadService}>{item.requested_service}</Text> : null}
                  <Text style={styles.leadStatus}>{leadStatusLabel(item.status)}</Text>
                </Card>
              </Pressable>
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
            renderItem={({ item }) => <CustomerRow customer={item} />}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.textPrimary} />
            }
            ListEmptyComponent={
              <EmptyState
                title={`Add your first ${terms.client.toLowerCase()}`}
                message="Remember what they like and when to chase them."
              />
            }
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  containerWide: { alignItems: 'center' },
  main: { flex: 1, width: '100%' },
  mainWide: { maxWidth: 720 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  tabRow: { flexDirection: 'row', paddingHorizontal: spacing.md, gap: spacing.sm, marginBottom: spacing.sm },
  tab: { flex: 1, borderWidth: 1, borderColor: colors.borderSubtle, borderRadius: 10, padding: spacing.sm, alignItems: 'center' },
  tabActive: { borderColor: colors.textPrimary, backgroundColor: colors.surfaceElevated },
  tabText: { ...typography.label, color: colors.textPrimary, fontWeight: '600' },
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
  addLead: { backgroundColor: colors.ctaBackground, borderRadius: 10, padding: spacing.md, alignItems: 'center', marginBottom: spacing.md },
  addLeadText: { ...typography.label, color: colors.ctaText, fontWeight: '700' },
});
