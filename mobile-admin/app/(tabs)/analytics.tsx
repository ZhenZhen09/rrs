import React from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

export default function AnalyticsDashboard() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>System Analytics</Text>
        <View style={styles.periodSelector}>
          <Text style={styles.periodText}>Last 7 Days</Text>
          <MaterialIcons name="keyboard-arrow-down" size={20} color="#64748B" />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Revenue Summary */}
        <View style={styles.revenueCard}>
          <Text style={styles.revenueLabel}>Total Revenue</Text>
          <Text style={styles.revenueValue}>$12,450.80</Text>
          <View style={styles.growthBadge}>
            <MaterialIcons name="trending-up" size={16} color="#10B981" />
            <Text style={styles.growthText}>+12.5% from last week</Text>
          </View>
        </View>

        {/* Mock Charts Section */}
        <Text style={styles.sectionTitle}>Delivery Performance</Text>
        <View style={styles.chartPlaceholder}>
          <View style={styles.chartHeader}>
            <Text style={styles.chartTitle}>Daily Completed Jobs</Text>
          </View>
          <View style={styles.barContainer}>
            {[40, 65, 30, 85, 50, 75, 90].map((height, i) => (
              <View key={i} style={styles.barWrapper}>
                <View style={[styles.bar, { height: height * 1.5 }]} />
                <Text style={styles.barLabel}>{['M', 'T', 'W', 'T', 'F', 'S', 'S'][i]}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Performance Metrics Grid */}
        <Text style={styles.sectionTitle}>Key Metrics</Text>
        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
            <MaterialIcons name="timer" size={24} color="#3B82F6" />
            <Text style={styles.metricValue}>22m</Text>
            <Text style={styles.metricLabel}>Avg. Delivery</Text>
          </View>
          <View style={styles.metricCard}>
            <MaterialIcons name="star-outline" size={24} color="#F59E0B" />
            <Text style={styles.metricValue}>4.85</Text>
            <Text style={styles.metricLabel}>Service Rating</Text>
          </View>
          <View style={styles.metricCard}>
            <MaterialIcons name="check-circle-outline" size={24} color="#10B981" />
            <Text style={styles.metricValue}>99.2%</Text>
            <Text style={styles.metricLabel}>Success Rate</Text>
          </View>
          <View style={styles.metricCard}>
            <MaterialIcons name="error-outline" size={24} color="#EF4444" />
            <Text style={styles.metricValue}>0.8%</Text>
            <Text style={styles.metricLabel}>Cancellation</Text>
          </View>
        </View>

        {/* Top Regions */}
        <Text style={styles.sectionTitle}>Top Locations</Text>
        <View style={styles.listCard}>
          {[
            { name: 'Downtown Hub', count: 452, trend: 'up' },
            { name: 'West End Plaza', count: 328, trend: 'up' },
            { name: 'North Station', count: 215, trend: 'down' },
            { name: 'Central Mall', count: 184, trend: 'up' },
          ].map((loc, i) => (
            <View key={i} style={[styles.listItem, i === 3 && { borderBottomWidth: 0 }]}>
              <Text style={styles.locationName}>{loc.name}</Text>
              <View style={styles.locationRight}>
                <Text style={styles.locationCount}>{loc.count}</Text>
                <MaterialIcons 
                  name={loc.trend === 'up' ? 'trending-up' : 'trending-down'} 
                  size={16} 
                  color={loc.trend === 'up' ? '#10B981' : '#EF4444'} 
                  style={{ marginLeft: 8 }}
                />
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: 24, 
    backgroundColor: '#FFFFFF', 
    borderBottomWidth: 1, 
    borderBottomColor: '#E2E8F0' 
  },
  title: { fontSize: 24, fontWeight: '900', color: '#1E293B' },
  periodSelector: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#F1F5F9', 
    paddingHorizontal: 12, 
    paddingVertical: 6, 
    borderRadius: 8 
  },
  periodText: { fontSize: 13, fontWeight: '700', color: '#64748B', marginRight: 4 },
  scrollContent: { padding: 20 },
  revenueCard: { 
    backgroundColor: '#1E293B', 
    padding: 24, 
    borderRadius: 24, 
    marginBottom: 24 
  },
  revenueLabel: { fontSize: 14, color: '#94A3B8', fontWeight: '600' },
  revenueValue: { fontSize: 32, fontWeight: '900', color: '#FFFFFF', marginVertical: 8 },
  growthBadge: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: 'rgba(16, 185, 129, 0.2)', 
    paddingHorizontal: 10, 
    paddingVertical: 4, 
    borderRadius: 8,
    alignSelf: 'flex-start'
  },
  growthText: { fontSize: 12, fontWeight: '800', color: '#10B981', marginLeft: 4 },
  sectionTitle: { fontSize: 16, fontWeight: '900', color: '#1E293B', marginBottom: 16, marginTop: 8 },
  chartPlaceholder: { 
    backgroundColor: '#FFFFFF', 
    borderRadius: 24, 
    padding: 20, 
    borderWidth: 1, 
    borderColor: '#E2E8F0', 
    marginBottom: 24 
  },
  chartHeader: { marginBottom: 20 },
  chartTitle: { fontSize: 14, fontWeight: '700', color: '#64748B' },
  barContainer: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'flex-end', 
    height: 160,
    paddingHorizontal: 10
  },
  barWrapper: { alignItems: 'center' },
  bar: { width: 12, backgroundColor: '#3B82F6', borderRadius: 6 },
  barLabel: { fontSize: 10, fontWeight: '700', color: '#94A3B8', marginTop: 8 },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 8 },
  metricCard: { 
    backgroundColor: '#FFFFFF', 
    width: '48%', 
    padding: 20, 
    borderRadius: 24, 
    borderWidth: 1, 
    borderColor: '#E2E8F0', 
    marginBottom: 16,
    alignItems: 'center'
  },
  metricValue: { fontSize: 18, fontWeight: '900', color: '#1E293B', marginVertical: 4 },
  metricLabel: { fontSize: 11, fontWeight: '700', color: '#64748B' },
  listCard: { 
    backgroundColor: '#FFFFFF', 
    borderRadius: 24, 
    borderWidth: 1, 
    borderColor: '#E2E8F0', 
    overflow: 'hidden',
    marginBottom: 20
  },
  listItem: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: 16, 
    borderBottomWidth: 1, 
    borderBottomColor: '#F1F5F9' 
  },
  locationName: { fontSize: 14, fontWeight: '700', color: '#1E293B' },
  locationRight: { flexDirection: 'row', alignItems: 'center' },
  locationCount: { fontSize: 14, fontWeight: '800', color: '#3B82F6' },
});
