import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import { router } from 'expo-router';

import { useAuth, isSupabaseConfigured } from '@/contexts/AuthContext';
import { colors, inputStyle, spacing, typography } from '@/constants/theme';

export default function SignInScreen() {
  const { signInWithApple, signInWithEmail } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleApple = async () => {
    setLoading(true);
    try {
      await signInWithApple();
      router.replace('/(tabs)/home');
    } catch (error) {
      if ((error as { code?: string }).code === 'ERR_REQUEST_CANCELED') return;
      Alert.alert('Sign in failed', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleEmail = async () => {
    if (!email.trim()) {
      Alert.alert('Email required', 'Enter your email to receive a magic link.');
      return;
    }

    setLoading(true);
    try {
      await signInWithEmail(email);
      Alert.alert('Check your email', 'We sent you a magic link to sign in.');
    } catch (error) {
      Alert.alert('Sign in failed', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.content}>
        <Text style={styles.brand}>TradeKeepCRM</Text>
        <Text style={styles.tagline}>Keep what your clients like. Know when to chase them.</Text>

        {!isSupabaseConfigured ? (
          <Text style={styles.warning}>
            Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to enable sign-in.
          </Text>
        ) : null}

        {Platform.OS === 'ios' ? (
          <AppleAuthentication.AppleAuthenticationButton
            buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
            buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
            cornerRadius={12}
            style={styles.appleButton}
            onPress={handleApple}
          />
        ) : null}

        <Text style={styles.or}>or continue with email</Text>

        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
        />

        <Pressable style={styles.cta} onPress={handleEmail} disabled={loading}>
          <Text style={styles.ctaText}>{loading ? 'Sending…' : 'Send magic link'}</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  brand: {
    ...typography.title,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  tagline: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
  },
  warning: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  appleButton: {
    width: '100%',
    height: 48,
  },
  or: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    marginVertical: spacing.md,
  },
  input: {
    ...inputStyle,
    marginBottom: spacing.md,
  },
  cta: {
    backgroundColor: colors.ctaBackground,
    borderRadius: 12,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  ctaText: {
    ...typography.label,
    color: colors.ctaText,
    fontWeight: '700',
  },
});
