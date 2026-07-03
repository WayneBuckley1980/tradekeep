import { Stack } from 'expo-router';

import { stackScreenOptions } from '@/lib/stackScreenOptions';

export default function CustomerLayout() {
  return (
    <Stack screenOptions={stackScreenOptions}>
      <Stack.Screen name="index" options={{ title: 'Client workspace' }} />
      <Stack.Screen name="details" options={{ title: 'Client details' }} />
      <Stack.Screen name="edit" options={{ title: 'Edit client', presentation: 'modal' }} />
    </Stack>
  );
}
