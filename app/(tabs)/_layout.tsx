import { View } from 'react-native';
import { Tabs } from 'expo-router';

import { GlobalFab } from '@/components/GlobalFab';
import { colors } from '@/constants/theme';

export default function TabLayout() {
  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.textPrimary,
          tabBarStyle: {
            backgroundColor: colors.background,
            borderTopColor: colors.borderSubtle,
          },
          tabBarActiveTintColor: colors.textPrimary,
          tabBarInactiveTintColor: colors.textMuted,
        }}
      >
        <Tabs.Screen name="home" options={{ title: 'Home', headerTitle: 'TradeKeep' }} />
        <Tabs.Screen name="clients" options={{ title: 'Clients' }} />
        <Tabs.Screen name="jobs" options={{ title: 'Jobs' }} />
        <Tabs.Screen name="money" options={{ title: 'Money' }} />
        <Tabs.Screen name="more" options={{ title: 'More' }} />
      </Tabs>
      <GlobalFab />
    </View>
  );
}
