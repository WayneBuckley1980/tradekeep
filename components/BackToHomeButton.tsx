import { Pressable, StyleSheet, Text } from 'react-native';

import { colors, spacing, typography } from '@/constants/theme';
import { goHome } from '@/lib/navigation';

export function BackToHomeButton() {
  return (
    <Pressable
      onPress={goHome}
      hitSlop={8}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel="Back to home"
    >
      <Text style={styles.label}>Home</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    marginRight: spacing.sm,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
  },
  pressed: {
    opacity: 0.6,
  },
  label: {
    ...typography.label,
    fontWeight: '600',
    color: colors.textPrimary,
  },
});
