import { StyleSheet, Text } from 'react-native';

import { colors, typography } from '@/constants/theme';

export function BrandTitle() {
  return <Text style={styles.brand}>TradeKeepCRM</Text>;
}

const styles = StyleSheet.create({
  brand: {
    ...typography.title,
    fontSize: 34,
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
});
