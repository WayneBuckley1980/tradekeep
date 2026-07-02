import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

import { Card } from '@/components/Card';
import { StatusBadge } from '@/components/StatusBadge';
import { colors, spacing, typography } from '@/constants/theme';
import { formatJobDateTime } from '@/lib/jobs';
import { formatMoney } from '@/lib/money';
import type { Job } from '@/types/database';

type JobRowProps = {
  job: Job;
  customerName?: string;
};

export function JobRow({ job, customerName }: JobRowProps) {
  return (
    <Pressable onPress={() => router.push(`/job/${job.id}`)}>
      <Card style={styles.row}>
        <View style={styles.header}>
          <Text style={styles.title}>{job.title}</Text>
          <StatusBadge label={job.status.replace('_', ' ')} status={job.status} />
        </View>
        <Text style={styles.meta}>{formatJobDateTime(job.scheduled_at)}</Text>
        {customerName ? <Text style={styles.meta}>{customerName}</Text> : null}
        {job.reference ? <Text style={styles.meta}>{job.reference}</Text> : null}
        {job.price != null ? <Text style={styles.price}>{formatMoney(Number(job.price))}</Text> : null}
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { marginBottom: spacing.sm },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.sm },
  title: { ...typography.heading, color: colors.textPrimary, flex: 1, fontSize: 17 },
  meta: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.xs },
  price: { ...typography.label, color: colors.textPrimary, marginTop: spacing.xs },
});
