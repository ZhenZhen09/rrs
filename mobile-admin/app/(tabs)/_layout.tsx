import React from 'react';
import { Tabs, Redirect } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Platform } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { isAuthenticated, isLoading } = useAuth();

  if (!isLoading && !isAuthenticated) {
    return <Redirect href="/login" />;
  }
  
  // Compute safe, screen-adaptive heights and bottom spacing
  const safeBottomPadding = insets.bottom > 0 ? insets.bottom : 8;
  const safeTabHeight = Platform.OS === 'ios' ? 60 + insets.bottom : 64 + insets.bottom;

  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarActiveTintColor: theme.COLORS.primary,
      tabBarInactiveTintColor: theme.COLORS.textSecondary,
      tabBarItemStyle: {
        minHeight: 48,
      },
      tabBarStyle: {
        backgroundColor: theme.COLORS.surface,
        borderTopWidth: 1,
        borderTopColor: theme.COLORS.border,
        height: safeTabHeight,
        paddingBottom: safeBottomPadding,
        paddingTop: 8,
      },
      tabBarLabelStyle: {
        fontSize: 11,
        fontFamily: theme.TYPOGRAPHY.fontFamily.bold,
      }
    }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="dashboard" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="dispatch"
        options={{
          title: 'Dispatch',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="local-shipping" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: 'Map',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="map" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="personnel"
        options={{
          title: 'Personnel',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="people" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="attendance"
        options={{
          title: 'Attendance',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="access-time" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="person" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen name="analytics" options={{ href: null }} />
      <Tabs.Screen name="logs" options={{ href: null }} />
      <Tabs.Screen name="calendar" options={{ href: null }} />
    </Tabs>
  );
}
