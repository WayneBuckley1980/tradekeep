import { useMemo } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';

import { spacing } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';

type CardProps = {
  children: React.ReactNode;
  style?: ViewStyle;
};

export function Card({ children, style }: CardProps) {
  const { cardStyle } = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        card: {
          ...cardStyle,
          padding: spacing.md,
        },
      }),
    [cardStyle],
  );

  return <View style={[styles.card, style]}>{children}</View>;
}
