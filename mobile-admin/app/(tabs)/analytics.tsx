import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
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

  const styles = React.useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: SPACING.xl, paddingVertical: SPACING.lg, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
    title: { fontSize: TYPOGRAPHY.size['2xl'], fontFamily: TYPOGRAPHY.fontFamily.bold, color: COLORS.primary, letterSpacing: -0.5 },
    subtitle: { fontSize: TYPOGRAPHY.size.sm, fontFamily: TYPOGRAPHY.fontFamily.medium, color: COLORS.secondary },
    exportBtn: { padding: 10, backgroundColor: COLORS.background, borderRadius: RADIUS.button, borderWidth: 1, borderColor: COLORS.border },
    tabContainer: { flexDirection: 'row', backgroundColor: COLORS.surface, padding: SPACING.sm, gap: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border },
    tab: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: RADIUS.sm, backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border },
    activeTab: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
    tabText: { fontSize: TYPOGRAPHY.size.xs, fontFamily: TYPOGRAPHY.fontFamily.bold, color: COLORS.secondary },
    activeTabText: { color: COLORS.onPrimary },
    scrollContent: { padding: SPACING.xl },
    loadingContainer: { marginTop: 40, alignItems: 'center' },
    revenueCard: { backgroundColor: COLORS.primary, padding: SPACING.xl, borderRadius: RADIUS.card, marginBottom: SPACING.xl },
    revenueLabel: { fontSize: TYPOGRAPHY.size.sm, color: COLORS.border, fontFamily: TYPOGRAPHY.fontFamily.medium },
    revenueValue: { fontSize: TYPOGRAPHY.size['3xl'], fontFamily: TYPOGRAPHY.fontFamily.bold, color: COLORS.onPrimary, marginVertical: 8 },
    growthBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(16, 185, 129, 0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.sm, alignSelf: 'flex-start' },
    growthText: { fontSize: TYPOGRAPHY.size.xs, fontFamily: TYPOGRAPHY.fontFamily.bold, color: COLORS.success, marginLeft: 4 },
    sectionTitle: { fontSize: TYPOGRAPHY.size.base, fontFamily: TYPOGRAPHY.fontFamily.bold, color: COLORS.primary, marginBottom: 16, marginTop: 8 },
    chartPlaceholder: { backgroundColor: COLORS.surface, borderRadius: RADIUS.card, padding: SPACING.xl, borderWidth: 1, borderColor: COLORS.border, marginBottom: SPACING.xl },
    chartHeader: { marginBottom: 20 },
    chartTitle: { fontSize: TYPOGRAPHY.size.sm, fontFamily: TYPOGRAPHY.fontFamily.bold, color: COLORS.secondary },
    chartScrollWrapper: { marginLeft: -10, marginRight: -10 },
    barContainer: { flexDirection: 'row', alignItems: 'flex-end', height: 160, paddingHorizontal: 10 },
    barWrapper: { alignItems: 'center', marginHorizontal: 8, width: 30 },
    barTooltip: { position: 'absolute', top: -20, backgroundColor: COLORS.muted, paddingHorizontal: 4, paddingVertical: 2, borderRadius: 4 },
    barTooltipText: { color: '#FFF', fontSize: 10, fontFamily: TYPOGRAPHY.fontFamily.bold },
    bar: { width: 16, backgroundColor: COLORS.primary, borderRadius: RADIUS.sm, marginTop: 24 },
    barLabel: { fontSize: TYPOGRAPHY.size.xs - 2, fontFamily: TYPOGRAPHY.fontFamily.bold, color: COLORS.secondary, marginTop: 8 },
    metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 8 },
    metricCard: { backgroundColor: COLORS.surface, width: '48%', padding: SPACING.xl, borderRadius: RADIUS.card, borderWidth: 1, borderColor: COLORS.border, marginBottom: 16, alignItems: 'center' },
    metricValue: { fontSize: TYPOGRAPHY.size.lg, fontFamily: TYPOGRAPHY.fontFamily.bold, color: COLORS.primary, marginVertical: 4 },
    metricLabel: { fontSize: TYPOGRAPHY.size.xs - 1, fontFamily: TYPOGRAPHY.fontFamily.bold, color: COLORS.secondary },
    listCard: { backgroundColor: COLORS.surface, borderRadius: RADIUS.card, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden', marginBottom: 20 },
    listItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: SPACING.lg, borderBottomWidth: 1, borderBottomColor: COLORS.border },
    locationName: { flex: 1, fontSize: TYPOGRAPHY.size.sm, fontFamily: TYPOGRAPHY.fontFamily.bold, color: COLORS.primary, marginRight: 8 },
    locationRight: { flexDirection: 'row', alignItems: 'center' },
    locationCount: { fontSize: TYPOGRAPHY.size.sm, fontFamily: TYPOGRAPHY.fontFamily.bold, color: COLORS.primary },
    emptyList: { padding: 20, alignItems: 'center' },
    emptyText: { color: COLORS.secondary, fontFamily: TYPOGRAPHY.fontFamily.medium, alignSelf: 'center' },
  }), [theme]);

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
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>System Analytics</Text>
          <Text style={styles.subtitle}>Performance Overview</Text>
        </View>
        <TouchableOpacity 
          style={styles.exportBtn} 
          onPress={exportCSV} 
          disabled={isExporting || loading}
        >
          {isExporting ? <ActivityIndicator size="small" color={COLORS.primary} /> : <MaterialIcons name="file-download" size={20} color={COLORS.primary} />}
        </TouchableOpacity>
      </View>

      <View style={styles.tabContainer}>
        {TIMEFRAMES.map(tf => (
          <TouchableOpacity 
            key={tf.id} 
            style={[styles.tab, timeframe === tf.id && styles.activeTab]}
            onPress={() => setTimeframe(tf.id)}
          >
            <Text style={[styles.tabText, timeframe === tf.id && styles.activeTabText]}>
              {tf.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={styles.loadingContainer}>
             <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : (
          <>
            {/* Fleet Utilization Summary */}
            <View style={styles.revenueCard}>
              <Text style={styles.revenueLabel}>Fleet Utilization</Text>
              <Text style={styles.revenueValue}>{summary?.utilization || 0}%</Text>
              <View style={styles.growthBadge}>
                <MaterialIcons name="trending-up" size={16} color={COLORS.success} />
                <Text style={styles.growthText}>Live fleet efficiency</Text>
              </View>
            </View>

            {/* Dynamic Peak Hours Chart */}
            <Text style={styles.sectionTitle}>Peak Hours (Delivery Volume)</Text>
            <View style={styles.chartPlaceholder}>
              <View style={styles.chartHeader}>
                <Text style={styles.chartTitle}>Total Requests: {summary?.counts?.total || 0}</Text>
              </View>
              {peakHours.length > 0 ? (
                <View style={styles.chartScrollWrapper}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={styles.barContainer}>
                      {peakHours.map((hourData, i) => (
                        <View key={i} style={styles.barWrapper}>
                          <View style={styles.barTooltip}>
                            <Text style={styles.barTooltipText}>{hourData.volume}</Text>
                          </View>
                          <View style={[styles.bar, { height: Math.max((hourData.volume / maxVolume) * 120, 5) }]} />
                          <Text style={styles.barLabel}>{hourData.hour}:00</Text>
                        </View>
                      ))}
                    </View>
                  </ScrollView>
                </View>
              ) : (
                <Text style={styles.emptyText}>No data available for this timeframe</Text>
              )}
            </View>

            {/* Performance Metrics Grid */}
            <Text style={styles.sectionTitle}>Key Metrics</Text>
            <View style={styles.metricsGrid}>
              <View style={styles.metricCard}>
                <MaterialIcons name="timer" size={24} color={COLORS.primary} />
                <Text style={styles.metricValue}>{getAvgDeliveryTime()}</Text>
                <Text style={styles.metricLabel}>Avg. Delivery</Text>
              </View>
              <View style={styles.metricCard}>
                <MaterialIcons name="star-outline" size={24} color={COLORS.warning} />
                <Text style={styles.metricValue}>4.85</Text>
                <Text style={styles.metricLabel}>Service Rating</Text>
              </View>
              <View style={styles.metricCard}>
                <MaterialIcons name="check-circle-outline" size={24} color={COLORS.success} />
                <Text style={styles.metricValue}>{getSuccessRate()}</Text>
                <Text style={styles.metricLabel}>Success Rate</Text>
              </View>
              <View style={styles.metricCard}>
                <MaterialIcons name="error-outline" size={24} color={COLORS.danger} />
                <Text style={styles.metricValue}>{getCancellationRate()}</Text>
                <Text style={styles.metricLabel}>Cancellation</Text>
              </View>
            </View>

            {/* Top Regions */}
            <Text style={styles.sectionTitle}>Top Dropoff Locations</Text>
            <View style={styles.listCard}>
              {locations.length > 0 ? (
                locations.map((loc, i) => (
                  <View key={i} style={[styles.listItem, i === locations.length - 1 && { borderBottomWidth: 0 }]}>
                    <Text style={styles.locationName} numberOfLines={1}>{loc.name}</Text>
                    <View style={styles.locationRight}>
                      <Text style={styles.locationCount}>{loc.count}</Text>
                      <MaterialIcons name="local-fire-department" size={16} color={COLORS.warning} style={{ marginLeft: 8 }} />
                    </View>
                  </View>
                ))
              ) : (
                <View style={styles.emptyList}>
                  <Text style={styles.emptyText}>No location data available</Text>
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}