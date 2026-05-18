import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS, RADIUS, TYPOGRAPHY } from '../../constants/Theme';
import api from '../../services/api';

const { width } = Dimensions.get('window');

export default function AnalyticsDashboard() {
  const [summary, setSummary] = useState<any>(null);
  const [locations, setLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const [summaryRes, locationRes] = await Promise.all([
        api.get('/analytics/summary-stats?timeframe=weekly'),
        api.get('/analytics/location-insights?timeframe=weekly')
      ]);
      setSummary(summaryRes.data);
      setLocations(locationRes.data.dropoffs || []);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

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

  if (loading && !summary) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>System Analytics</Text>
        <View style={styles.periodSelector}>
          <Text style={styles.periodText}>Last 7 Days</Text>
          <MaterialIcons name="keyboard-arrow-down" size={20} color={COLORS.secondary} />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Fleet Utilization Summary */}
        <View style={styles.revenueCard}>
          <Text style={styles.revenueLabel}>Fleet Utilization</Text>
          <Text style={styles.revenueValue}>{summary?.utilization || 0}%</Text>
          <View style={styles.growthBadge}>
            <MaterialIcons name="trending-up" size={16} color="#10B981" />
            <Text style={styles.growthText}>Live fleet efficiency</Text>
          </View>
        </View>

        {/* Mock Charts Section - Representing Activity */}
        <Text style={styles.sectionTitle}>Delivery Volume</Text>
        <View style={styles.chartPlaceholder}>
          <View style={styles.chartHeader}>
            <Text style={styles.chartTitle}>Total Requests: {summary?.counts?.total || 0}</Text>
          </View>
          <View style={styles.barContainer}>
            {[20, 45, 30, 85, 50, 75, summary?.counts?.completed || 0].map((height, i) => (
              <View key={i} style={styles.barWrapper}>
                <View style={[styles.bar, { height: Math.min(height, 100) * 1.5 }]} />
                <Text style={styles.barLabel}>{['M', 'T', 'W', 'T', 'F', 'S', 'S'][i]}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Performance Metrics Grid */}
        <Text style={styles.sectionTitle}>Key Metrics</Text>
        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
            <MaterialIcons name="timer" size={24} color={COLORS.accentBlue} />
            <Text style={styles.metricValue}>{getAvgDeliveryTime()}</Text>
            <Text style={styles.metricLabel}>Avg. Delivery</Text>
          </View>
          <View style={styles.metricCard}>
            <MaterialIcons name="star-outline" size={24} color="#F59E0B" />
            <Text style={styles.metricValue}>4.85</Text>
            <Text style={styles.metricLabel}>Service Rating</Text>
          </View>
          <View style={styles.metricCard}>
            <MaterialIcons name="check-circle-outline" size={24} color="#10B981" />
            <Text style={styles.metricValue}>{getSuccessRate()}</Text>
            <Text style={styles.metricLabel}>Success Rate</Text>
          </View>
          <View style={styles.metricCard}>
            <MaterialIcons name="error-outline" size={24} color={COLORS.accentPink} />
            <Text style={styles.metricValue}>{getCancellationRate()}</Text>
            <Text style={styles.metricLabel}>Cancellation</Text>
          </View>
        </View>

        {/* Top Regions */}
        <Text style={styles.sectionTitle}>Top Locations (Dropoffs)</Text>
        <View style={styles.listCard}>
          {locations.length > 0 ? (
            locations.map((loc, i) => (
              <View key={i} style={[styles.listItem, i === locations.length - 1 && { borderBottomWidth: 0 }]}>
                <Text style={styles.locationName} numberOfLines={1}>{loc.name}</Text>
                <View style={styles.locationRight}>
                  <Text style={styles.locationCount}>{loc.count}</Text>
                  <MaterialIcons 
                    name="trending-up" 
                    size={16} 
                    color="#10B981" 
                    style={{ marginLeft: 8 }}
                  />
                </View>
              </View>
            ))
          ) : (
            <View style={styles.emptyList}>
              <Text style={styles.emptyText}>No location data available</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { justifyContent: 'center', alignItems: 'center' },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: 24, 
    backgroundColor: '#FFFFFF', 
    borderBottomWidth: 1, 
    borderBottomColor: COLORS.border 
  },
  title: { fontSize: TYPOGRAPHY.size.xl, fontWeight: '900', color: COLORS.primary },
  periodSelector: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: COLORS.background, 
    paddingHorizontal: 12, 
    paddingVertical: 6, 
    borderRadius: RADIUS.button / 2 
  },
  periodText: { fontSize: TYPOGRAPHY.size.xs, fontWeight: '700', color: COLORS.secondary, marginRight: 4 },
  scrollContent: { padding: 20 },
  revenueCard: { 
    backgroundColor: COLORS.primary, 
    padding: 24, 
    borderRadius: RADIUS.card, 
    marginBottom: 24 
  },
  revenueLabel: { fontSize: TYPOGRAPHY.size.sm, color: COLORS.muted, fontWeight: '600' },
  revenueValue: { fontSize: TYPOGRAPHY.size['3xl'], fontWeight: '900', color: '#FFFFFF', marginVertical: 8 },
  growthBadge: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: 'rgba(16, 185, 129, 0.2)', 
    paddingHorizontal: 10, 
    paddingVertical: 4, 
    borderRadius: 8,
    alignSelf: 'flex-start'
  },
  growthText: { fontSize: TYPOGRAPHY.size.xs, fontWeight: '800', color: '#10B981', marginLeft: 4 },
  sectionTitle: { fontSize: TYPOGRAPHY.size.base, fontWeight: '900', color: COLORS.primary, marginBottom: 16, marginTop: 8 },
  chartPlaceholder: { 
    backgroundColor: '#FFFFFF', 
    borderRadius: RADIUS.card, 
    padding: 20, 
    borderWidth: 1, 
    borderColor: COLORS.border, 
    marginBottom: 24 
  },
  chartHeader: { marginBottom: 20 },
  chartTitle: { fontSize: TYPOGRAPHY.size.sm, fontWeight: '700', color: COLORS.secondary },
  barContainer: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'flex-end', 
    height: 160,
    paddingHorizontal: 10
  },
  barWrapper: { alignItems: 'center' },
  bar: { width: 12, backgroundColor: COLORS.accentBlue, borderRadius: 6 },
  barLabel: { fontSize: TYPOGRAPHY.size.xs - 2, fontWeight: '700', color: COLORS.muted, marginTop: 8 },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 8 },
  metricCard: { 
    backgroundColor: '#FFFFFF', 
    width: '48%', 
    padding: 20, 
    borderRadius: RADIUS.card, 
    borderWidth: 1, 
    borderColor: COLORS.border, 
    marginBottom: 16,
    alignItems: 'center'
  },
  metricValue: { fontSize: TYPOGRAPHY.size.lg, fontWeight: '900', color: COLORS.primary, marginVertical: 4 },
  metricLabel: { fontSize: TYPOGRAPHY.size.xs - 1, fontWeight: '700', color: COLORS.secondary },
  listCard: { 
    backgroundColor: '#FFFFFF', 
    borderRadius: RADIUS.card, 
    borderWidth: 1, 
    borderColor: COLORS.border, 
    overflow: 'hidden',
    marginBottom: 20
  },
  listItem: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: 16, 
    borderBottomWidth: 1, 
    borderBottomColor: COLORS.border 
  },
  locationName: { flex: 1, fontSize: TYPOGRAPHY.size.sm, fontWeight: '700', color: COLORS.primary, marginRight: 8 },
  locationRight: { flexDirection: 'row', alignItems: 'center' },
  locationCount: { fontSize: TYPOGRAPHY.size.sm, fontWeight: '800', color: COLORS.accentBlue },
  emptyList: { padding: 20, alignItems: 'center' },
  emptyText: { color: COLORS.muted, fontWeight: '600' },
});


