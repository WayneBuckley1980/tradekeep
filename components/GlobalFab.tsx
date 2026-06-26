import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

import { colors, spacing, typography } from '@/constants/theme';
import { FREE_TIER_LIMIT } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { countCustomers } from '@/lib/customers';

type GlobalFabProps = {
  bottom?: number;
};

export function GlobalFab({ bottom = 90 }: GlobalFabProps) {
  const { user, isPro } = useAuth();

  const showMenu = () => {
    Alert.alert('Quick add', 'What would you like to create?', [
      {
        text: 'New client',
        onPress: async () => {
          if (!user?.id) return;
          if (!isPro) {
            const count = await countCustomers(user.id);
            if (count >= FREE_TIER_LIMIT) {
              router.push({ pathname: '/paywall', params: { reason: 'Free plan includes 10 clients.' } });
              return;
            }
          }
          router.push('/customer/new');
        },
      },
      { text: 'New job', onPress: () => router.push('/job/new') },
      { text: 'New quote', onPress: () => router.push('/quote/new') },
      { text: 'New invoice', onPress: () => router.push('/invoice/new') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  return (
    <Pressable style={[styles.fab, { bottom }]} onPress={showMenu}>
      <Text style={styles.fabText}>+</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: spacing.md,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.ctaBackground,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 6,
  },
  fabText: {
    fontSize: 28,
    fontWeight: '300',
    color: colors.ctaText,
    marginTop: -2,
  },
});
