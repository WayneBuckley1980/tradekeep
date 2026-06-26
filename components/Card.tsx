import { StyleSheet, View, ViewStyle } from 'react-native';

import { cardStyle, spacing } from '@/constants/theme';

type CardProps = {
  children: React.ReactNode;
  style?: ViewStyle;
};

export function Card({ children, style }: CardProps) {
  return <View style={[styles.card, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    ...cardStyle,
    padding: spacing.md,
  },
});
