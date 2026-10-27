import React, { useEffect, useState, useMemo, useRef } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Platform, ScrollView, Animated, PanResponder, Dimensions, Alert, Linking, Modal, TextInput } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../../services/api';
import { useRealTimeStore } from '../../store/useRealTimeStore';
import { TrackingMap } from '../../components/Dispatch/TrackingMap';
import { TYPOGRAPHY } from '../../constants/Theme';
import { useTheme } from '../../context/ThemeContext';
import { Badge } from '../../components/UI/Badge';

const parseSafeDate = (dateStr: any) => {
  if (!dateStr) return null;
  if (dateStr instanceof Date) return dateStr;
  try {
    let formatted = String(dateStr).trim();
    if (formatted.includes(' ') && !formatted.includes('T')) {
      formatted = formatted.replace(' ', 'T');
    }
    if (!formatted.includes('+') && !formatted.includes('Z') && formatted.length >= 19) {
      formatted = formatted + 'Z';
    }
    const d = new Date(formatted);
    if (!isNaN(d.getTime())) {
      return d;
    }
  } catch (e) {}

  try {
    const parts = String(dateStr).match(/\d+/g);
    if (parts && parts.length >= 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const hour = parts[3] ? parseInt(parts[3], 10) : 0;
      const minute = parts[4] ? parseInt(parts[4], 10) : 0;
      const second = parts[5] ? parseInt(parts[5], 10) : 0;
      return new Date(Date.UTC(year, month, day, hour, minute, second));
    }
  } catch (e) {}
  return null;
};

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const COLLAPSED_HEIGHT = 160;
const EXPANDED_HEIGHT = SCREEN_HEIGHT * 0.85;
const MAX_TRANSLATE_Y = EXPANDED_HEIGHT - COLLAPSED_HEIGHT;

interface TrackingData {
  request: any;
  current_location?: any;
  history?: any[];
}

