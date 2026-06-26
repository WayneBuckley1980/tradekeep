import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Platform } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import type { Session, User } from '@supabase/supabase-js';

import { ensureProfile, updateSubscriptionTier } from '@/lib/customers';
import {
  hasProEntitlement,
  initPurchases,
  loginPurchases,
  logoutPurchases,
  subscribeToCustomerInfo,
} from '@/lib/purchases';
import { resyncAllFollowUpNotifications } from '@/lib/notifications';
import { fetchCustomers, updateNotificationIds } from '@/lib/customers';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import type { Profile } from '@/types/database';

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  isPro: boolean;
  signInWithApple: () => Promise<void>;
  signInWithEmail: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const syncReminders = useCallback(async (userId: string) => {
    try {
      const customers = await fetchCustomers(userId);
      await resyncAllFollowUpNotifications(customers, async (customerId, notification_ids) => {
        await updateNotificationIds(userId, customerId, notification_ids);
      });
    } catch (error) {
      console.warn('Failed to resync reminders', error);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!session?.user?.id) return;
    const nextProfile = await ensureProfile(session.user.id);
    setProfile(nextProfile);

    const entitled = await hasProEntitlement();
    if (entitled && nextProfile.subscription_tier !== 'pro') {
      await updateSubscriptionTier(session.user.id, 'pro', null);
      setProfile({ ...nextProfile, subscription_tier: 'pro' });
    }
  }, [session?.user?.id]);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session?.user?.id) {
      setProfile(null);
      return;
    }

    let active = true;

    (async () => {
      try {
        await loginPurchases(session.user.id);
        const nextProfile = await ensureProfile(session.user.id);
        if (!active) return;
        setProfile(nextProfile);
        await syncReminders(session.user.id);
      } catch (error) {
        console.warn('Auth bootstrap failed', error);
      }
    })();

    const unsubscribe = subscribeToCustomerInfo(() => {
      refreshProfile();
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [session?.user?.id, refreshProfile, syncReminders]);

  const signInWithApple = useCallback(async () => {
    if (Platform.OS !== 'ios') {
      throw new Error('Sign in with Apple is only available on iOS');
    }

    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });

    if (!credential.identityToken) {
      throw new Error('Apple Sign In failed — no identity token');
    }

    const { error } = await supabase.auth.signInWithIdToken({
      provider: 'apple',
      token: credential.identityToken,
    });

    if (error) throw error;
  }, []);

  const signInWithEmail = useCallback(async (email: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: 'tradekeep://auth/callback',
      },
    });

    if (error) throw error;
  }, []);

  const signOut = useCallback(async () => {
    await logoutPurchases();
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      loading,
      isPro: profile?.subscription_tier === 'pro',
      signInWithApple,
      signInWithEmail,
      signOut,
      refreshProfile,
    }),
    [session, profile, loading, signInWithApple, signInWithEmail, signOut, refreshProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

export { isSupabaseConfigured };
