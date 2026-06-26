import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { createSessionFromUrl } from '@/lib/auth-callback';
import { colors, spacing, typography } from '@/constants/theme';

export default function AuthCallbackScreen() {
  const url = Linking.useURL();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function handleCallback(incomingUrl: string) {
      try {
        await createSessionFromUrl(incomingUrl);
        if (!active) return;
        router.replace('/(tabs)/home');
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Could not complete sign-in.');
      }
    }

    if (url) {
      handleCallback(url);
      return () => {
        active = false;
      };
    }

    Linking.getInitialURL().then((initialUrl) => {
      if (initialUrl && active) {
        handleCallback(initialUrl);
      }
    });

    return () => {
      active = false;
    };
  }, [url]);

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Sign-in link failed</Text>
        <Text style={styles.message}>{error}</Text>
        <Text style={styles.link} onPress={() => router.replace('/(auth)/sign-in')}>
          Back to sign in
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ActivityIndicator color={colors.textPrimary} />
      <Text style={styles.message}>Signing you in…</Text>
    </View>
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
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  message: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  link: {
    ...typography.body,
    color: colors.textPrimary,
    marginTop: spacing.lg,
    textDecorationLine: 'underline',
  },
});
