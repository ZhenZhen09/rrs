import React from 'react';
import { Tabs } from 'expo-router';
import { Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { FloatingTabBar } from '@/components/navigation/FloatingTabBar';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/context/AuthContext';
import { useLocation } from '@/context/LocationContext';
import { AttendanceLockout } from '@/components/AttendanceLockout';
import { useDashboard } from '@/hooks/data/useDashboard';
import { getTasks } from '@/services/apiService';
import { getRiderTaskCounts } from '@/utils/taskFilters';
import { useMessagingUnread } from '@/hooks/useMessagingUnread';
import { TodayRoadBackdrop } from '@/components/navigation/TodayRoadBackdrop';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { attendanceStatus } = useLocation();
  const { handleLogout } = useDashboard();
  const unreadMessages = useMessagingUnread();

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks', user?.id],
    queryFn: getTasks,
    enabled: !!user?.id,
    refetchInterval: 30000,
  });

  const counts = getRiderTaskCounts(tasks);

  if (attendanceStatus === 'absent' || attendanceStatus === 'on_leave') {
    return (
      <AttendanceLockout
        status={attendanceStatus as any}
        onLogout={handleLogout}
      />
    );
  }

  return (
    <View style={styles.tabLayout}>
      <TodayRoadBackdrop />
      <Tabs
        initialRouteName="index"
        tabBar={props => (
          <FloatingTabBar
            {...props}
            badgeCounts={{
              overdue: counts.overdue,
              tomorrow: counts.upcoming,
              index: counts.today,
              inbox: unreadMessages,
            }}
          />
        )}
        screenOptions={{
          tabBarActiveTintColor: Colors[colorScheme === 'dark' ? 'dark' : 'light'].tint,
          headerShown: false,
          sceneStyle: { backgroundColor: 'transparent' },
          tabBarStyle: Platform.select({
            ios: {
              height: 100 + insets.bottom,
              backgroundColor: 'transparent',
              borderTopWidth: 0,
            },
            default: {
              height: 100 + insets.bottom,
              backgroundColor: 'transparent',
              borderTopWidth: 0,
              elevation: 0,
            },
          }),
        }}
      >
        <Tabs.Screen name="overdue" options={{
          title: 'Overdue',
          tabBarIcon: ({ color }) => <Ionicons name="alert-circle-outline" size={23} color={color} />,
        }} />
        <Tabs.Screen name="tomorrow" options={{
          title: 'Upcoming',
          tabBarIcon: ({ color }) => <Ionicons name="calendar-outline" size={23} color={color} />,
        }} />
        <Tabs.Screen name="index" options={{
          title: 'Today',
          tabBarIcon: () => <MaterialCommunityIcons name="calendar-check" size={27} color="#FFFFFF" />,
        }} />
        <Tabs.Screen name="inbox" options={{
          title: 'Inbox',
          tabBarIcon: ({ color }) => <Ionicons name="mail-outline" size={23} color={color} />,
        }} />
        <Tabs.Screen name="history" options={{
          title: 'History',
          tabBarIcon: ({ color }) => <Ionicons name="time-outline" size={23} color={color} />,
        }} />
      </Tabs>
    </View>
  );
}

const styles = StyleSheet.create({
  tabLayout: { flex: 1, backgroundColor: '#FFFFFF' },
});