export default function JobTrackingScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { theme } = useTheme();
  const { COLORS } = theme;
  const riderLocations = useRealTimeStore((state) => state.riderLocations);
  const showToast = useRealTimeStore((state) => state.showToast);
  const [loading, setLoading] = useState(true);
  const [trackingData, setTrackingData] = useState<TrackingData | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [managementModalVisible, setManagementModalVisible] = useState(false);
  const [adminRemark, setAdminRemark] = useState('');
  const [managementAction, setManagementAction] = useState<'return' | 'cancel' | null>(null);

  // Advanced Animation State
  const translateY = useRef(new Animated.Value(0)).current;
  const lastOffset = useRef(0);
  const [isExpanded, setIsExpanded] = useState(true);

  // Native Formatter for Date
  const formatTimestamp = (dateStr: string) => {
    const date = parseSafeDate(dateStr);
    if (!date) return '';
    try {
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        hour12: true
      }).format(date);
    } catch (e) {
      return '';
    }
  };

  const animateTo = (dest: number) => {
    Animated.spring(translateY, {
      toValue: dest,
      useNativeDriver: true,
      tension: 40,
      friction: 8
    }).start(() => {
      lastOffset.current = dest;
      setIsExpanded(dest === 0);
    });
  };

  const handleStatusUpdate = async (status: 'completed' | 'failed') => {
    Alert.alert(
      `${status === 'completed' ? 'Complete' : 'Fail'} Job?`,
      `Are you sure you want to manually mark this job as ${status.toUpperCase()}? This action is permanent.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          style: status === 'failed' ? 'destructive' : 'default',
          onPress: async () => {
            setIsSubmitting(true);
            try {
              await api.put(`/requests/${id}/status`, {
                status,
                remark: `Manually ${status} by Admin via Mobile`
              });
              showToast(
                status === 'failed'
                  ? 'Transaction marked as failed by the admin.'
                  : 'Transaction marked as complete by the admin.',
                'success'
              );
              router.back();
            } catch (err) {
              console.error('Status update failed:', err);
              showToast('Failed to update status', 'error');
            } finally {
              setIsSubmitting(false);
            }
          }
        }
      ]
    );
  };

  const handleCall = (number: string) => {
    if (!number) return;
    Linking.openURL(`tel:${number}`);
  };

  const handleManagementSubmit = async () => {
    if (!managementAction || !adminRemark.trim()) return;

    setIsSubmitting(true);
    try {
      const endpoint = managementAction === 'return' ? 'return' : 'cancel';
      await api.put(`/requests/${id}/${endpoint}`, {
        admin_remark: adminRemark
      });

      showToast(
        `Job #${String(id).slice(-6).toUpperCase()} ${managementAction === 'return' ? 'returned' : 'cancelled'}`,
        'success'
      );
      setManagementModalVisible(false);
      setAdminRemark('');
      router.back();
    } catch (err) {
      console.error('Management action failed:', err);
      showToast('Action failed. Please try again.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openManagementModal = (action: 'return' | 'cancel') => {
    setManagementAction(action);
    setManagementModalVisible(true);
  };

  // PAN RESPONDER: Professional Drag-to-Slide
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) =>
        Math.abs(gestureState.dy) > Math.abs(gestureState.dx) && Math.abs(gestureState.dy) > 8,
      onPanResponderGrant: () => {
        translateY.stopAnimation((value) => {
          lastOffset.current = Math.max(0, Math.min(MAX_TRANSLATE_Y, value));
        });
      },
      onPanResponderTerminationRequest: () => true,
      onPanResponderMove: (_, gestureState) => {
        let newVal = lastOffset.current + gestureState.dy;
        // Resistance at boundaries
        if (newVal < 0) newVal = newVal * 0.2;
        if (newVal > MAX_TRANSLATE_Y) newVal = MAX_TRANSLATE_Y + (newVal - MAX_TRANSLATE_Y) * 0.2;
        translateY.setValue(newVal);
      },
      onPanResponderRelease: (_, gestureState) => {
        const finalValue = lastOffset.current + gestureState.dy;
        const velocity = gestureState.vy;
        let dest = 0;
        if (finalValue > MAX_TRANSLATE_Y / 2 || velocity > 0.5) {
          dest = MAX_TRANSLATE_Y;
        }
        animateTo(dest);
      },
      onPanResponderTerminate: () => {
        animateTo(lastOffset.current > MAX_TRANSLATE_Y / 2 ? MAX_TRANSLATE_Y : 0);
      },
    })
  ).current;

  useEffect(() => {
    const fetchTracking = async () => {
      try {
        const response = await api.get(`/requests/${id}/tracking`);
        setTrackingData(response.data);
      } catch (error) {
        console.error('Error fetching tracking data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTracking();
  }, [id]);

  const job = trackingData?.request;
  const isTerminal = useMemo(() => {
    if (!job) return false;
    const dStatus = job.delivery_status || '';
    const status = job.status || '';
    return ['completed', 'failed', 'disapproved', 'cancelled'].includes(dStatus) ||
           ['disapproved', 'cancelled'].includes(status);
  }, [job]);

  const assignedRiderId = job?.assigned_rider_id;
  const liveRiderLocation = assignedRiderId ? riderLocations.get(assignedRiderId) : null;

  const mapRiderLocation = useMemo(() => {
    if (liveRiderLocation) {
      return {
        latitude: liveRiderLocation.lat,
        longitude: liveRiderLocation.lng,
        heading: liveRiderLocation.heading
      };
    }
    if (trackingData?.current_location) {
      return {
        latitude: Number(trackingData.current_location.lat),
        longitude: Number(trackingData.current_location.lng),
        heading: Number(trackingData.current_location.heading || 0)
      };
    }
    if (job?.pickup_location?.lat) {
      return {
        latitude: Number(job.pickup_location.lat),
        longitude: Number(job.pickup_location.lng),
        heading: 0
      };
    }
    return null;
  }, [liveRiderLocation, trackingData, job]);

  const mapHistory = useMemo(() => {
    if (!trackingData?.history) return [];
    return trackingData.history.map(h => ({
      latitude: Number(h.lat),
      longitude: Number(h.lng)
    }));
  }, [trackingData?.history]);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center" style={{ backgroundColor: COLORS.background }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!job) {
    return (
      <View className="flex-1 items-center justify-center" style={{ backgroundColor: COLORS.background }}>
        <Text style={{ color: COLORS.primary }}>Job not found</Text>
      </View>
    );
  }

  const InfoRow = ({ icon, label, value, color = COLORS.secondary, subValue, onPress }: any) => (
    <TouchableOpacity
      className="mb-5 flex-row items-start gap-3"
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={0.7}
    >
      <View className="h-8 w-8 items-center justify-center rounded-full" style={{ backgroundColor: COLORS.background }}>
        <MaterialIcons name={icon} size={16} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text className="text-[9px] font-bold uppercase tracking-wide" style={{ color: COLORS.muted, fontFamily: TYPOGRAPHY.fontFamily.bold }}>{label}</Text>
        <Text className="mt-px text-sm font-bold" style={{ color: onPress ? COLORS.accentBlue : COLORS.primary, fontFamily: TYPOGRAPHY.fontFamily.bold, textDecorationLine: onPress ? 'underline' : 'none' }}>
          {value || 'N/A'}
        </Text>
        {subValue && <Text className="mt-0.5 text-[11px] italic" style={{ color: COLORS.secondary, fontFamily: TYPOGRAPHY.fontFamily.medium }}>{subValue}</Text>}
      </View>
      {onPress && <MaterialIcons name="chevron-right" size={20} color={COLORS.border} />}
    </TouchableOpacity>
  );

  return (
    <View className="flex-1" style={{ backgroundColor: COLORS.background }}>
      <Stack.Screen options={{ headerShown: false }} />

      <View className="flex-1">
        <TrackingMap
          pickup={{
            latitude: Number(job.pickup_location?.lat || 0),
            longitude: Number(job.pickup_location?.lng || 0)
          }}
          dropoff={{
            latitude: Number(job.dropoff_location?.lat || 0),
            longitude: Number(job.dropoff_location?.lng || 0)
          }}
          riderLocation={mapRiderLocation}
          history={mapHistory}
          status={job.delivery_status}
        />
      </View>

      <SafeAreaView className="absolute left-0 right-0 top-0 z-10 flex-row items-center justify-between p-5" pointerEvents="box-none">
        <TouchableOpacity className="h-12 w-12 items-center justify-center rounded-full shadow-lg" style={{ backgroundColor: COLORS.surface, elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8 }} onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Go back">
          <MaterialIcons name="arrow-back" size={24} color={COLORS.primary} />
        </TouchableOpacity>
        <View className="h-10 flex-row items-center rounded-full px-4 shadow-lg" style={{ backgroundColor: COLORS.surface, elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8 }}>
          <View className="mr-2 h-2 w-2 rounded-full" style={{
            backgroundColor: job.delivery_status === 'completed'
              ? '#10B981'
              : (['failed', 'cancelled', 'disapproved'].includes(job.delivery_status || job.status)
                ? '#EF4444'
                : (job.delivery_status === 'in_progress' ? '#0EA5E9' : '#F59E0B'))
          }} />
          <Text className="text-[10px] font-bold tracking-widest" style={{ color: COLORS.primary, fontFamily: TYPOGRAPHY.fontFamily.bold }}>{isTerminal ? 'DELIVERY SUMMARY' : 'LIVE TRACKING'}</Text>
        </View>
      </SafeAreaView>

      <Animated.View
        className="absolute bottom-0 left-0 right-0 z-[100] rounded-t-[32px]"
        style={{ backgroundColor: COLORS.surface, paddingBottom: Platform.OS === 'ios' ? 40 : 24, elevation: 30, shadowColor: '#000', shadowOffset: { width: 0, height: -10 }, shadowOpacity: 0.15, shadowRadius: 20, height: EXPANDED_HEIGHT, transform: [{ translateY }] }}
      >
        <View className="w-full px-6 pt-3 pb-4">
          <View
            {...panResponder.panHandlers}
            className="mb-4 h-11 w-full items-center justify-center"
            hitSlop={{ top: 8, bottom: 8, left: 24, right: 24 }}
          >
            <View className="h-1 w-10 rounded-full" style={{ backgroundColor: COLORS.border }} />
          </View>

          <View className="flex-row items-start justify-between">
            <View style={{ flex: 1 }}>
              <Text className="text-[10px] font-bold tracking-wide" style={{ color: COLORS.muted, fontFamily: TYPOGRAPHY.fontFamily.bold }}>DESTINATION NAME</Text>
              <Text className="mt-0.5 text-2xl font-bold" style={{ color: COLORS.primary, fontFamily: TYPOGRAPHY.fontFamily.bold }} numberOfLines={1}>
                {job.dropoff_location?.businessName || 'Residential/Generic'}
              </Text>
              <Text className="mt-2 text-[10px] font-bold tracking-wide" style={{ color: COLORS.muted, fontFamily: TYPOGRAPHY.fontFamily.bold }}>RECIPIENT NAME</Text>
              <Text className="mt-0.5 text-sm font-bold" style={{ color: COLORS.secondary, fontFamily: TYPOGRAPHY.fontFamily.bold }} numberOfLines={1}>
                {job.recipient_name || 'N/A'}
              </Text>
            </View>
            <View className="ml-4 items-end" style={{ flex: 1, marginLeft: 16 }}>
              <Text className="text-[10px] font-bold tracking-wide" style={{ color: COLORS.muted, fontFamily: TYPOGRAPHY.fontFamily.bold }}>ASSIGNED RIDER</Text>
              <View className="mt-0.5 flex-row items-center">
                <MaterialIcons name="two-wheeler" size={16} color={COLORS.primary} />
                <Text className="ml-1 text-right text-base font-bold" style={{ color: COLORS.primary, fontFamily: TYPOGRAPHY.fontFamily.bold, marginLeft: 4 }} numberOfLines={1}>
                  {job.assigned_rider_name || 'Assigning...'}
                </Text>
              </View>
              <Badge
                label={(job.delivery_status === 'in_progress' ? 'ON ROUTE' : (job.delivery_status || job.status || 'PENDING')).toUpperCase()}
                style={{ alignSelf: 'flex-end', marginTop: 4 }}
                status={
                  job.delivery_status === 'completed' ? 'success' :
                  ['failed', 'cancelled', 'disapproved'].includes(job.delivery_status || job.status) ? 'danger' :
                  job.delivery_status === 'in_progress' ? 'info' : 'warning'
                }
              />
            </View>
          </View>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          className="flex-1"
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}
          nestedScrollEnabled
          keyboardShouldPersistTaps="handled"
          overScrollMode="never"
          scrollEnabled
        >
          <View className="mt-2">
            {job.is_overdue && !isTerminal && (
              <View className="mb-4 flex-row items-start rounded-2xl border p-4" style={{ backgroundColor: '#FFF1F2', borderColor: '#FECDD3' }}>
                <MaterialIcons name="warning" size={20} color="#BE123C" />
                <View className="ml-3 flex-1">
                  <Text className="text-[10px] font-bold tracking-wide" style={{ color: '#9F1239', fontFamily: TYPOGRAPHY.fontFamily.bold }}>OVERDUE · {job.overdue_label || 'NEEDS ATTENTION'}</Text>
                  <Text className="mt-1 text-xs" style={{ color: '#881337', fontFamily: TYPOGRAPHY.fontFamily.medium }}>Next step: {(job.recommended_action || 'contact rider').replace('_', ' ')}</Text>
                </View>
              </View>
            )}

            <InfoRow
              icon="place"
              label="DESTINATION ADDRESS"
              value={job.dropoff_location?.address}
              color="#EF4444"
              subValue={job.dropoff_location?.landmarks ? `Landmark: ${job.dropoff_location.landmarks}` : null}
            />

            <View className="flex-row gap-2.5">
              <View style={{ flex: 1 }}>
                <InfoRow icon="category" label="REQUEST TYPE" value={job.request_type} color={COLORS.accentBlue} />
              </View>
              <View style={{ flex: 1 }}>
                <InfoRow
                  icon="priority-high"
                  label="PRIORITY"
                  value={job.urgency_level}
                  color={job.urgency_level === 'Urgent' ? '#B91C1C' : '#F59E0B'}
                />
              </View>
            </View>

            <InfoRow icon="person" label="REQUESTER NAME" value={job.requester_name} />

            <View className="flex-row gap-2.5">
              <View style={{ flex: 1 }}>
                <InfoRow
                  icon="phone"
                  label="RECIP. CONTACT"
                  value={job.recipient_contact}
                  color="#10B981"
                  onPress={() => handleCall(job.recipient_contact)}
                />
              </View>
              <View style={{ flex: 1 }}>
                <InfoRow
                  icon="contact-phone"
                  label="REQ. CONTACT"
                  value={job.requester_contact || 'N/A'}
                  color="#6366F1"
                  onPress={() => handleCall(job.requester_contact)}
                />
              </View>
            </View>

            <InfoRow
              icon="description"
              label="PERSONNEL NOTE"
              value={job.personnel_instructions}
              color="#64748B"
            />

            <View className="mb-5 rounded-2xl border-l-4 p-4" style={{ backgroundColor: COLORS.background, borderLeftColor: COLORS.primary }}>
              <View className="mb-1.5 flex-row items-center gap-1.5">
                <MaterialIcons name="security" size={14} color="#0F172A" />
                <Text className="text-[9px] font-bold tracking-wide" style={{ color: COLORS.primary, fontFamily: TYPOGRAPHY.fontFamily.bold }}>ADMIN DISPATCH NOTE</Text>
              </View>
              <Text className="text-[13px] leading-[18px]" style={{ color: COLORS.secondary, fontFamily: TYPOGRAPHY.fontFamily.medium }}>{job.admin_remark || 'No specific admin instructions provided.'}</Text>
            </View>

            {isTerminal && (
              <View className="mb-6 rounded-2xl border p-5" style={{ backgroundColor: COLORS.background, borderColor: COLORS.border }}>
                <View className="mb-3 flex-row items-center gap-2">
                  <MaterialIcons
                    name={job.delivery_status === 'completed' ? 'check-circle' : 'error'}
                    size={20}
                    color={job.delivery_status === 'completed' ? '#10B981' : '#EF4444'}
                  />
                  <Text className="text-base font-bold tracking-widest" style={{ color: job.delivery_status === 'completed' ? '#10B981' : '#EF4444', fontFamily: TYPOGRAPHY.fontFamily.bold }}>
                    DELIVERY {job.delivery_status?.toUpperCase() || job.status?.toUpperCase()}
                  </Text>
                </View>

                <View className="mb-4 flex-row items-center gap-2">
                  <MaterialIcons name="access-time" size={16} color={COLORS.muted} />
                  <Text className="text-[13px]" style={{ color: COLORS.secondary, fontFamily: TYPOGRAPHY.fontFamily.medium }}>
                    Finished at: <Text style={{ fontFamily: TYPOGRAPHY.fontFamily.bold, color: COLORS.primary }}>{formatTimestamp(job.completed_at || job.updated_at)}</Text>
                  </Text>
                </View>

                <View className="my-3.5 h-px" style={{ backgroundColor: COLORS.border }} />

                <Text className="mb-1.5 text-[10px] font-bold tracking-wide" style={{ color: COLORS.muted, fontFamily: TYPOGRAPHY.fontFamily.bold }}>RIDER REMARKS / FEEDBACK</Text>
                <Text className="text-sm leading-5" style={{ color: job.rider_remark ? COLORS.primary : COLORS.muted, fontFamily: TYPOGRAPHY.fontFamily.medium, fontStyle: job.rider_remark ? 'normal' : 'italic' }}>
                  {job.rider_remark || 'No delivery remarks provided by the rider.'}
                </Text>

                {job.admin_remark && (
                  <>
                    <View className="my-3.5 h-px" style={{ backgroundColor: COLORS.border }} />
                    <Text className="mb-1.5 text-[10px] font-bold tracking-wide" style={{ color: COLORS.muted, fontFamily: TYPOGRAPHY.fontFamily.bold }}>ADMIN REMARKS / REASON</Text>
                    <Text className="text-sm leading-5" style={{ color: COLORS.primary, fontFamily: TYPOGRAPHY.fontFamily.medium }}>
                      {job.admin_remark}
                    </Text>
                  </>
                )}
              </View>
            )}

            {!isTerminal && (
              <View className="mt-2 gap-3">
                {(job.status === 'pending' || job.status === 'submitted_waiting' || job.delivery_status === 'pending' || job.delivery_status === 'submitted_waiting') && (
                  <>
                    <TouchableOpacity
                      className="h-14 flex-row items-center justify-center gap-2.5 rounded-2xl shadow-sm" style={{ backgroundColor: '#F59E0B', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8 }}
                      onPress={() => openManagementModal('return')}
                      disabled={isSubmitting}
                    >
                      <MaterialIcons name="assignment-return" size={20} color="#FFFFFF" />
                      <Text className="text-[13px] font-bold tracking-widest" style={{ color: COLORS.onPrimary, fontFamily: TYPOGRAPHY.fontFamily.bold }}>RETURN FOR REVISION</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      className="h-14 flex-row items-center justify-center gap-2.5 rounded-2xl shadow-sm" style={{ backgroundColor: COLORS.danger, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8 }}
                      onPress={() => openManagementModal('cancel')}
                      disabled={isSubmitting}
                    >
                      <MaterialIcons name="cancel" size={20} color="#FFFFFF" />
                      <Text className="text-[13px] font-bold tracking-widest" style={{ color: COLORS.onPrimary, fontFamily: TYPOGRAPHY.fontFamily.bold }}>CANCEL REQUEST</Text>
                    </TouchableOpacity>
                  </>
                )}

                <TouchableOpacity
                  className="h-14 flex-row items-center justify-center gap-2.5 rounded-2xl shadow-sm" style={{ backgroundColor: COLORS.success, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8 }}
                  onPress={() => handleStatusUpdate('completed')}
                  disabled={isSubmitting}
                >
                  <MaterialIcons name="check-circle" size={20} color="#FFFFFF" />
                  <Text className="text-[13px] font-bold tracking-widest" style={{ color: COLORS.onPrimary, fontFamily: TYPOGRAPHY.fontFamily.bold }}>COMPLETE DELIVERY</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  className="h-14 flex-row items-center justify-center gap-2.5 rounded-2xl shadow-sm" style={{ backgroundColor: COLORS.danger, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8 }}
                  onPress={() => handleStatusUpdate('failed')}
                  disabled={isSubmitting}
                >
                  <MaterialIcons name="error" size={20} color="#FFFFFF" />
                  <Text className="text-[13px] font-bold tracking-widest" style={{ color: COLORS.onPrimary, fontFamily: TYPOGRAPHY.fontFamily.bold }}>MARK AS FAILED</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </ScrollView>
      </Animated.View>

      <Modal
        animationType="slide"
        transparent={true}
        visible={managementModalVisible}
        onRequestClose={() => setManagementModalVisible(false)}
      >
        <View className="flex-1 items-center justify-center bg-black/50 p-5">
          <View className="w-full rounded-3xl p-6 shadow-xl" style={{ backgroundColor: COLORS.surface, elevation: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20 }}>
            <Text className="mb-2 text-xl font-bold" style={{ color: COLORS.primary, fontFamily: TYPOGRAPHY.fontFamily.bold }}>
              {managementAction === 'return' ? 'Return for Revision' : 'Cancel Request'}
            </Text>
            <Text className="mb-4 text-sm" style={{ color: COLORS.secondary, fontFamily: TYPOGRAPHY.fontFamily.medium }}>Please provide a reason/remark for this action:</Text>

            <TextInput
              className="mb-5 h-[100px] rounded-xl p-3 text-sm" style={{ backgroundColor: COLORS.background, color: COLORS.primary, fontFamily: TYPOGRAPHY.fontFamily.medium, textAlignVertical: 'top' }}
              placeholder="Enter remark here..."
              multiline
              numberOfLines={4}
              value={adminRemark}
              onChangeText={setAdminRemark}
            />

            <View className="flex-row gap-3">
              <TouchableOpacity
                className="h-12 flex-1 items-center justify-center rounded-xl" style={{ backgroundColor: COLORS.border }}
                onPress={() => {
                  setManagementModalVisible(false);
                  setAdminRemark('');
                }}
              >
                <Text className="text-[13px] font-bold tracking-wide" style={{ color: COLORS.primary, fontFamily: TYPOGRAPHY.fontFamily.bold }}>CANCEL</Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="h-12 flex-1 items-center justify-center rounded-xl" style={{ backgroundColor: managementAction === 'cancel' ? '#EF4444' : COLORS.primary }}
                onPress={handleManagementSubmit}
                disabled={isSubmitting || !adminRemark.trim()}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text className="text-[13px] font-bold tracking-wide text-white" style={{ fontFamily: TYPOGRAPHY.fontFamily.bold }}>CONFIRM</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {isSubmitting && (
        <View className="absolute inset-0 z-[1000] items-center justify-center bg-black/40">
          <ActivityIndicator size="large" color={COLORS.onPrimary} />
        </View>
      )}
    </View>
  );
}
