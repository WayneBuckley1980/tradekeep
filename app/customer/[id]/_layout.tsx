import { Stack } from 'expo-router';

import { useTheme } from '@/contexts/ThemeContext';
import { themedStackScreenOptions } from '@/lib/stackScreenOptions';

export default function CustomerLayout() {
  const { colors } = useTheme();

  return (
    <Stack screenOptions={themedStackScreenOptions(colors)}>
      <Stack.Screen name="index" options={{ title: 'Client workspace' }} />
      <Stack.Screen name="details" options={{ title: 'Client details' }} />
      <Stack.Screen name="edit" options={{ title: 'Edit client', presentation: 'modal' }} />
    </Stack>
  );
}
