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

import { CustomerRow } from '@/components/CustomerRow';
import { EmptyState } from '@/components/EmptyState';
import { SearchBar } from '@/components/SearchBar';
import { colors, FREE_TIER_LIMIT, spacing, typography } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { fetchCustomers } from '@/lib/customers';
import { filterCustomers, groupCustomers, sortCustomers } from '@/lib/customerGroups';
import type { Customer } from '@/types/database';

export default function ClientsScreen() {
  const { user, isPro } = useAuth();
  const { width } = useWindowDimensions();
  const isWide = width >= 768;

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!user?.id) return;
    const data = await fetchCustomers(user.id);
    setCustomers(sortCustomers(data));
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
        <Pressable onPress={() => router.push('/search')}>
          <SearchBar value={query} onChangeText={setQuery} placeholder="Search name, phone, notes…" />
        </Pressable>

        {!isPro ? (
          <Text style={styles.limit}>
            {customers.length}/{FREE_TIER_LIMIT} clients on free plan
          </Text>
        ) : null}

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
              title="Add your first client"
              message="Remember what they like and when to chase them."
            />
          }
        />
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
});
