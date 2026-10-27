import { Redirect } from 'expo-router';
import React from 'react';
import { ActivityIndicator, Image, Text, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function Index() {
  const { isAuthenticated, isLoading } = useAuth();
  const { theme } = useTheme();

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center" style={{ backgroundColor: theme.COLORS.surface }}>
        <View className="h-28 w-28 items-center justify-center rounded-3xl" style={{ backgroundColor: theme.COLORS.background, shadowColor: theme.COLORS.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.14, shadowRadius: 16, elevation: 5 }}>
          <Image
            source={require('../assets/images/icon.png')}
            className="h-20 w-20"
            resizeMode="contain"
            accessibilityLabel="Rider Scheduling System logo"
          />
        </View>
        <Text className="mt-5 text-base font-bold" style={{ color: theme.COLORS.primary, fontFamily: theme.TYPOGRAPHY.fontFamily.bold }}>Rider Scheduling System</Text>
        <Text className="mt-1 text-xs" style={{ color: theme.COLORS.secondary, fontFamily: theme.TYPOGRAPHY.fontFamily.medium }}>Loading your workspace...</Text>
        <ActivityIndicator className="mt-5" size="small" color={theme.COLORS.accent} />
      </View>
    );
  }

  return <Redirect href={isAuthenticated ? '/(tabs)' : '/login'} />;
}
