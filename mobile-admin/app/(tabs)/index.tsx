import { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, useWindowDimensions, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { PieChart, LineChart } from 'react-native-chart-kit';
import { useRealTimeStore } from '../../store/useRealTimeStore';
import { useTheme } from '../../context/ThemeContext';
import api from '../../services/api';
import { useDebounce } from '../../utils/useDebounce';

type MetricCardProps = {
  label: string;
  value: number;
  icon: any;
  color: string;
  backgroundColor: string;
  borderColor: string;
  textColor: string;
  secondaryColor: string;
  width: number;
};

type RecentActivity = {
  id: string;
  title: string;
  detail: string;
  color: string;
};

function MetricCard({ label, value, icon, color, backgroundColor, borderColor, textColor, secondaryColor, width }: MetricCardProps) {
  return (
    <View
      className="rounded-3xl border p-5"
      style={{
        backgroundColor,
        width,
        borderColor,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.04,
        shadowRadius: 12,
        elevation: 3,
      }}
    >
      <View className="mb-4 h-11 w-11 items-center justify-center rounded-full" style={{ backgroundColor: `${color}15` }}>
        <MaterialIcons name={icon} size={24} color={color} />
      </View>
      <Text className="mb-1 text-[32px] font-extrabold tracking-[-1px]" style={{ color: textColor }}>
        {value}
      </Text>
      <Text className="text-[13px] font-semibold" style={{ color: secondaryColor }}>{label}</Text>
    </View>
  );
}

function FleetHeroIcon({ primary, success }: { primary: string; success: string }) {
  return (
    <View className="h-24 w-24 items-center justify-center" accessible={false}>
      <View
        className="absolute h-20 w-20 rounded-[26px]"
        style={{ backgroundColor: 'rgba(15,23,42,0.18)', transform: [{ rotate: '-8deg' }, { translateY: 6 }] }}
      />
      <View
        className="absolute h-20 w-20 rounded-[26px]"
        style={{ backgroundColor: 'rgba(255,255,255,0.22)', transform: [{ rotate: '8deg' }] }}
      />
      <View className="h-[68px] w-[68px] items-center justify-center rounded-[22px]" style={{ backgroundColor: 'rgba(255,255,255,0.92)' }}>
        <MaterialIcons name="two-wheeler" size={38} color={primary} />
        <View className="absolute -right-2 -top-2 h-7 w-7 items-center justify-center rounded-full border-2" style={{ backgroundColor: success, borderColor: '#FFFFFF' }}>
          <MaterialIcons name="wifi-tethering" size={14} color="#FFFFFF" />
        </View>
      </View>
    </View>
  );
}

export default function AdminDashboard() {
  const { width } = useWindowDimensions();
  const router = useRouter();
  const rawLastRequestUpdate = useRealTimeStore((state) => state.lastRequestUpdate);
  const lastRequestUpdate = useDebounce(rawLastRequestUpdate, 2000);
  const riderLocations = useRealTimeStore((state) => state.riderLocations);
  const isConnected = useRealTimeStore((state) => state.isConnected);
  const { theme } = useTheme();
  
  // High-end UI specific colors (falling back to theme if needed)
  const UI_COLORS = {
    background: theme.COLORS.background,
    surface: theme.COLORS.surface,
    text: theme.COLORS.foreground,
    textSecondary: theme.COLORS.textSecondary,
    border: theme.COLORS.border,
    primary: theme.COLORS.primary,
    success: theme.COLORS.success,
    warning: theme.COLORS.warning,
    danger: theme.COLORS.danger,
    info: theme.COLORS.info,
    pink: theme.COLORS.accentPink,
  };

  const [stats, setStats] = useState({ pending: 0, assigned: 0, onRoute: 0, cancelled: 0, completed: 0, failed: 0 });
  const [departmentData, setDepartmentData] = useState<{name: string, count: number, color: string}[]>([]);
  const [categoryData, setCategoryData] = useState<{name: string, count: number, color: string}[]>([]);
  const [monthsData, setMonthsData] = useState<{labels: string[], data: number[]}>({ labels: [], data: [] });
  const [riderStats, setRiderStats] = useState({ online: 0, offline: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);

  const [selectedTimeframe, setSelectedTimeframe] = useState<string>('All Time');
  const [combinedOptions, setCombinedOptions] = useState<string[]>(['All Time']);
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning, Admin' : hour < 18 ? 'Good afternoon, Admin' : 'Good evening, Admin';

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const [res, ridersRes] = await Promise.all([
          api.get('/requests?limit=1000'),
          api.get('/users/riders')
        ]);
        
        const jobsList = res.data?.data || [];
        const allRiders = Array.isArray(ridersRes.data) ? ridersRes.data : (ridersRes.data?.data || []);
        
        // Dynamically extract available "Month Year" combinations
        const timeframesSet = new Set<string>();
        jobsList.forEach((j: any) => {
          if (j.created_at) {
            const date = new Date(j.created_at);
            const formatted = `${date.toLocaleString('default', { month: 'short' })} ${date.getFullYear()}`;
            timeframesSet.add(formatted);
          }
        });
        
        const sortedTimeframes = Array.from(timeframesSet).sort((a, b) => {
          return new Date(b).getTime() - new Date(a).getTime();
        });
        
        if (sortedTimeframes.length > 0) {
          setCombinedOptions(['All Time', ...sortedTimeframes]);
        }
        
        const filteredJobs = jobsList.filter((j: any) => {
          if (selectedTimeframe === 'All Time') return true;
          if (!j.created_at) return true;
          const date = new Date(j.created_at);
          const formatted = `${date.toLocaleString('default', { month: 'short' })} ${date.getFullYear()}`;
          return formatted === selectedTimeframe;
        });
        
        let pending = 0, assigned = 0, onRoute = 0, cancelled = 0, completed = 0, failed = 0;
        const deptCounts: Record<string, number> = {};
        const catCounts: Record<string, number> = {};
        const monthCounts: Record<string, number> = {};

        const now = new Date();
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(now.getMonth() - 2);

        filteredJobs.forEach((j: any) => {
          if (j.status === 'pending') pending++;
          if (j.status === 'approved' && !['completed', 'failed', 'disapproved', 'cancelled'].includes(j.delivery_status || '')) {
            if (['in_progress', 'arrived'].includes(j.delivery_status || '')) onRoute++;
            else assigned++;
          }
          if (j.status === 'cancelled') cancelled++;
          if (j.delivery_status === 'completed') completed++;
          if (j.delivery_status === 'failed') failed++;
          
          const dept = (j.requester_department || 'General').substring(0, 15);
          deptCounts[dept] = (deptCounts[dept] || 0) + 1;
          
          const cat = j.request_type || 'Standard';
          catCounts[cat] = (catCounts[cat] || 0) + 1;

          if (j.delivery_status === 'completed' && j.updated_at) {
            const date = new Date(j.updated_at);
            if (date >= threeMonthsAgo) {
              const monthLabel = date.toLocaleString('default', { month: 'short' });
              monthCounts[monthLabel] = (monthCounts[monthLabel] || 0) + 1;
            }
          }
        });

        const monthLabels = [];
        for (let i = 2; i >= 0; i--) {
          const d = new Date();
          d.setMonth(now.getMonth() - i);
          monthLabels.push(d.toLocaleString('default', { month: 'short' }));
        }
        const mData = monthLabels.map(m => monthCounts[m] || 0);

        const chartColors = [UI_COLORS.primary, UI_COLORS.info, UI_COLORS.pink, UI_COLORS.success, UI_COLORS.warning, UI_COLORS.danger];
        
        const formatData = (dict: Record<string, number>) => {
          return Object.keys(dict)
            .sort((a, b) => dict[b] - dict[a])
            .slice(0, 5)
            .map((key, i) => ({
              name: key,
              count: dict[key],
              color: chartColors[i % chartColors.length],
            }));
        };

        const recent = [...filteredJobs]
          .filter((j: any) => j.updated_at)
          .sort((a: any, b: any) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
          .slice(0, 4)
          .map((j: any) => {
            const status = j.delivery_status || j.status || 'pending';
            const isSuccess = status === 'completed';
            const isDanger = ['failed', 'cancelled', 'disapproved'].includes(status);
            return {
              id: j.request_id,
              title: status === 'in_progress' ? 'Delivery is on route' : `Request ${status.replaceAll('_', ' ')}`,
              detail: `#${String(j.request_id).slice(-6).toUpperCase()} · ${j.recipient_name || 'Request'}`,
              color: isSuccess ? UI_COLORS.success : isDanger ? UI_COLORS.danger : status === 'in_progress' ? UI_COLORS.info : UI_COLORS.primary,
            };
          });

        setStats({ pending, assigned, onRoute, cancelled, completed, failed });
        setRecentActivity(recent);
        setDepartmentData(formatData(deptCounts));
        setCategoryData(formatData(catCounts));
        setMonthsData({ labels: monthLabels, data: mData });
        
        const total = allRiders.length;
        const online = riderLocations.size;
        setRiderStats({ online, offline: Math.max(0, total - online), total });
        
      } catch (err) {
        console.error('Failed to fetch dashboard data', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, [lastRequestUpdate, riderLocations.size, selectedTimeframe]);

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: UI_COLORS.background }}>
        <View className="border-b px-6 pt-5 pb-4" style={{ backgroundColor: UI_COLORS.surface, borderBottomColor: UI_COLORS.border }}>
          <Text className="font-extrabold text-[28px] tracking-[-0.5px]" style={{ color: UI_COLORS.text }}>Analytics Hub</Text>
        </View>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={UI_COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
      <SafeAreaView style={{ flex: 1, backgroundColor: UI_COLORS.background }} edges={['top']}>
      <View className="border-b px-6 pt-5 pb-4" style={{ backgroundColor: UI_COLORS.surface, borderBottomColor: UI_COLORS.border }}>
        <View className="flex-row items-start justify-between">
          <View>
            <Text className="font-extrabold text-[24px] tracking-[-0.6px]" style={{ color: UI_COLORS.text }}>{greeting}</Text>
            <Text className="mt-1 text-xs font-medium" style={{ color: UI_COLORS.textSecondary }}>Updated just now</Text>
          </View>
          <View className="items-end">
            <View className="flex-row items-center rounded-full px-3 py-1.5" style={{ backgroundColor: isConnected ? `${UI_COLORS.success}18` : `${UI_COLORS.warning}18` }}>
              <View className="mr-1.5 h-2 w-2 rounded-full" style={{ backgroundColor: isConnected ? UI_COLORS.success : UI_COLORS.warning, marginRight: 6 }} />
              <Text className="text-[10px] font-bold" style={{ color: isConnected ? UI_COLORS.success : UI_COLORS.warning }}>{isConnected ? 'Live' : 'Offline'}</Text>
            </View>
            <Text className="mt-2 text-[10px] font-medium" style={{ color: UI_COLORS.textSecondary }}>{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</Text>
          </View>
        </View>
      </View>

      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 24, paddingVertical: 16 }}>
          {combinedOptions.map(option => (
            <TouchableOpacity 
              key={option} 
              activeOpacity={0.7}
              className="mr-3 rounded-3xl border px-5 py-2.5"
              style={{ backgroundColor: selectedTimeframe === option ? UI_COLORS.text : UI_COLORS.surface, borderColor: selectedTimeframe === option ? UI_COLORS.text : UI_COLORS.border, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 }}
              onPress={() => setSelectedTimeframe(option)}
            >
              <Text className="text-sm font-bold" style={{ color: selectedTimeframe === option ? UI_COLORS.surface : UI_COLORS.textSecondary }}>{option}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        
        {/* 10. Rider Online/Offline Banner */}
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Open live fleet map" activeOpacity={0.9} onPress={() => router.push('/map')} className="mb-8 w-full rounded-3xl p-6" style={{ backgroundColor: UI_COLORS.primary, shadowColor: UI_COLORS.primary, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.28, shadowRadius: 20, elevation: 10 }}>
          <View className="flex-row items-center justify-between">
          <View>
            <View className="mb-2 flex-row items-center">
              <View className="mr-2 h-2 w-2 rounded-full" style={{ backgroundColor: UI_COLORS.success, marginRight: 8 }} />
              <Text className="text-[10px] font-extrabold uppercase tracking-[1.5px] text-white" style={{ opacity: 0.85 }}>Live fleet status</Text>
            </View>
            <Text className="font-extrabold text-5xl tracking-[-2px] text-white">{riderStats.online} <Text className="text-xl text-white" style={{ opacity: 0.7 }}>/ {riderStats.total}</Text></Text>
          </View>
          <FleetHeroIcon primary={UI_COLORS.primary} success={UI_COLORS.success} />
          </View>
          <View className="mt-5 flex-row items-center justify-between border-t pt-4" style={{ borderTopColor: 'rgba(255,255,255,0.25)' }}>
            <Text className="text-sm font-bold text-white">{stats.assigned + stats.onRoute} active deliveries</Text>
            <View className="flex-row items-center">
              <Text className="text-xs font-extrabold text-white">View live map</Text>
              <MaterialIcons name="arrow-forward" size={16} color="#FFFFFF" style={{ marginLeft: 6 }} />
            </View>
          </View>
        </TouchableOpacity>

        <Text className="mt-8 mb-3 text-xs font-extrabold uppercase tracking-[1.5px]" style={{ color: UI_COLORS.textSecondary }}>Operations</Text>
        <View className="flex-row flex-wrap justify-between gap-4">
          <MetricCard label="Pending" value={stats.pending} icon="pending-actions" color={UI_COLORS.warning} backgroundColor={UI_COLORS.surface} borderColor={UI_COLORS.border} textColor={UI_COLORS.text} secondaryColor={UI_COLORS.textSecondary} width={(width - 48 - 16) / 2} />
          <MetricCard label="Assigned" value={stats.assigned} icon="assignment-turned-in" color={UI_COLORS.primary} backgroundColor={UI_COLORS.surface} borderColor={UI_COLORS.border} textColor={UI_COLORS.text} secondaryColor={UI_COLORS.textSecondary} width={(width - 48 - 16) / 2} />
          <MetricCard label="On Route" value={stats.onRoute} icon="near-me" color={UI_COLORS.info} backgroundColor={UI_COLORS.surface} borderColor={UI_COLORS.border} textColor={UI_COLORS.text} secondaryColor={UI_COLORS.textSecondary} width={(width - 48 - 16) / 2} />
          <MetricCard label="Completed" value={stats.completed} icon="check-circle-outline" color={UI_COLORS.success} backgroundColor={UI_COLORS.surface} borderColor={UI_COLORS.border} textColor={UI_COLORS.text} secondaryColor={UI_COLORS.textSecondary} width={(width - 48 - 16) / 2} />
        </View>

        <View className="mt-8 mb-2 flex-row items-center justify-between">
          <Text className="text-xs font-extrabold uppercase tracking-[1.5px]" style={{ color: UI_COLORS.textSecondary }}>Recent activity</Text>
          <Text className="text-[10px] font-semibold" style={{ color: UI_COLORS.textSecondary }}>Latest updates</Text>
        </View>
        <View className="mb-2 rounded-3xl border p-2" style={{ backgroundColor: UI_COLORS.surface, borderColor: UI_COLORS.border }}>
          {recentActivity.length > 0 ? recentActivity.map((activity) => (
            <TouchableOpacity
              key={activity.id}
              accessibilityRole="button"
              accessibilityLabel={`${activity.title}, ${activity.detail}`}
              onPress={() => router.push({ pathname: '/job/[id]', params: { id: activity.id } })}
              className="min-h-[56px] flex-row items-center rounded-2xl px-3 py-2"
              activeOpacity={0.7}
            >
              <View className="mr-3 h-2.5 w-2.5 rounded-full" style={{ backgroundColor: activity.color, marginRight: 12 }} />
              <View className="flex-1">
                <Text className="text-sm font-bold" style={{ color: UI_COLORS.text }}>{activity.title}</Text>
                <Text className="mt-0.5 text-[11px]" style={{ color: UI_COLORS.textSecondary }}>{activity.detail}</Text>
              </View>
              <MaterialIcons name="chevron-right" size={20} color={UI_COLORS.textSecondary} />
            </TouchableOpacity>
          )) : (
            <Text className="px-3 py-5 text-center text-sm" style={{ color: UI_COLORS.textSecondary }}>No recent activity</Text>
          )}
        </View>

        <View style={{ height: 32 }} />

        <Text className="mt-2 mb-3 text-xs font-extrabold uppercase tracking-[1.5px]" style={{ color: UI_COLORS.textSecondary }}>Analytics</Text>
        {/* 8. Tasks Completed (3 Months) */}
        <Text className="mb-4 text-lg font-extrabold tracking-[-0.3px]" style={{ color: UI_COLORS.text }}>Trend Analysis</Text>
        <View className="mb-6 rounded-3xl border p-6" style={{ backgroundColor: UI_COLORS.surface, borderColor: UI_COLORS.border, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 12, elevation: 3 }}>
          <View className="mb-5 flex-row items-center justify-between">
            <Text className="font-extrabold text-base" style={{ color: UI_COLORS.text }}>Tasks Completed (3 Months)</Text>
            <MaterialIcons name="show-chart" size={24} color={UI_COLORS.textSecondary} />
          </View>
          <View style={{ alignItems: 'center' }}>
            <LineChart
              data={{
                labels: monthsData.labels.length ? monthsData.labels : ['M1', 'M2', 'M3'],
                datasets: [{ data: monthsData.data.length ? monthsData.data : [0, 0, 0] }]
              }}
              width={width - 48 - 48} // Account for container padding (24 * 2) and card padding (24 * 2)
              height={180}
              withInnerLines={false}
              withOuterLines={false}
              chartConfig={{
                backgroundColor: UI_COLORS.surface,
                backgroundGradientFrom: UI_COLORS.surface,
                backgroundGradientTo: UI_COLORS.surface,
                color: () => UI_COLORS.primary,
                labelColor: (opacity = 1) => UI_COLORS.textSecondary,
                strokeWidth: 3,
                decimalPlaces: 0,
                propsForDots: { r: "6", strokeWidth: "2", stroke: UI_COLORS.surface }
              }}
              bezier
              style={{ marginVertical: 8, marginLeft: -16 }}
            />
          </View>
        </View>

        {/* 9. Category Breakdown */}
        <Text className="mt-2 mb-4 text-lg font-extrabold tracking-[-0.3px]" style={{ color: UI_COLORS.text }}>Category Breakdown</Text>
        <View className="mb-6 rounded-3xl border p-6" style={{ backgroundColor: UI_COLORS.surface, borderColor: UI_COLORS.border, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 12, elevation: 3 }}>
          {categoryData.length > 0 ? (
            <View style={{ alignItems: 'center' }}>
              <PieChart
                data={categoryData.map(d => ({
                  name: d.name,
                  count: d.count,
                  color: d.color,
                  legendFontColor: UI_COLORS.textSecondary,
                  legendFontSize: 12
                }))}
                width={width - 96}
                height={160}
                chartConfig={{
                  color: (opacity = 1) => UI_COLORS.text,
                }}
                accessor={"count"}
                backgroundColor={"transparent"}
                paddingLeft={"0"}
                hasLegend={true}
                center={[10, 0]}
              />
            </View>
          ) : (
            <Text style={{ color: UI_COLORS.textSecondary, textAlign: 'center', padding: 20 }}>No data available</Text>
          )}
        </View>

        {/* 4. Requests by Department */}
        <Text className="mt-2 mb-4 text-lg font-extrabold tracking-[-0.3px]" style={{ color: UI_COLORS.text }}>Department Requests</Text>
        <View className="mb-6 rounded-3xl border p-6" style={{ backgroundColor: UI_COLORS.surface, borderColor: UI_COLORS.border, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 12, elevation: 3 }}>
          {departmentData.map((dept, i) => (
            <View key={i} className="flex-row items-center justify-between border-b py-4" style={{ borderBottomColor: UI_COLORS.border, borderBottomWidth: i === departmentData.length - 1 ? 0 : 1 }}>
              <View className="flex-row items-center">
                <View className="mr-4 h-3 w-3 rounded-full" style={{ backgroundColor: dept.color }} />
                <Text className="font-semibold text-[15px]" style={{ color: UI_COLORS.text }} numberOfLines={1}>{dept.name}</Text>
              </View>
              <Text className="text-base font-extrabold" style={{ color: UI_COLORS.textSecondary }}>{dept.count}</Text>
            </View>
          ))}
          {departmentData.length === 0 && (
            <Text style={{ color: UI_COLORS.textSecondary, textAlign: 'center', padding: 20 }}>No data available</Text>
          )}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
