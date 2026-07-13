import React from 'react';
import { Tabs } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Platform } from 'react-native';
import { COLORS, TYPOGRAPHY } from '../../constants/Theme';

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  
  // Compute safe, screen-adaptive heights and bottom spacing
  const safeBottomPadding = insets.bottom > 0 ? insets.bottom : 8;
  const safeTabHeight = Platform.OS === 'ios' ? 60 + insets.bottom : 64 + insets.bottom;

  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarActiveTintColor: COLORS.primary,
      tabBarInactiveTintColor: COLORS.muted,
      tabBarStyle: {
        backgroundColor: COLORS.surface,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        height: safeTabHeight,
        paddingBottom: safeBottomPadding,
        paddingTop: 8,
      },
      tabBarLabelStyle: {
        fontSize: 10,
        fontFamily: TYPOGRAPHY.fontFamily.bold,
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
      <Tabs.Screen name="analytics" options={{ href: null }} />
      <Tabs.Screen name="logs" options={{ href: null }} />
      <Tabs.Screen name="calendar" options={{ href: null }} />
    </Tabs>
  );
}
