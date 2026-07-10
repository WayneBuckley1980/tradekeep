import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';

import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { colors, spacing, typography } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { fetchArchivedJobs, formatJobDateTime, permanentlyDeleteJob } from '@/lib/jobs';
import type { Job } from '@/types/database';

export default function ArchivedJobsScreen() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!user?.id) return;
    setJobs(await fetchArchivedJobs(user.id));
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load().catch(console.error).finally(() => setLoading(false));
    }, [load]),
  );

  const handlePermanentDelete = (job: Job) => {
    Alert.alert(
      'Permanently delete job',
      'This will permanently remove the job and cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete permanently',
          style: 'destructive',
          onPress: async () => {
            if (!user?.id) return;
            await permanentlyDeleteJob(user.id, job.id);
            await load();
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.textPrimary} />
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      data={jobs}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.list}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={async () => {
            setRefreshing(true);
            try {
              await load();
            } finally {
              setRefreshing(false);
            }
          }}
          tintColor={colors.textPrimary}
        />
      }
      ListEmptyComponent={
        <EmptyState title="No archived jobs" message="Deleted jobs appear here until permanently removed." />
      }
      renderItem={({ item }) => (
        <Card style={styles.card}>
          <Text style={styles.title}>{item.title}</Text>
          {item.reference ? <Text style={styles.meta}>{item.reference}</Text> : null}
          {item.deleted_at ? (
            <Text style={styles.meta}>Archived {formatJobDateTime(item.deleted_at)}</Text>
          ) : null}
          <Pressable style={styles.deleteBtn} onPress={() => handlePermanentDelete(item)}>
            <Text style={styles.deleteText}>Delete permanently</Text>
          </Pressable>
        </Card>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  list: { padding: spacing.md, paddingBottom: spacing.xl },
  card: { marginBottom: spacing.sm },
  title: { ...typography.heading, color: colors.textPrimary, fontSize: 18 },
  meta: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.xs },
  deleteBtn: { marginTop: spacing.sm, alignItems: 'center', padding: spacing.sm },
  deleteText: { ...typography.caption, color: colors.statusOverdue, fontWeight: '600' },
});
