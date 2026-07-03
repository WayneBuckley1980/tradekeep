import { useMemo } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { spacing } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';

type SearchBarProps = {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
};

export function SearchBar({
  value,
  onChangeText,
  placeholder = 'Search clients',
}: SearchBarProps) {
  const { colors, inputStyle } = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        wrapper: {
          paddingHorizontal: spacing.md,
          paddingBottom: spacing.sm,
        },
        input: {
          ...inputStyle,
        },
      }),
    [inputStyle],
  );

  return (
    <View style={styles.wrapper}>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        autoCapitalize="none"
        autoCorrect={false}
        clearButtonMode="while-editing"
      />
    </View>
  );
}
