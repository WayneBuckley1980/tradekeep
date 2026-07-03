import { Pressable, StyleSheet, Text } from 'react-native';

import { spacing, typography } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';
import { goHome } from '@/lib/navigation';

export function BackToHomeButton() {
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={goHome}
      hitSlop={8}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel="Back to home"
    >
      <Text style={[styles.label, { color: colors.textPrimary }]}>Home</Text>
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
  },
});
