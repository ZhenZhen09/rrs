import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme } from 'react-native';
import { LIGHT_COLORS, DARK_COLORS, RADIUS, TYPOGRAPHY, SPACING } from '../constants/Theme';

type ThemeMode = 'light' | 'dark' | 'system';
type Density = 'compact' | 'default' | 'relaxed';

interface ThemeContextType {
  mode: ThemeMode;
  isDark: boolean;
  density: Density;
  theme: {
    COLORS: typeof LIGHT_COLORS;
    RADIUS: typeof RADIUS;
    TYPOGRAPHY: typeof TYPOGRAPHY;
    SPACING: typeof SPACING.default;
  };
  setMode: (mode: ThemeMode) => void;
  setDensity: (density: Density) => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('system');
  const [density, setDensityState] = useState<Density>('default');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const savedMode = await AsyncStorage.getItem('@theme_mode');
        const savedDensity = await AsyncStorage.getItem('@theme_density');
        if (savedMode) setModeState(savedMode as ThemeMode);
        if (savedDensity) setDensityState(savedDensity as Density);
      } catch (e) { }
      setMounted(true);
    };
    loadPreferences();
  }, []);

  const setMode = async (newMode: ThemeMode) => {
    setModeState(newMode);
    await AsyncStorage.setItem('@theme_mode', newMode);
  };

  const setDensity = async (newDensity: Density) => {
    setDensityState(newDensity);
    await AsyncStorage.setItem('@theme_density', newDensity);
  };

  const isDark = mode === 'system' ? systemColorScheme === 'dark' : mode === 'dark';

  const theme = useMemo(() => ({
    COLORS: isDark ? DARK_COLORS : LIGHT_COLORS,
    RADIUS,
    TYPOGRAPHY,
    SPACING: SPACING[density],
  }), [isDark, density]);

  if (!mounted) return null;

  return (
    <ThemeContext.Provider value={{ mode, isDark, density, theme, setMode, setDensity }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
};
