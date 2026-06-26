import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

import { SearchBar } from '@/components/SearchBar';
import { colors, spacing, typography } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { searchAll, type SearchResult } from '@/lib/search';

export default function SearchScreen() {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user?.id || query.trim().length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    const timer = setTimeout(() => {
      searchAll(user.id, query)
        .then(setResults)
        .catch(console.error)
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [query, user?.id]);

  return (
    <View style={styles.container}>
      <SearchBar value={query} onChangeText={setQuery} placeholder="Search everything…" />
      {loading ? <ActivityIndicator color={colors.textPrimary} style={{ marginTop: spacing.lg }} /> : null}
      <FlatList
        data={results}
        keyExtractor={(item) => `${item.type}-${item.id}`}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <Pressable style={styles.row} onPress={() => router.push(item.route as never)}>
            <Text style={styles.type}>{item.type}</Text>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.sub}>{item.subtitle}</Text>
          </Pressable>
        )}
        ListEmptyComponent={
          query.length >= 2 && !loading ? (
            <Text style={styles.empty}>No results for "{query}"</Text>
          ) : (
            <Text style={styles.empty}>Search clients, phone, jobs, invoices, notes…</Text>
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.md },
  list: { paddingBottom: spacing.xl },
  row: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderSubtle, borderRadius: 12, padding: spacing.md, marginBottom: spacing.sm },
  type: { ...typography.caption, color: colors.textMuted, textTransform: 'uppercase' },
  title: { ...typography.body, color: colors.textPrimary, fontWeight: '600', marginTop: spacing.xs },
  sub: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  empty: { ...typography.body, color: colors.textMuted, textAlign: 'center', marginTop: spacing.xl },
});
