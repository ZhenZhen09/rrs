import React, { useState, useCallback, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/Colors';
import { MaterialIcons } from '@expo/vector-icons';
import { scale, verticalScale, moderateScale, normalizeFontSize } from '@/utils/responsive';
import { api } from '@/utils/api';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'expo-router';
import { getLocalDateStr, formatDisplayDate } from '@/utils/dateUtils';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { SkeletonCard } from '@/components/ui/SkeletonCard';

interface DeliveryRequest {
  request_id: string;
  requester_name: string;
  delivery_date: string;
  time_window: string;
  pickup_location: { address: string };
  dropoff_location: { address: string };
  recipient_name: string;
  delivery_status: string;
  assigned_rider_id: string;
}

export default function TomorrowScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [tasks, setTasks] = useState<DeliveryRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchTasks = useCallback(async () => {
    try {
      const response = await api.get('/api/requests');
      const allRequests: DeliveryRequest[] = Array.isArray(response.data) ? response.data : response.data.data;
      
      // Calculate tomorrow's date string (matching your DB format)
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = getLocalDateStr(tomorrow);

      const riderTasks = allRequests.filter(req => 
        req.assigned_rider_id === user?.id && 
        getLocalDateStr(req.delivery_date) === tomorrowStr &&
        req.delivery_status !== 'completed' &&
        req.delivery_status !== 'cancelled' &&
        req.delivery_status !== 'failed'
      );
      
      setTasks(riderTasks);
    } catch (err) {
      console.error('Fetch tomorrow tasks error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchTasks();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Text style={styles.title}>Tomorrow&apos;s Jobs</Text>
        <Text style={styles.subtitle}>Scheduled for {formatDisplayDate(getLocalDateStr(new Date(Date.now() + 86400000)))}</Text>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {loading && !refreshing ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : tasks.length === 0 ? (
          <View style={styles.empty}>
            <MaterialIcons name="calendar-today" size={64} color="#E2E8F0" />
            <Text style={styles.emptyTitle}>No tasks tomorrow</Text>
            <Text style={styles.emptyText}>You&apos;re free to relax or check back later!</Text>
          </View>
        ) : (
          tasks.map(task => (
            <Card key={task.request_id} style={styles.card}>
              <TouchableOpacity activeOpacity={0.7} onPress={() => router.push(`/job/${task.request_id}`)}>
                <View style={styles.cardHeader}>
                  <View>
                    <Text style={styles.dateLabel}>ARRIVING AT</Text>
                    <Text style={styles.timeText}>{task?.time_window || 'Not set'}</Text>
                  </View>
                  <Badge label="TOMORROW" status="info" />
                </View>

                <View style={styles.divider} />

                <View style={styles.details}>
                  <View style={styles.locationRow}>
                    <MaterialIcons name="location-on" size={16} color="#3B82F6" />
                    <Text style={styles.address} numberOfLines={1}>{task?.dropoff_location?.address || 'Address unavailable'}</Text>
                  </View>
                  <View style={styles.recipientRow}>
                    <MaterialIcons name="person" size={16} color="#64748B" />
                    <Text style={styles.recipient}>{task?.recipient_name || 'No recipient'}</Text>
                  </View>
                </View>

                <View style={styles.footer}>
                  <Text style={styles.statusLabel}>STATUS: {(task?.delivery_status || 'UNKNOWN').toUpperCase()}</Text>
                  <View style={styles.action}>
                    <Text style={styles.actionText}>View Details</Text>
                    <MaterialIcons name="chevron-right" size={16} color="#3B82F6" />
                  </View>
                </View>
              </TouchableOpacity>
            </Card>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: scale(20),
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  title: {
    fontSize: normalizeFontSize(24),
    fontWeight: '800',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: normalizeFontSize(14),
    color: '#3B82F6',
    fontWeight: '600',
    marginTop: verticalScale(2),
  },
  scrollContent: {
    padding: scale(20),
    paddingBottom: verticalScale(40),
  },
  card: {
    marginBottom: verticalScale(16),
    padding: moderateScale(16),
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: verticalScale(12),
  },
  dateLabel: {
    fontSize: normalizeFontSize(10),
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.5,
  },
  timeText: {
    fontSize: normalizeFontSize(18),
    fontWeight: '800',
    color: '#0F172A',
    marginTop: verticalScale(2),
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: verticalScale(12),
  },
  details: {
    marginBottom: verticalScale(12),
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: verticalScale(6),
  },
  address: {
    fontSize: normalizeFontSize(14),
    color: '#475569',
    marginLeft: scale(8),
    flex: 1,
  },
  recipientRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recipient: {
    fontSize: normalizeFontSize(14),
    color: '#64748B',
    marginLeft: scale(8),
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: moderateScale(10),
    borderRadius: moderateScale(8),
  },
  statusLabel: {
    fontSize: normalizeFontSize(11),
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionText: {
    fontSize: normalizeFontSize(12),
    fontWeight: '700',
    color: '#3B82F6',
    marginRight: scale(4),
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: verticalScale(60),
  },
  emptyTitle: {
    fontSize: normalizeFontSize(18),
    fontWeight: '700',
    color: '#64748B',
    marginTop: verticalScale(16),
  },
  emptyText: {
    fontSize: normalizeFontSize(14),
    color: '#94A3B8',
    marginTop: verticalScale(4),
    textAlign: 'center',
  }
});
