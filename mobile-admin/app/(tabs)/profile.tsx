import React from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const { theme, mode, setMode } = useTheme();

  const handleLogout = () => {
    Alert.alert(
      "Log Out",
      "Are you sure you want to log out of the Admin portal?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Log Out", 
          style: "destructive",
          onPress: () => logout()
        }
      ]
    );
  };

  const UI_COLORS = {
    background: theme.COLORS.background,
    surface: theme.COLORS.surface,
    text: theme.COLORS.foreground,
    textSecondary: theme.COLORS.muted === '#18181B' ? '#A1A1AA' : '#71717A',
    border: theme.COLORS.border,
    primary: theme.COLORS.primary,
    danger: theme.COLORS.danger,
  };

  const THEMES = [
    { id: 'black-pink', label: 'Black-Pink', icon: 'favorite' },
    { id: 'light', label: 'Light Mode', icon: 'light-mode' },
    { id: 'dark', label: 'Dark Mode', icon: 'dark-mode' },
    { id: 'gold', label: 'Gold Mode', icon: 'star' },
  ];

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: UI_COLORS.background }} edges={['top']}>
      <View className="border-b px-6 pt-5 pb-4" style={{ backgroundColor: UI_COLORS.surface, borderBottomColor: UI_COLORS.border }}>
        <Text className="text-[28px] font-extrabold tracking-[-0.5px]" style={{ color: UI_COLORS.text }}>Profile</Text>
      </View>
      <View className="p-6">
        <View className="mb-6 items-center rounded-3xl border p-6 shadow-sm" style={{ backgroundColor: UI_COLORS.surface, borderColor: UI_COLORS.border, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 12, elevation: 3 }}>
          <View className="mb-4 h-20 w-20 items-center justify-center rounded-full" style={{ backgroundColor: UI_COLORS.primary + '20' }}>
            <MaterialIcons name="person" size={40} color={UI_COLORS.primary} />
          </View>
          <Text className="mb-1 text-xl font-extrabold" style={{ color: UI_COLORS.text }}>{user?.name || 'Administrator'}</Text>
          <Text className="text-sm font-medium" style={{ color: UI_COLORS.textSecondary }}>{user?.email || 'admin@example.com'}</Text>
          <View className="mt-3 rounded-2xl px-3 py-1.5" style={{ backgroundColor: UI_COLORS.primary }}>
            <Text className="text-xs font-bold uppercase text-white">{user?.role || 'Admin'}</Text>
          </View>
        </View>

        <Text className="mb-4 ml-1 text-base font-extrabold tracking-[-0.3px]" style={{ color: UI_COLORS.text }}>App Theme</Text>
        <View className="mb-8 flex-row flex-wrap gap-3">
          {THEMES.map((t) => (
            <TouchableOpacity 
              key={t.id}
              activeOpacity={0.7}
              className="w-[48%] items-center rounded-2xl border-2 p-4" style={{ backgroundColor: mode === t.id ? UI_COLORS.primary + '10' : UI_COLORS.surface, borderColor: mode === t.id ? UI_COLORS.primary : UI_COLORS.border }}
              onPress={() => setMode(t.id as any)}
            >
              <MaterialIcons 
                name={t.icon as any} 
                size={24} 
                color={mode === t.id ? UI_COLORS.primary : UI_COLORS.textSecondary} 
              />
              <Text className="mt-2 text-sm font-bold" style={{ color: mode === t.id ? UI_COLORS.primary : UI_COLORS.textSecondary }}>
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity 
          className="flex-row items-center justify-center rounded-2xl border p-4" style={{ backgroundColor: UI_COLORS.surface, borderColor: UI_COLORS.danger + '40' }}
          activeOpacity={0.7}
          onPress={handleLogout}
        >
          <MaterialIcons name="logout" size={24} color={UI_COLORS.danger} />
          <Text className="ml-2 text-base font-bold" style={{ color: UI_COLORS.danger }}>Log Out</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
