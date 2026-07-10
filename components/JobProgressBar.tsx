import { Fragment } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '@/constants/theme';
import { PIPELINE_LABELS, PIPELINE_ORDER, pipelineStatusIndex } from '@/lib/jobPipeline';
import type { JobPipelineStatus } from '@/types/database';

const GOLD = '#D4AF37';
const GOLD_LIGHT = '#FFD700';
const TRACK_MUTED = '#6B6B6B';
const TRACK_INACTIVE = '#4A4A4A';

type JobProgressBarProps = {
  currentStatus: JobPipelineStatus;
};

export function JobProgressBar({ currentStatus }: JobProgressBarProps) {
  const currentIndex = pipelineStatusIndex(currentStatus);

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        {PIPELINE_ORDER.map((stage, index) => {
          const done = index <= currentIndex;
          const connectorGold = index > 0 && index <= currentIndex;

          return (
            <Fragment key={stage}>
              {index > 0 ? (
                <View style={styles.connectorWrap}>
                  {connectorGold ? (
                    <LinearGradient
                      colors={[GOLD, GOLD_LIGHT]}
                      start={{ x: 0, y: 0.5 }}
                      end={{ x: 1, y: 0.5 }}
                      style={styles.connector}
                    />
                  ) : (
                    <View style={[styles.connector, styles.connectorInactive]} />
                  )}
                </View>
              ) : null}

              <View style={styles.step}>
                {done ? (
                  <LinearGradient colors={[GOLD, GOLD_LIGHT]} style={styles.circleDone}>
                    <Text style={styles.checkmark}>✓</Text>
                  </LinearGradient>
                ) : (
                  <View style={styles.circlePending}>
                    <Text style={styles.stepNumber}>{index + 1}</Text>
                  </View>
                )}
                <Text style={[styles.label, done && styles.labelDone]} numberOfLines={1}>
                  {PIPELINE_LABELS[stage]}
                </Text>
              </View>
            </Fragment>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    width: '100%',
  },
  connectorWrap: {
    flex: 1,
    justifyContent: 'center',
    marginTop: 12,
    minWidth: 8,
  },
  connector: {
    height: 3,
    borderRadius: 2,
    width: '100%',
  },
  connectorInactive: {
    backgroundColor: TRACK_INACTIVE,
  },
  step: {
    alignItems: 'center',
    minWidth: 44,
    maxWidth: 56,
  },
  circleDone: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: {
    color: '#1A1A1A',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 16,
  },
  circlePending: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: TRACK_MUTED,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  stepNumber: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  label: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 9,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  labelDone: {
    color: GOLD_LIGHT,
    fontWeight: '600',
  },
});
