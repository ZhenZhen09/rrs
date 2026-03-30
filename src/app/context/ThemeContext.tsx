import React, { createContext, useContext, useEffect, useState } from 'react';

type ThemeName = 'default' | 'amber' | 'pink' | 'ocean' | 'forest';

interface ThemeConfig {
  '--primary': string;
  '--primary-foreground': string;
  '--sidebar': string;
  '--sidebar-foreground': string;
  '--sidebar-primary': string;
  '--sidebar-primary-foreground': string;
  '--sidebar-accent': string;
  '--sidebar-accent-foreground': string;
  '--sidebar-border': string;
  '--sidebar-ring': string;
  '--background': string;
  '--foreground': string;
  '--card': string;
  '--card-foreground': string;
  '--accent': string;
  '--accent-foreground': string;
}

const themes: Record<ThemeName, ThemeConfig> = {
  default: {
    '--primary': '#030213',
    '--primary-foreground': '0 0% 100%',
    '--sidebar': 'oklch(0.985 0 0)',
    '--sidebar-foreground': 'oklch(0.145 0 0)',
    '--sidebar-primary': '#030213',
    '--sidebar-primary-foreground': 'oklch(0.985 0 0)',
    '--sidebar-accent': 'oklch(0.97 0 0)',
    '--sidebar-accent-foreground': 'oklch(0.205 0 0)',
    '--sidebar-border': 'oklch(0.922 0 0)',
    '--sidebar-ring': 'oklch(0.708 0 0)',
    '--background': '#ffffff',
    '--foreground': 'oklch(0.145 0 0)',
    '--card': '#ffffff',
    '--card-foreground': 'oklch(0.145 0 0)',
    '--accent': '#e9ebef',
    '--accent-foreground': '#030213',
  },
  amber: {
    '--primary': '#ca8a04',
    '--primary-foreground': '0 0% 100%',
    '--sidebar': '#1e293b',
    '--sidebar-foreground': '#f8fafc',
    '--sidebar-primary': '#ca8a04',
    '--sidebar-primary-foreground': '#ffffff',
    '--sidebar-accent': '#334155',
    '--sidebar-accent-foreground': '#ffffff',
    '--sidebar-border': '#334155',
    '--sidebar-ring': '#ca8a04',
    '--background': '#fdfcfb',
    '--foreground': '#1e293b',
    '--card': '#ffffff',
    '--card-foreground': '#1e293b',
    '--accent': '#fef3c7',
    '--accent-foreground': '#92400e',
  },
  pink: {
    '--primary': '#db2777',
    '--primary-foreground': '0 0% 100%',
    '--sidebar': '#fdf2f8',
    '--sidebar-foreground': '#831843',
    '--sidebar-primary': '#db2777',
    '--sidebar-primary-foreground': '#ffffff',
    '--sidebar-accent': '#fce7f3',
    '--sidebar-accent-foreground': '#db2777',
    '--sidebar-border': '#fbcfe8',
    '--sidebar-ring': '#db2777',
    '--background': '#ffffff',
    '--foreground': '#831843',
    '--card': '#ffffff',
    '--card-foreground': '#831843',
    '--accent': '#fdf2f8',
    '--accent-foreground': '#db2777',
  },
  ocean: {
    '--primary': '#0284c7',
    '--primary-foreground': '0 0% 100%',
    '--sidebar': '#0c4a6e',
    '--sidebar-foreground': '#f0f9ff',
    '--sidebar-primary': '#0284c7',
    '--sidebar-primary-foreground': '#ffffff',
    '--sidebar-accent': '#075985',
    '--sidebar-accent-foreground': '#ffffff',
    '--sidebar-border': '#075985',
    '--sidebar-ring': '#0284c7',
    '--background': '#f8fafc',
    '--foreground': '#0c4a6e',
    '--card': '#ffffff',
    '--card-foreground': '#0c4a6e',
    '--accent': '#e0f2fe',
    '--accent-foreground': '#0369a1',
  },
  forest: {
    '--primary': '#059669',
    '--primary-foreground': '0 0% 100%',
    '--sidebar': '#064e3b',
    '--sidebar-foreground': '#ecfdf5',
    '--sidebar-primary': '#059669',
    '--sidebar-primary-foreground': '#ffffff',
    '--sidebar-accent': '#065f46',
    '--sidebar-accent-foreground': '#ffffff',
    '--sidebar-border': '#065f46',
    '--sidebar-ring': '#059669',
    '--background': '#f9fafb',
    '--foreground': '#064e3b',
    '--card': '#ffffff',
    '--card-foreground': '#064e3b',
    '--accent': '#d1fae5',
    '--accent-foreground': '#047857',
  },
};

interface ThemeContextType {
  currentTheme: ThemeName;
  setTheme: (name: ThemeName) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [currentTheme, setCurrentThemeState] = useState<ThemeName>(() => {
    return (localStorage.getItem('rss-theme') as ThemeName) || 'default';
  });

  const applyTheme = (themeName: ThemeName) => {
    const root = document.documentElement;
    const themeConfig = themes[themeName];
    
    Object.entries(themeConfig).forEach(([property, value]) => {
      root.style.setProperty(property, value);
    });
  };

  useEffect(() => {
    applyTheme(currentTheme);
  }, [currentTheme]);

  const setTheme = (name: ThemeName) => {
    setCurrentThemeState(name);
    localStorage.setItem('rss-theme', name);
  };

  return (
    <ThemeContext.Provider value={{ currentTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
