import React from 'react';
import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/context/AuthContext';
import { getTasks } from '@/services/apiService';
import { getRiderTaskCounts } from '@/utils/taskFilters';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { user } = useAuth();

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks', user?.id],
    queryFn: getTasks,
    enabled: !!user?.id,
    refetchInterval: 30000,
  });

  const counts = getRiderTaskCounts(tasks);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false, // SINGLE HEADER FIX: Hide the global tab header
        tabBarButton: HapticTab,
        tabBarStyle: Platform.select({
          ios: { position: 'absolute' },
          default: {},
        }),
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Today',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="house.fill" color={color} />,
          tabBarBadge: counts.today > 0 ? counts.today : undefined,
        }}
      />
      <Tabs.Screen
        name="overdue"
        options={{
          title: 'Overdue',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="exclamationmark.triangle.fill" color={color} />,
          tabBarBadge: counts.overdue > 0 ? counts.overdue : undefined,
          tabBarBadgeStyle: { backgroundColor: '#EF4444' }
        }}
      />
      <Tabs.Screen
        name="tomorrow"
        options={{
          title: 'Tomorrow',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="calendar" color={color} />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="clock.fill" color={color} />,
        }}
      />
    </Tabs>
  );
}
