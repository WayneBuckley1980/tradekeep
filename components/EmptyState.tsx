import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { spacing, typography, type ThemeColors } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';

type EmptyStateProps = {
  title: string;
  message: string;
};

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      padding: spacing.xl,
      alignItems: 'center',
    },
    title: {
      ...typography.heading,
      color: colors.textPrimary,
      textAlign: 'center',
    },
    message: {
      ...typography.body,
      color: colors.textSecondary,
      textAlign: 'center',
      marginTop: spacing.sm,
    },
  });
}

export function EmptyState({ title, message }: EmptyStateProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}
