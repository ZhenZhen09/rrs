import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { FleetPulseMap, FleetRider, FleetJob } from '../../components/UI/FleetPulseMap';
import { useRealTime } from '../../context/RealTimeContext';
import { useTheme } from '../../context/ThemeContext';
import api from '../../services/api';

export default function AdminDashboard() {
  const router = useRouter();
  const { riderLocations, lastRequestUpdate } = useRealTime();
  const { theme, mode, density, setMode, setDensity } = useTheme();
  const { COLORS, TYPOGRAPHY, RADIUS, SPACING } = theme;

  const [activeJobs, setActiveJobs] = useState<FleetJob[]>([]);
  const [stats, setStats] = useState({ pending: 0, active: 0 });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const res = await api.get('/requests?limit=1000');
        const jobsList = res.data?.data || [];
        
        setActiveJobs(jobsList.filter((j: any) => 
          j.status === 'approved' &&
          j.delivery_status !== 'completed' && 
          j.delivery_status !== 'failed' &&
          j.delivery_status !== 'disapproved'
        ));

        const pendingCount = jobsList.filter((r: any) => r.status === 'pending').length;
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
      case 'Live Map':
        router.push('/(tabs)/map');
        break;
      case 'Personnel':
        router.push('/(tabs)/personnel');
        break;
    }
  };

  const styles = React.useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: SPACING.xl,
      backgroundColor: COLORS.surface,
      borderBottomWidth: 1,
      borderBottomColor: COLORS.border,
    },
    welcomeText: { fontSize: TYPOGRAPHY.size.xl, fontFamily: TYPOGRAPHY.fontFamily.bold, color: COLORS.primary },
    dateText: { fontSize: TYPOGRAPHY.size.sm, fontFamily: TYPOGRAPHY.fontFamily.regular, color: COLORS.secondary, marginTop: 2 },
    profileButton: { padding: SPACING.sm },
    scrollContent: { padding: SPACING.xl },
    statsGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: SPACING.xl },
    statCard: {
      backgroundColor: COLORS.surface,
      width: '48%',
      padding: SPACING.xl,
      borderRadius: RADIUS.card,
      borderWidth: 1,
      borderColor: COLORS.border,
    },
    statIconContainer: { width: 44, height: 44, borderRadius: RADIUS.md, justifyContent: 'center', alignItems: 'center', marginBottom: SPACING.md },
    statValue: { fontSize: TYPOGRAPHY.size['3xl'], fontFamily: TYPOGRAPHY.fontFamily.monoMedium, color: COLORS.primary },
    statLabel: { fontSize: TYPOGRAPHY.size.xs, fontFamily: TYPOGRAPHY.fontFamily.bold, color: COLORS.secondary, marginTop: SPACING.xs },
    sectionTitle: { fontSize: TYPOGRAPHY.size.base, fontFamily: TYPOGRAPHY.fontFamily.bold, color: COLORS.foreground, marginBottom: SPACING.lg, marginTop: SPACING.sm },
    monitorCard: { 
      backgroundColor: COLORS.surface, 
      borderRadius: RADIUS.card, 
      padding: SPACING.xl, 
      borderWidth: 1, 
      borderColor: COLORS.border,
      marginBottom: SPACING.xl,
    },
    monitorRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.md },
    monitorLabel: { fontSize: TYPOGRAPHY.size.sm, fontFamily: TYPOGRAPHY.fontFamily.medium, color: COLORS.secondary },
    monitorValue: { fontSize: TYPOGRAPHY.size.sm, fontFamily: TYPOGRAPHY.fontFamily.monoMedium, color: COLORS.foreground },
    onlineBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ECFDF5', paddingHorizontal: 8, paddingVertical: 4, borderRadius: RADIUS.sm },
    onlineText: { fontSize: TYPOGRAPHY.size.xs, fontFamily: TYPOGRAPHY.fontFamily.bold, color: COLORS.success },
    pulseDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.success, marginRight: 6 },
    actionGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
    actionCard: {
      backgroundColor: COLORS.surface,
      width: '48%',
      padding: SPACING.xl,
      borderRadius: RADIUS.card,
      borderWidth: 1,
      borderColor: COLORS.border,
      marginBottom: SPACING.lg,
      alignItems: 'center',
    },
    actionIcon: { width: 48, height: 48, borderRadius: RADIUS.md, justifyContent: 'center', alignItems: 'center', marginBottom: SPACING.md },
    actionLabel: { fontSize: TYPOGRAPHY.size.sm, fontFamily: TYPOGRAPHY.fontFamily.bold, color: COLORS.foreground, marginBottom: SPACING.md, textAlign: 'center' },
    mapContainer: {
      backgroundColor: COLORS.surface,
      borderRadius: RADIUS.card,
      borderWidth: 1,
      borderColor: COLORS.border,
      marginBottom: SPACING.xl,
      overflow: 'hidden',
    },
    mapHeader: {
      padding: SPACING.lg,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: COLORS.surface,
      borderBottomWidth: 1,
      borderBottomColor: COLORS.background,
    },
    mapStatus: { flexDirection: 'row', alignItems: 'center' },
    liveIndicator: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: COLORS.accent,
      marginRight: 8,
    },
    mapTitle: { fontSize: TYPOGRAPHY.size.xs, fontFamily: TYPOGRAPHY.fontFamily.bold, color: COLORS.primary, letterSpacing: 1 },
    mapSubtitle: { fontSize: TYPOGRAPHY.size.xs, fontFamily: TYPOGRAPHY.fontFamily.regular, color: COLORS.secondary },
    mapWrapper: { height: 220, width: '100%', backgroundColor: COLORS.background },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: COLORS.surface, borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl, padding: SPACING.xl },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.xl },
    modalTitle: { fontSize: TYPOGRAPHY.size.xl, fontFamily: TYPOGRAPHY.fontFamily.bold, color: COLORS.primary },
    optionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.border },
    optionText: { fontSize: TYPOGRAPHY.size.base, fontFamily: TYPOGRAPHY.fontFamily.medium, color: COLORS.foreground },
    chipRow: { flexDirection: 'row', gap: 8, marginTop: SPACING.sm },
    chip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.background },
    chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
    chipText: { fontFamily: TYPOGRAPHY.fontFamily.bold, fontSize: 12, color: COLORS.secondary },
    chipTextActive: { color: '#FFF' },
  }), [theme]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.welcomeText}>System Overview</Text>
          <Text style={styles.dateText}>Admin Dashboard</Text>
        </View>
        <TouchableOpacity style={styles.profileButton} onPress={() => setIsSettingsOpen(true)}>
          <MaterialIcons name="settings" size={28} color={COLORS.primary} />
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
            <View style={[styles.statIconContainer, { backgroundColor: COLORS.danger + '20' }]}>
              <MaterialIcons name="pending-actions" size={24} color={COLORS.danger} />
            </View>
            <Text style={styles.statValue}>{stats.pending}</Text>
            <Text style={styles.statLabel}>Pending Requests</Text>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIconContainer, { backgroundColor: COLORS.primary + '20' }]}>
              <MaterialIcons name="local-shipping" size={24} color={COLORS.primary} />
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
            { name: 'Dispatch Center', icon: 'local-shipping', color: COLORS.accent },
            { name: 'Live Map', icon: 'map', color: COLORS.primary },
            { name: 'Personnel', icon: 'people', color: COLORS.secondary },
          ].map((action) => (
            <TouchableOpacity 
              key={action.name} 
              style={styles.actionCard} 
              onPress={() => handleActionPress(action.name)}
              activeOpacity={0.7}
            >
              <View style={[styles.actionIcon, { backgroundColor: action.color + '15' }]}>
                <MaterialIcons name={action.icon as any} size={24} color={action.color} />
              </View>
              <Text style={styles.actionLabel}>{action.name}</Text>
              <MaterialIcons name="arrow-forward" size={16} color={COLORS.muted} />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Settings Modal for Theme / Density */}
      <Modal visible={isSettingsOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>UI Settings</Text>
              <TouchableOpacity onPress={() => setIsSettingsOpen(false)}>
                <MaterialIcons name="close" size={24} color={COLORS.secondary} />
              </TouchableOpacity>
            </View>
            
            <View style={{ marginBottom: SPACING.xl }}>
              <Text style={styles.sectionTitle}>Theme</Text>
              <View style={styles.chipRow}>
                {['light', 'dark', 'system'].map((m) => (
                  <TouchableOpacity key={m} style={[styles.chip, mode === m && styles.chipActive]} onPress={() => setMode(m as any)}>
                    <Text style={[styles.chipText, mode === m && styles.chipTextActive]}>{m.toUpperCase()}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={{ marginBottom: SPACING.xl }}>
              <Text style={styles.sectionTitle}>Density</Text>
              <View style={styles.chipRow}>
                {['compact', 'default', 'relaxed'].map((d) => (
                  <TouchableOpacity key={d} style={[styles.chip, density === d && styles.chipActive]} onPress={() => setDensity(d as any)}>
                    <Text style={[styles.chipText, density === d && styles.chipTextActive]}>{d.toUpperCase()}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
