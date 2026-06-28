import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

import { Card } from '@/components/Card';
import { colors, spacing, typography } from '@/constants/theme';
import { formatJobDateTime } from '@/lib/jobs';
import type { PropertyJobGroup } from '@/lib/properties';

type PropertyHistorySectionProps = {
  groups: PropertyJobGroup[];
  jobLabel?: string;
};

export function PropertyHistorySection({ groups, jobLabel = 'Jobs' }: PropertyHistorySectionProps) {
  if (groups.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <Text style={styles.sectionTitle}>Property history</Text>
      {groups.map((group) => (
        <Card key={group.property?.id ?? group.addressLabel} style={styles.card}>
          <Text style={styles.address}>{group.addressLabel}</Text>
          {group.property?.label ? <Text style={styles.meta}>{group.property.label}</Text> : null}
          {group.jobs.length === 0 ? (
            <Text style={styles.meta}>No {jobLabel.toLowerCase()} at this address.</Text>
          ) : (
            group.jobs.map((job) => (
              <Pressable key={job.id} style={styles.jobRow} onPress={() => router.push(`/job/${job.id}`)}>
                <Text style={styles.jobTitle}>{job.title}</Text>
                <Text style={styles.meta}>
                  {formatJobDateTime(job.scheduled_at)} · {job.status.replace('_', ' ')}
                </Text>
              </Pressable>
            ))
          )}
        </Card>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.md },
  sectionTitle: { ...typography.label, color: colors.textSecondary, marginBottom: spacing.sm, textTransform: 'uppercase' },
  card: { marginBottom: spacing.sm },
  address: { ...typography.body, color: colors.textPrimary, fontWeight: '600' },
  meta: { ...typography.caption, color: colors.textMuted, marginTop: spacing.xs },
  jobRow: { marginTop: spacing.sm, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.borderSubtle },
  jobTitle: { ...typography.body, color: colors.textPrimary },
});
