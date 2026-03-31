import React, { useState, useCallback, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, FlatList, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThemeColor } from '@/hooks/use-theme-color';
import { Colors } from '@/constants/Colors';
import { MaterialIcons } from '@expo/vector-icons';
import { scale, verticalScale, moderateScale, normalizeFontSize } from '@/utils/responsive';
import { api } from '@/utils/api';
import { useAuth } from '@/context/AuthContext';
import { formatDisplayDate } from '@/utils/dateUtils';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { SkeletonCard } from '@/components/ui/SkeletonCard';

interface DeliveryRequest {
  request_id: string;
  requester_name: string;
  delivery_date: string;
  time_window: string;
  pickup_location: {
    lat: number;
    lng: number;
    address: string;
  };
  dropoff_location: {
    lat: number;
    lng: number;
    address: string;
  };
  recipient_name: string;
  status: string;
  delivery_status: string;
  assigned_rider_id: string;
}

export default function HistoryScreen() {
  const { user } = useAuth();
  const isDark = useThemeColor({ light: '', dark: '' }, 'background') === Colors.dark.background;
  const themeColors = isDark ? Colors.dark : Colors.light;

  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [tasks, setTasks] = useState<DeliveryRequest[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const isLoadingRef = useRef(false);

  const PAGE_LIMIT = 4; // Using a smaller limit to make the lazy loading clearly visible

  const fetchTasks = useCallback(async (pageNumber: number, isRefreshing = false) => {
    if (!user?.id || isLoadingRef.current) return;
    
    try {
      isLoadingRef.current = true;
      if (isRefreshing) {
        setRefreshing(true);
      } else if (pageNumber > 1) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      const response = await api.get('/api/requests', {
        params: {
          rider_id: user.id,
          delivery_status: 'completed,delivered,failed,cancelled',
          page: pageNumber,
          limit: PAGE_LIMIT
        }
      });

      const data = Array.isArray(response.data) ? response.data : response.data.data;
      const meta = response.data.meta || { totalPages: 1 };
      
      if (isRefreshing || pageNumber === 1) {
        setTasks(data);
      } else {
        setTasks(prev => {
          // Prevent duplicates just in case
          const existingIds = new Set(prev.map(item => item.request_id));
          const newUniqueTasks = data.filter((item: DeliveryRequest) => !existingIds.has(item.request_id));
          return [...prev, ...newUniqueTasks];
        });
      }

      setHasMore(pageNumber < meta.totalPages);
      setPage(pageNumber);
    } catch (err) {
      console.error('Fetch history tasks error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
      isLoadingRef.current = false;
    }
  }, [user]);

  useEffect(() => {
    fetchTasks(1);
  }, [fetchTasks]);

  const onRefresh = useCallback(() => {
    fetchTasks(1, true);
  }, [fetchTasks]);

  const handleLoadMore = () => {
    if (!isLoadingRef.current && hasMore) {
      fetchTasks(page + 1);
    }
  };

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color="#0F172A" />
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: '#F8FAFC' }]} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Text style={styles.title}>Job History</Text>
      </View>

      {loading && tasks.length === 0 ? (
        <View style={styles.list}>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </View>
      ) : (
        <FlatList
          data={tasks}
          keyExtractor={(item) => item.request_id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={renderFooter}
          ListEmptyComponent={
            !loading ? (
              <View style={styles.empty}>
                <MaterialIcons name="history" size={64} color="#CBD5E1" />
                <Text style={styles.emptyText}>You haven&apos;t completed any tasks yet.</Text>

              </View>
            ) : null
          }
          renderItem={({ item }) => (
            <Card style={styles.card}>
              <View style={styles.cardHeader}>
                <View>
                  <Text style={styles.idLabel}>REQ #</Text>
                  <Text style={styles.idValue}>{item.request_id}</Text>
                </View>
                <Badge 
                  label={item.delivery_status.toUpperCase()} 
                  status={(item.delivery_status === 'completed' || item.delivery_status === 'delivered') ? 'success' : 'danger'} 
                />
              </View>

              <View style={styles.divider} />

              <View style={styles.detailsContainer}>
                <View style={styles.dateTimeRow}>
                  <MaterialIcons name="event" size={14} color="#64748B" />
                  <Text style={styles.date}>{formatDisplayDate(item.delivery_date)}</Text>
                </View>

                <View style={styles.addressRow}>
                  <View style={styles.addressIconColumn}>
                    <View style={styles.dot} />
                    <View style={styles.line} />
                    <View style={[styles.dot, { backgroundColor: '#10B981' }]} />
                  </View>
                  <View style={styles.addressTextColumn}>
                    <Text style={styles.address} numberOfLines={1}>{item.pickup_location.address}</Text>
                    <Text style={[styles.address, { marginTop: verticalScale(4) }]} numberOfLines={1}>{item.dropoff_location.address}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.footer}>
                <View style={styles.recipientContainer}>
                  <MaterialIcons name="person" size={12} color="#94A3B8" />
                  <Text style={styles.recipient}>{item.recipient_name}</Text>
                </View>
              </View>
            </Card>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: scale(20),
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  title: {
    fontSize: normalizeFontSize(20),
    fontWeight: '800',
    color: '#0F172A',
  },
  list: {
    padding: scale(16),
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    marginBottom: verticalScale(16),
    padding: scale(16),
    backgroundColor: '#FFFFFF',
    borderRadius: moderateScale(12),
    // Subtle shadow for better card definition
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: verticalScale(12),
  },
  idLabel: {
    fontSize: normalizeFontSize(10),
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  idValue: {
    fontSize: normalizeFontSize(15),
    fontWeight: '800',
    color: '#0F172A', // Deep dark blue/black for high visibility
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginBottom: verticalScale(12),
  },
  detailsContainer: {
    marginBottom: verticalScale(12),
  },
  dateTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: verticalScale(12),
    gap: 6,
  },
  date: {
    fontSize: normalizeFontSize(13),
    fontWeight: '600',
    color: '#64748B',
  },
  addressRow: {
    flexDirection: 'row',
  },
  addressIconColumn: {
    alignItems: 'center',
    width: scale(20),
    marginRight: scale(8),
    paddingVertical: verticalScale(4),
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#CBD5E1',
  },
  line: {
    width: 1,
    flex: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 2,
  },
  addressTextColumn: {
    flex: 1,
  },
  address: {
    fontSize: normalizeFontSize(13),
    color: '#475569',
    fontWeight: '500',
  },
  footer: {
    marginTop: verticalScale(8),
    paddingTop: verticalScale(8),
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
  },
  recipientContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  recipient: {
    fontSize: normalizeFontSize(12),
    fontWeight: '600',
    color: '#64748B',
  },
  empty: {
    marginTop: verticalScale(100),
    alignItems: 'center',
  },
  emptyText: {
    marginTop: 16,
    color: '#64748B',
    fontSize: normalizeFontSize(14),
  },
  footerLoader: {
    paddingVertical: verticalScale(20),
    alignItems: 'center',
  }
});
