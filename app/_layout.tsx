import { Stack, useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { AuthProvider } from '@/contexts/AuthContext';
import { colors } from '@/constants/theme';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const router = useRouter();

  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const customerId = response.notification.request.content.data?.customerId;
      if (typeof customerId === 'string') {
        router.push(`/customer/${customerId}`);
      }
    });

    return () => subscription.remove();
  }, [router]);

  return (
    <AuthProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.textPrimary,
          headerTitleStyle: { fontWeight: '600' },
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="auth" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="search" options={{ title: 'Search', presentation: 'modal' }} />
        <Stack.Screen name="customer/new" options={{ title: 'Add client', presentation: 'modal' }} />
        <Stack.Screen name="customer/[id]" options={{ title: 'Client' }} />
        <Stack.Screen name="customer/[id]/edit" options={{ title: 'Edit client', presentation: 'modal' }} />
        <Stack.Screen name="job/new" options={{ title: 'New job', presentation: 'modal' }} />
        <Stack.Screen name="job/[id]" options={{ title: 'Job' }} />
        <Stack.Screen name="quote/new" options={{ title: 'New quote', presentation: 'modal' }} />
        <Stack.Screen name="quote/[id]" options={{ title: 'Quote' }} />
        <Stack.Screen name="invoice/new" options={{ title: 'New invoice', presentation: 'modal' }} />
        <Stack.Screen name="invoice/[id]" options={{ title: 'Invoice' }} />
        <Stack.Screen name="paywall" options={{ title: 'Upgrade', presentation: 'modal' }} />
      </Stack>
    </AuthProvider>
  );
}
