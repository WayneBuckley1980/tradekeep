import { useMemo } from 'react';
import { StyleSheet, Text } from 'react-native';

import { typography } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';

export function BrandTitle() {
  const { colors } = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        brand: {
          ...typography.title,
          fontSize: 34,
          color: colors.textPrimary,
          letterSpacing: -0.5,
        },
      }),
    [colors],
  );

  return <Text style={styles.brand}>TradeKeepCRM</Text>;
}
