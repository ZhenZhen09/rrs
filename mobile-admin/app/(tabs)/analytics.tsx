import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Dimensions, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { BarChart, PieChart } from 'react-native-chart-kit';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { COLORS as DEFAULT_COLORS, RADIUS as DEFAULT_RADIUS, TYPOGRAPHY as DEFAULT_TYPOGRAPHY } from '../../constants/Theme';
import { useTheme } from '../../context/ThemeContext';
import api from '../../services/api';

const { width } = Dimensions.get('window');

const TIMEFRAMES = [
  { id: 'daily', label: 'Today' },
  { id: 'weekly', label: '7 Days' },
  { id: 'monthly', label: '30 Days' }
];

export default function AnalyticsDashboard() {
  const { theme } = useTheme();
  const { COLORS, RADIUS, TYPOGRAPHY, SPACING } = theme;

  const [timeframe, setTimeframe] = useState('weekly');
  const [summary, setSummary] = useState<any>(null);
  const [locations, setLocations] = useState<any[]>([]);
  const [peakHours, setPeakHours] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  const fetchAnalytics = async (tf: string) => {
    try {
      setLoading(true);
      const [summaryRes, locationRes, peakRes] = await Promise.all([
        api.get(`/analytics/summary-stats?timeframe=${tf}`),
        api.get(`/analytics/location-insights?timeframe=${tf}`),
        api.get(`/analytics/peak-hours?timeframe=${tf}`)
      ]);
      setSummary(summaryRes.data);
      setLocations(locationRes.data.dropoffs || []);
      setPeakHours(peakRes.data || []);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics(timeframe);
  }, [timeframe]);

  const exportCSV = async () => {
    try {
      setIsExporting(true);
      // Fetch some detailed data to export
      const deptRes = await api.get(`/analytics/department-allocation?timeframe=${timeframe}`);
      const deptData = deptRes.data || [];
      
      let csvContent = 'Department,Urgency,Volume\n';
      deptData.forEach((row: any) => {
        csvContent += `"${row.requester_department}","${row.urgency_level}",${row.volume}\n`;
      });
      
      csvContent += '\nSummary Metric,Value\n';
      csvContent += `Total Requests,${summary?.counts?.total || 0}\n`;
      csvContent += `Success Rate,${getSuccessRate()}\n`;
      csvContent += `Avg Delivery Time,${getAvgDeliveryTime()}\n`;
      csvContent += `Fleet Utilization,${summary?.utilization || 0}%\n`;

      const fileName = `Export_${timeframe}_${new Date().toISOString().split('T')[0]}.csv`;
      
      const file = new FileSystem.File(FileSystem.Paths.document, fileName);
      file.write(csvContent, { encoding: 'utf8' });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(file.uri, {
          mimeType: 'text/csv',
          dialogTitle: 'Export Analytics Data'
        });
      } else {
        Alert.alert('Error', 'Sharing is not available on this device');
      }
    } catch (error) {
      console.error('Export failed:', error);
      Alert.alert('Export Failed', 'An error occurred while generating the CSV.');
    } finally {
      setIsExporting(false);
    }
  };

  const getSuccessRate = () => {
    if (!summary?.counts?.total) return '0%';
    return ((summary.counts.completed / summary.counts.total) * 100).toFixed(1) + '%';
  };

  const getCancellationRate = () => {
    if (!summary?.counts?.total) return '0%';
    return ((summary.counts.failed / summary.counts.total) * 100).toFixed(1) + '%';
  };

  const getAvgDeliveryTime = () => {
    if (!summary?.avgTime) return '0m';
    return Math.round(summary.avgTime * 60) + 'm';
  };

  // Helper to get max volume for chart scaling
  const maxVolume = peakHours.length > 0 ? Math.max(...peakHours.map(p => p.volume)) : 10;

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: COLORS.background }} edges={['top']}>
      <View className="flex-row items-center justify-between border-b px-6 py-4" style={{ backgroundColor: COLORS.surface, borderBottomColor: COLORS.border }}>
        <View>
          <Text className="font-bold text-2xl tracking-[-0.5px]" style={{ color: COLORS.primary, fontFamily: TYPOGRAPHY.fontFamily.bold }}>System Analytics</Text>
          <Text className="text-sm" style={{ color: COLORS.secondary, fontFamily: TYPOGRAPHY.fontFamily.medium }}>Performance Overview</Text>
        </View>
        <TouchableOpacity 
          className="rounded-xl border p-2.5" style={{ backgroundColor: COLORS.background, borderColor: COLORS.border }}
          onPress={exportCSV} 
          disabled={isExporting || loading}
        >
          {isExporting ? <ActivityIndicator size="small" color={COLORS.primary} /> : <MaterialIcons name="file-download" size={20} color={COLORS.primary} />}
        </TouchableOpacity>
      </View>

      <View className="flex-row gap-2 border-b p-2" style={{ backgroundColor: COLORS.surface, borderBottomColor: COLORS.border }}>
        {TIMEFRAMES.map(tf => (
          <TouchableOpacity 
            key={tf.id} 
            className="flex-1 items-center rounded-lg border py-2.5" style={{ backgroundColor: timeframe === tf.id ? COLORS.primary : COLORS.background, borderColor: timeframe === tf.id ? COLORS.primary : COLORS.border }}
            onPress={() => setTimeframe(tf.id)}
          >
            <Text className="text-xs font-bold" style={{ color: timeframe === tf.id ? COLORS.onPrimary : COLORS.secondary, fontFamily: TYPOGRAPHY.fontFamily.bold }}>
              {tf.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={{ padding: SPACING.xl }} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View className="mt-10 items-center">
             <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : (
          <>
            {/* Fleet Utilization Summary */}
            <View className="mb-6 rounded-3xl p-6" style={{ backgroundColor: COLORS.primary }}>
              <Text className="text-sm" style={{ color: COLORS.border, fontFamily: TYPOGRAPHY.fontFamily.medium }}>Fleet Utilization</Text>
              <Text className="my-2 text-3xl font-bold" style={{ color: COLORS.onPrimary, fontFamily: TYPOGRAPHY.fontFamily.bold }}>{summary?.utilization || 0}%</Text>
              <View className="flex-row items-center self-start rounded-lg px-2.5 py-1" style={{ backgroundColor: 'rgba(16, 185, 129, 0.2)' }}>
                <MaterialIcons name="trending-up" size={16} color={COLORS.success} />
                <Text className="ml-1 text-xs font-bold" style={{ color: COLORS.success, fontFamily: TYPOGRAPHY.fontFamily.bold }}>Live fleet efficiency</Text>
              </View>
            </View>

            {/* Dynamic Peak Hours Chart */}
            <Text className="mb-4 mt-2 text-base font-bold" style={{ color: COLORS.primary, fontFamily: TYPOGRAPHY.fontFamily.bold }}>Peak Hours (Delivery Volume)</Text>
            <View className="mb-6 rounded-2xl border p-6" style={{ backgroundColor: COLORS.surface, borderColor: COLORS.border }}>
              <View className="mb-5">
                <Text className="text-sm font-bold" style={{ color: COLORS.secondary, fontFamily: TYPOGRAPHY.fontFamily.bold }}>Total Requests: {summary?.counts?.total || 0}</Text>
              </View>
              {peakHours.length > 0 ? (
                <View style={{ marginLeft: -SPACING.xl }}>
                  <BarChart
                    data={{
                      labels: peakHours.map(h => `${h.hour}h`),
                      datasets: [{ data: peakHours.map(h => h.volume) }]
                    }}
                    width={width - 40}
                    height={220}
                    yAxisLabel=""
                    yAxisSuffix=""
                    chartConfig={{
                      backgroundColor: COLORS.surface,
                      backgroundGradientFrom: COLORS.surface,
                      backgroundGradientTo: COLORS.surface,
                      decimalPlaces: 0,
                      color: (opacity = 1) => COLORS.primary,
                      labelColor: (opacity = 1) => COLORS.secondary,
                      style: { borderRadius: 16 },
                      propsForBackgroundLines: {
                        strokeWidth: 1,
                        stroke: COLORS.border,
                        strokeDasharray: "0",
                      }
                    }}
                    style={{ marginVertical: 8, borderRadius: 16 }}
                    showValuesOnTopOfBars={true}
                  />
                </View>
              ) : (
                <Text className="self-center" style={{ color: COLORS.secondary, fontFamily: TYPOGRAPHY.fontFamily.medium }}>No data available for this timeframe</Text>
              )}
            </View>

            {/* Performance Metrics Grid */}
            <Text className="mb-4 mt-2 text-base font-bold" style={{ color: COLORS.primary, fontFamily: TYPOGRAPHY.fontFamily.bold }}>Key Metrics</Text>
            <View className="mb-2 flex-row flex-wrap justify-between">
              <View className="mb-4 w-[48%] items-center rounded-2xl border p-6" style={{ backgroundColor: COLORS.surface, borderColor: COLORS.border }}>
                <MaterialIcons name="timer" size={24} color={COLORS.primary} />
                <Text className="my-1 text-lg font-bold" style={{ color: COLORS.primary, fontFamily: TYPOGRAPHY.fontFamily.bold }}>{getAvgDeliveryTime()}</Text>
                <Text className="text-xs font-bold" style={{ color: COLORS.secondary, fontFamily: TYPOGRAPHY.fontFamily.bold }}>Avg. Delivery</Text>
              </View>
              <View className="mb-4 w-[48%] items-center rounded-2xl border p-6" style={{ backgroundColor: COLORS.surface, borderColor: COLORS.border }}>
                <MaterialIcons name="star-outline" size={24} color={COLORS.warning} />
                <Text className="my-1 text-lg font-bold" style={{ color: COLORS.primary, fontFamily: TYPOGRAPHY.fontFamily.bold }}>4.85</Text>
                <Text className="text-xs font-bold" style={{ color: COLORS.secondary, fontFamily: TYPOGRAPHY.fontFamily.bold }}>Service Rating</Text>
              </View>
              <View className="mb-4 w-[48%] items-center rounded-2xl border p-6" style={{ backgroundColor: COLORS.surface, borderColor: COLORS.border }}>
                <MaterialIcons name="check-circle-outline" size={24} color={COLORS.success} />
                <Text className="my-1 text-lg font-bold" style={{ color: COLORS.primary, fontFamily: TYPOGRAPHY.fontFamily.bold }}>{getSuccessRate()}</Text>
                <Text className="text-xs font-bold" style={{ color: COLORS.secondary, fontFamily: TYPOGRAPHY.fontFamily.bold }}>Success Rate</Text>
              </View>
              <View className="mb-4 w-[48%] items-center rounded-2xl border p-6" style={{ backgroundColor: COLORS.surface, borderColor: COLORS.border }}>
                <MaterialIcons name="error-outline" size={24} color={COLORS.danger} />
                <Text className="my-1 text-lg font-bold" style={{ color: COLORS.primary, fontFamily: TYPOGRAPHY.fontFamily.bold }}>{getCancellationRate()}</Text>
                <Text className="text-xs font-bold" style={{ color: COLORS.secondary, fontFamily: TYPOGRAPHY.fontFamily.bold }}>Cancellation</Text>
              </View>
            </View>

            {/* Status Distribution Pie Chart */}
            <Text className="mb-4 mt-2 text-base font-bold" style={{ color: COLORS.primary, fontFamily: TYPOGRAPHY.fontFamily.bold }}>Request Status</Text>
            <View className="mb-6 items-center rounded-3xl border px-6 py-2.5" style={{ backgroundColor: COLORS.surface, borderColor: COLORS.border, padding: SPACING.xl }}>
              <PieChart
                data={[
                  {
                    name: "Completed",
                    population: summary?.counts?.completed || 0,
                    color: COLORS.success,
                    legendFontColor: COLORS.secondary,
                    legendFontSize: 12
                  },
                  {
                    name: "Failed",
                    population: summary?.counts?.failed || 0,
                    color: COLORS.danger,
                    legendFontColor: COLORS.secondary,
                    legendFontSize: 12
                  },
                  {
                    name: "Other",
                    population: Math.max(0, (summary?.counts?.total || 0) - (summary?.counts?.completed || 0) - (summary?.counts?.failed || 0)),
                    color: COLORS.warning,
                    legendFontColor: COLORS.secondary,
                    legendFontSize: 12
                  }
                ].filter(d => d.population > 0)}
                width={width - 60}
                height={160}
                chartConfig={{
                  color: (opacity = 1) => COLORS.primary,
                }}
                accessor={"population"}
                backgroundColor={"transparent"}
                paddingLeft={"15"}
                absolute
              />
            </View>

            {/* Top Regions */}
            <Text className="mb-4 mt-2 text-base font-bold" style={{ color: COLORS.primary, fontFamily: TYPOGRAPHY.fontFamily.bold }}>Top Dropoff Locations</Text>
            <View className="mb-5 overflow-hidden rounded-3xl border" style={{ backgroundColor: COLORS.surface, borderColor: COLORS.border }}>
              {locations.length > 0 ? (
                locations.map((loc, i) => (
                  <View key={i} className="flex-row items-center justify-between border-b p-4" style={{ borderBottomColor: i === locations.length - 1 ? 'transparent' : COLORS.border }}>
                    <Text className="mr-2 flex-1 text-sm font-bold" style={{ color: COLORS.primary, fontFamily: TYPOGRAPHY.fontFamily.bold }} numberOfLines={1}>{loc.name}</Text>
                    <View className="flex-row items-center">
                      <Text className="text-sm font-bold" style={{ color: COLORS.primary, fontFamily: TYPOGRAPHY.fontFamily.bold }}>{loc.count}</Text>
                      <MaterialIcons name="local-fire-department" size={16} color={COLORS.warning} style={{ marginLeft: 8 }} />
                    </View>
                  </View>
                ))
              ) : (
                <View className="items-center p-5">
                  <Text className="self-center" style={{ color: COLORS.secondary, fontFamily: TYPOGRAPHY.fontFamily.medium }}>No location data available</Text>
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
