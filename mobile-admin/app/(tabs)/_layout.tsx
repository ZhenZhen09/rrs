import React from 'react';
import { Tabs } from 'expo-router';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Platform } from 'react-native';

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  
  // Compute safe, screen-adaptive heights and bottom spacing
  const safeBottomPadding = insets.bottom > 0 ? insets.bottom : 8;
  const safeTabHeight = Platform.OS === 'ios' ? 60 + insets.bottom : 64 + insets.bottom;

  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarActiveTintColor: '#1E293B',
      tabBarInactiveTintColor: '#94A3B8',
      tabBarStyle: {
        backgroundColor: '#FFFFFF',
        borderTopWidth: 1,
        borderTopColor: '#E2E8F0',
        height: safeTabHeight,
        paddingBottom: safeBottomPadding,
        paddingTop: 8,
      },
      tabBarLabelStyle: {
        fontSize: 10,
        fontWeight: '700',
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
            <MaterialIcons name="settings-input-component" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: 'Calendar',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="calendar-today" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="analytics"
        options={{
          title: 'Analytics',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="bar-chart" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="logs"
        options={{
          title: 'Logs',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="list-alt" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
