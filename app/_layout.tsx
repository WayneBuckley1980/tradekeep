import { Stack, useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AuthProvider } from '@/contexts/AuthContext';
import { stackScreenOptions } from '@/lib/stackScreenOptions';

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
    <GestureHandlerRootView style={{ flex: 1 }}>
    <AuthProvider>
      <StatusBar style="light" />
      <Stack screenOptions={stackScreenOptions}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="auth" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="search" options={{ title: 'Search', presentation: 'modal' }} />
        <Stack.Screen name="customer/new" options={{ title: 'Add client', presentation: 'modal' }} />
        <Stack.Screen name="customer/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="job/new" options={{ title: 'New job', presentation: 'modal' }} />
        <Stack.Screen name="job/[id]" options={{ title: 'Job' }} />
        <Stack.Screen name="quote/new" options={{ title: 'New quote', presentation: 'modal' }} />
        <Stack.Screen name="quote/[id]" options={{ title: 'Quote' }} />
        <Stack.Screen name="invoice/new" options={{ title: 'New invoice', presentation: 'modal' }} />
        <Stack.Screen name="invoice/[id]" options={{ title: 'Invoice' }} />
        <Stack.Screen name="lead/new" options={{ title: 'New lead', presentation: 'modal' }} />
        <Stack.Screen name="lead/[id]" options={{ title: 'Lead' }} />
        <Stack.Screen name="export" options={{ title: 'Export data' }} />
        <Stack.Screen name="archived-jobs" options={{ title: 'Archived jobs' }} />
        <Stack.Screen name="paywall" options={{ title: 'Upgrade', presentation: 'modal' }} />
      </Stack>
    </AuthProvider>
    </GestureHandlerRootView>
  );
}
