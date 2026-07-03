import { BackToHomeButton } from '@/components/BackToHomeButton';
import { colors } from '@/constants/theme';

export const stackScreenOptions = {
  headerStyle: { backgroundColor: colors.background },
  headerTintColor: colors.textPrimary,
  headerTitleStyle: { fontWeight: '600' as const },
  contentStyle: { backgroundColor: colors.background },
  headerRight: () => <BackToHomeButton />,
};
