import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { FleetPulseMap, FleetRider, FleetJob } from '../../components/UI/FleetPulseMap';
import { useRealTime } from '../../context/RealTimeContext';
import api from '../../services/api';

export default function AdminDashboard() {
  const router = useRouter();
  const { riderLocations, lastRequestUpdate } = useRealTime();
  const [activeJobs, setActiveJobs] = useState<FleetJob[]>([]);
  const [stats, setStats] = useState({ pending: 0, active: 0 });

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const res = await api.get('/requests?limit=1000');
        const jobsList = res.data?.data || [];
        
        // Filter jobs for the Live Fleet Map (only approved & active ones)
        setActiveJobs(jobsList.filter((j: any) => 
          j.status === 'approved' &&
          j.delivery_status !== 'completed' && 
          j.delivery_status !== 'failed' &&
          j.delivery_status !== 'disapproved'
        ));

        // Dynamically compute counts to perfectly sync with the web admin:
        // pending: status === 'pending'
        const pendingCount = jobsList.filter((r: any) => r.status === 'pending').length;
        
        // active: status === 'approved' and not completed/failed/disapproved
        const activeCount = jobsList.filter((r: any) => 
          r.status === 'approved' && 
          !['completed', 'failed', 'disapproved'].includes(r.delivery_status || '')
        ).length;

        setStats({
          pending: pendingCount,
          active: activeCount
        });
      } catch (err) {
        console.error('Failed to fetch jobs for dashboard', err);
      }
    };
    fetchJobs();
  }, [lastRequestUpdate]);

  const fleetRiders: FleetRider[] = Array.from(riderLocations.entries()).map(([id, loc]) => ({
    id,
    lat: loc.lat,
    lng: loc.lng,
    heading: loc.heading || 0,
    name: loc.name || 'Rider'
  }));

  const handleActionPress = (action: string) => {
    switch (action) {
      case 'Dispatch Center':
        router.push('/(tabs)/dispatch');
        break;
      case 'Schedule Calendar':
        router.push('/(tabs)/calendar');
        break;
      case 'Analytics':
        router.push('/(tabs)/analytics');
        break;
      case 'System Logs':
        router.push('/(tabs)/logs');
        break;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.welcomeText}>System Overview</Text>
          <Text style={styles.dateText}>Admin Dashboard</Text>
        </View>
        <TouchableOpacity style={styles.profileButton}>
          <MaterialIcons name="account-circle" size={32} color="#1E293B" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Real-time Fleet Map */}
        <View style={styles.mapContainer}>
          <View style={styles.mapHeader}>
            <View style={styles.mapStatus}>
              <View style={styles.liveIndicator} />
              <Text style={styles.mapTitle}>LIVE FLEET PULSE</Text>
            </View>
            <Text style={styles.mapSubtitle}>{fleetRiders.length} Riders Active</Text>
          </View>
          <View style={styles.mapWrapper}>
            <FleetPulseMap 
              riders={fleetRiders}
              activeJobs={activeJobs}
            />
          </View>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <View style={[styles.statIconContainer, { backgroundColor: '#FEE2E2' }]}>
              <MaterialIcons name="pending-actions" size={24} color="#EF4444" />
            </View>
            <Text style={styles.statValue}>{stats.pending}</Text>
            <Text style={styles.statLabel}>Pending Requests</Text>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIconContainer, { backgroundColor: '#DBEAFE' }]}>
              <MaterialIcons name="local-shipping" size={24} color="#3B82F6" />
            </View>
            <Text style={styles.statValue}>{stats.active}</Text>
            <Text style={styles.statLabel}>Active Deliveries</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>System Monitoring</Text>
        <View style={styles.monitorCard}>
          <View style={styles.monitorRow}>
            <Text style={styles.monitorLabel}>System Health</Text>
            <View style={styles.onlineBadge}>
              <View style={styles.pulseDot} />
              <Text style={styles.onlineText}>Stable</Text>
            </View>
          </View>
          <View style={styles.monitorRow}>
            <Text style={styles.monitorLabel}>Avg. Response Time</Text>
            <Text style={styles.monitorValue}>1.4s</Text>
          </View>
          <View style={styles.monitorRow}>
            <Text style={styles.monitorLabel}>Active Sessions</Text>
            <Text style={styles.monitorValue}>24</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionGrid}>
          {[
            { name: 'Dispatch Center', icon: 'settings-input-component', color: '#1E293B', isFontAwesome: false },
            { name: 'Schedule Calendar', icon: 'calendar-today', color: '#3B82F6', isFontAwesome: false },
            { name: 'Analytics', icon: 'bar-chart', color: '#10B981', isFontAwesome: false },
            { name: 'System Logs', icon: 'list-alt', color: '#6366F1', isFontAwesome: false },
          ].map((action) => (
            <TouchableOpacity 
              key={action.name} 
              style={styles.actionCard} 
              onPress={() => handleActionPress(action.name)}
            >
              <View style={[styles.actionIcon, { backgroundColor: action.color + '15' }]}>
                {action.isFontAwesome ? (
                  <FontAwesome5 name={action.icon as any} size={20} color={action.color} />
                ) : (
                  <MaterialIcons name={action.icon as any} size={24} color={action.color} />
                )}
              </View>
              <Text style={styles.actionLabel}>{action.name}</Text>
              <MaterialIcons name="arrow-forward" size={16} color="#94A3B8" />
            </TouchableOpacity>
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
    borderBottomColor: '#E2E8F0',
  },
  welcomeText: { fontSize: 20, fontWeight: '800', color: '#1E293B' },
  dateText: { fontSize: 14, color: '#64748B', marginTop: 2 },
  profileButton: { padding: 4 },
  scrollContent: { padding: 24 },
  statsGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  statCard: {
    backgroundColor: '#FFFFFF',
    width: '48%',
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10 },
      android: { elevation: 2 },
    }),
  },
  statIconContainer: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  statValue: { fontSize: 28, fontWeight: '900', color: '#1E293B' },
  statLabel: { fontSize: 12, color: '#64748B', fontWeight: '700', marginTop: 4 },
  sectionTitle: { fontSize: 16, fontWeight: '900', color: '#1E293B', marginBottom: 16, marginTop: 8 },
  monitorCard: { 
    backgroundColor: '#FFFFFF', 
    borderRadius: 24, 
    padding: 20, 
    borderWidth: 1, 
    borderColor: '#E2E8F0',
    marginBottom: 24,
  },
  monitorRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  monitorLabel: { fontSize: 14, color: '#64748B', fontWeight: '600' },
  monitorValue: { fontSize: 14, fontWeight: '800', color: '#1E293B' },
  onlineBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ECFDF5', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  onlineText: { fontSize: 12, fontWeight: '800', color: '#10B981' },
  pulseDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981', marginRight: 6 },
  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  actionCard: {
    backgroundColor: '#FFFFFF',
    width: '48%',
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
    alignItems: 'center',
  },
  actionIcon: { width: 48, height: 48, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  actionLabel: { fontSize: 13, fontWeight: '800', color: '#1E293B', marginBottom: 8, textAlign: 'center' },
  mapContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 24,
    overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20 },
      android: { elevation: 4 },
    }),
  },
  mapHeader: {
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  mapStatus: { flexDirection: 'row', alignItems: 'center' },
  liveIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3B82F6',
    marginRight: 8,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
  },
  mapTitle: { fontSize: 10, fontWeight: '900', color: '#1E293B', letterSpacing: 1 },
  mapSubtitle: { fontSize: 10, fontWeight: '700', color: '#94A3B8' },
  mapWrapper: { height: 220, width: '100%', backgroundColor: '#F8FAFC' },
});
