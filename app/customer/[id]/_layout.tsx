import { Stack } from 'expo-router';

import { colors } from '@/constants/theme';

export default function CustomerLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.textPrimary,
        headerTitleStyle: { fontWeight: '600' },
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Client workspace' }} />
      <Stack.Screen name="details" options={{ title: 'Client details' }} />
      <Stack.Screen name="edit" options={{ title: 'Edit client', presentation: 'modal' }} />
    </Stack>
  );
}
