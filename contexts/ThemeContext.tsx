import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useColorScheme as useSystemColorScheme } from 'react-native';

import {
  darkColors,
  getCardStyle,
  getInputStyle,
  lightColors,
  type ThemeColors,
} from '@/constants/theme';

export type ThemePreference = 'system' | 'light' | 'dark';
export type ColorScheme = 'light' | 'dark';

const STORAGE_KEY = '@tradekeep/theme-preference';

type ThemeContextValue = {
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => Promise<void>;
  colorScheme: ColorScheme;
  colors: ThemeColors;
  cardStyle: ReturnType<typeof getCardStyle>;
  inputStyle: ReturnType<typeof getInputStyle>;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useSystemColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>('system');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (stored === 'light' || stored === 'dark' || stored === 'system') {
          setPreferenceState(stored);
        }
      })
      .catch(console.warn);
  }, []);

  const setPreference = useCallback(async (next: ThemePreference) => {
    setPreferenceState(next);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, next);
    } catch (error) {
      console.warn('Failed to save theme preference', error);
    }
  }, []);

  const colorScheme: ColorScheme =
    preference === 'system' ? (systemScheme === 'light' ? 'light' : 'dark') : preference;

  const colors = colorScheme === 'light' ? lightColors : darkColors;

  const value = useMemo(
    () => ({
      preference,
      setPreference,
      colorScheme,
      colors,
      cardStyle: getCardStyle(colors),
      inputStyle: getInputStyle(colors),
    }),
    [preference, setPreference, colorScheme, colors],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}
