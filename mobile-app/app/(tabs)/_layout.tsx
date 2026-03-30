import React, { useEffect, useState, useCallback } from 'react';
import { Tabs } from 'expo-router';
import { Platform, View, Text, StyleSheet } from 'react-native';
import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/utils/api';
import { getLocalDateStr } from '@/utils/dateUtils';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { user } = useAuth();
  const [counts, setCounts] = useState({ today: 0, overdue: 0 });

  const fetchCounts = useCallback(async () => {
    if (!user?.id) return;
    try {
      const response = await api.get('/api/requests');
      const allRequests: any[] = Array.isArray(response.data) ? response.data : response.data.data;
      
      const todayStr = getLocalDateStr(new Date());

      const today = allRequests.filter((req: any) => 
        req.assigned_rider_id === user.id && 
        getLocalDateStr(req.delivery_date) === todayStr &&
        !['completed', 'failed', 'cancelled'].includes(req.delivery_status)
      ).length;

      const overdue = allRequests.filter((req: any) => 
        req.assigned_rider_id === user.id && 
        getLocalDateStr(req.delivery_date) < todayStr &&
        !['completed', 'failed', 'cancelled'].includes(req.delivery_status)
      ).length;

      setCounts({ today, overdue });
    } catch (err) {
      console.error('Fetch counts error:', err);
    }
  }, [user]);

  useEffect(() => {
    fetchCounts();
    const interval = setInterval(fetchCounts, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, [fetchCounts]);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: Platform.select({
          ios: {
            // Use a transparent background on iOS to show the blur effect
            position: 'absolute',
          },
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
