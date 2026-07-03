import { Stack } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { goHome } from '@/components/BackToHomeButton';
import { colors, spacing, typography } from '@/constants/theme';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Not found' }} />
      <View style={styles.container}>
        <Text style={styles.title}>Screen not found</Text>
        <Pressable onPress={goHome} style={styles.link}>
          <Text style={styles.linkText}>Go home</Text>
        </Pressable>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    backgroundColor: colors.background,
  },
  title: {
    ...typography.heading,
    color: colors.textPrimary,
  },
  link: {
    marginTop: spacing.md,
  },
  linkText: {
    ...typography.body,
    color: colors.textSecondary,
  },
});
