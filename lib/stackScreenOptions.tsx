import { BackToHomeButton } from '@/components/BackToHomeButton';
import { colors, type ThemeColors } from '@/constants/theme';

export const stackScreenOptions = {
  headerStyle: { backgroundColor: colors.background },
  headerTintColor: colors.textPrimary,
  headerTitleStyle: { fontWeight: '600' as const },
  contentStyle: { backgroundColor: colors.background },
  headerRight: () => <BackToHomeButton />,
};

export function themedStackScreenOptions(themeColors: ThemeColors) {
  return {
    headerStyle: { backgroundColor: themeColors.background },
    headerTintColor: themeColors.textPrimary,
    headerTitleStyle: { fontWeight: '600' as const },
    contentStyle: { backgroundColor: themeColors.background },
    headerRight: () => <BackToHomeButton />,
  };
}
