import React, { useEffect, useState, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Platform, ScrollView, Animated, PanResponder, Dimensions, Alert, Linking, Modal, TextInput } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { MaterialIcons, Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../../services/api';
import { useRealTime } from '../../context/RealTimeContext';
import { TrackingMap } from '../../components/Dispatch/TrackingMap';
import { COLORS, TYPOGRAPHY } from '../../constants/Theme';
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
  const { riderLocations, showToast } = useRealTime();
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

  const toggleExpand = () => {
    const toValue = isExpanded ? MAX_TRANSLATE_Y : 0;
    animateTo(toValue);
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
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dy) > 5,
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
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!job) {
    return (
      <View style={styles.center}>
        <Text>Job not found</Text>
      </View>
    );
  }

  const InfoRow = ({ icon, label, value, color = COLORS.secondary, subValue, onPress }: any) => (
    <TouchableOpacity 
      style={styles.infoRow} 
      onPress={onPress} 
      disabled={!onPress}
      activeOpacity={0.7}
    >
      <View style={styles.iconCircle}>
        <MaterialIcons name={icon} size={16} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={[styles.infoValue, onPress && { color: COLORS.accentBlue, textDecorationLine: 'underline' }]}>
          {value || 'N/A'}
        </Text>
        {subValue && <Text style={styles.infoSubValue}>{subValue}</Text>}
      </View>
      {onPress && <MaterialIcons name="chevron-right" size={20} color={COLORS.border} />}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      
      <View style={styles.mapContainer}>
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

      <SafeAreaView style={styles.header} pointerEvents="box-none">
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color={COLORS.primary} />
        </TouchableOpacity>
        <View style={styles.headerBadge}>
          <View style={[styles.pulseDot, { 
            backgroundColor: job.delivery_status === 'completed' 
              ? '#10B981' 
              : (['failed', 'cancelled', 'disapproved'].includes(job.delivery_status || job.status)
                ? '#EF4444' 
                : (job.delivery_status === 'in_progress' ? '#0EA5E9' : '#F59E0B')) 
          }]} />
          <Text style={styles.liveText}>{isTerminal ? 'DELIVERY SUMMARY' : 'LIVE TRACKING'}</Text>
        </View>
      </SafeAreaView>

      <Animated.View 
        style={[
          styles.bottomCard, 
          { transform: [{ translateY }] }
        ]}
        {...panResponder.panHandlers}
      >
        <TouchableOpacity 
          style={styles.clickableHeader} 
          onPress={toggleExpand} 
          activeOpacity={0.8}
        >
          <View style={styles.handle} />
          
          <View style={styles.cardHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.customerLabel}>RECIPIENT NAME</Text>
              <Text style={styles.customerName} numberOfLines={1}>{job.recipient_name}</Text>
            </View>
            <Badge 
              label={(job.delivery_status === 'in_progress' ? 'ON ROUTE' : (job.delivery_status || job.status || 'PENDING')).toUpperCase()} 
              status={
                job.delivery_status === 'completed' ? 'success' :
                ['failed', 'cancelled', 'disapproved'].includes(job.delivery_status || job.status) ? 'danger' :
                job.delivery_status === 'in_progress' ? 'info' : 'warning'
              } 
            />
          </View>
        </TouchableOpacity>

        <ScrollView 
          showsVerticalScrollIndicator={false} 
          style={styles.drawerContent}
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}
          scrollEnabled={isExpanded}
        >
          <View style={styles.detailsGrid}>
            <InfoRow 
              icon="business" 
              label="DESTINATION NAME" 
              value={job.dropoff_location?.businessName || 'Residential/Generic'} 
              color={COLORS.primary}
            />
            <InfoRow 
              icon="place" 
              label="DESTINATION ADDRESS" 
              value={job.dropoff_location?.address} 
              color="#EF4444"
              subValue={job.dropoff_location?.landmarks ? `Landmark: ${job.dropoff_location.landmarks}` : null}
            />
            
            <View style={styles.row}>
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
            
            <View style={styles.row}>
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
            
            <View style={styles.adminNoteCard}>
              <View style={styles.adminNoteHeader}>
                <MaterialIcons name="security" size={14} color="#0F172A" />
                <Text style={styles.adminNoteTitle}>ADMIN DISPATCH NOTE</Text>
              </View>
              <Text style={styles.adminNoteText}>{job.admin_remark || 'No specific admin instructions provided.'}</Text>
            </View>

            {job.assigned_rider_id ? (
              <View style={styles.riderCard}>
                <View style={styles.riderAvatar}>
                  <Ionicons name="bicycle" size={20} color="#FFFFFF" />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.riderLabel}>ASSIGNED RIDER</Text>
                  <Text style={styles.riderName}>{job.assigned_rider_name}</Text>
                </View>
                <Text style={styles.timestamp}>
                  {formatTimestamp(job.updated_at)}
                </Text>
              </View>
            ) : !isTerminal ? (
              <View style={styles.riderCard}>
                <View style={styles.riderAvatar}>
                  <Ionicons name="bicycle" size={20} color="#FFFFFF" />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.riderLabel}>ASSIGNED RIDER</Text>
                  <Text style={styles.riderName}>Assigning...</Text>
                </View>
                <Text style={styles.timestamp}>
                  {formatTimestamp(job.updated_at)}
                </Text>
              </View>
            ) : null}

            {isTerminal && (
              <View style={styles.deliveryDetailsCard}>
                <View style={styles.deliveryDetailsHeader}>
                  <MaterialIcons 
                    name={job.delivery_status === 'completed' ? 'check-circle' : 'error'} 
                    size={20} 
                    color={job.delivery_status === 'completed' ? '#10B981' : '#EF4444'} 
                  />
                  <Text style={[
                    styles.deliveryDetailsTitle, 
                    { color: job.delivery_status === 'completed' ? '#10B981' : '#EF4444' }
                  ]}>
                    DELIVERY {job.delivery_status?.toUpperCase() || job.status?.toUpperCase()}
                  </Text>
                </View>

                <View style={styles.deliveryInfoRow}>
                  <MaterialIcons name="access-time" size={16} color={COLORS.muted} />
                  <Text style={styles.deliveryTimeText}>
                    Finished at: <Text style={{ fontFamily: TYPOGRAPHY.fontFamily.bold, color: COLORS.primary }}>{formatTimestamp(job.completed_at || job.updated_at)}</Text>
                  </Text>
                </View>

                <View style={styles.remarkSeparator} />

                <Text style={styles.remarkLabel}>RIDER REMARKS / FEEDBACK</Text>
                <Text style={[styles.remarkText, !job.rider_remark && { fontStyle: 'italic', color: COLORS.muted }]}>
                  {job.rider_remark || 'No delivery remarks provided by the rider.'}
                </Text>

                {job.admin_remark && (
                  <>
                    <View style={styles.remarkSeparator} />
                    <Text style={styles.remarkLabel}>ADMIN REMARKS / REASON</Text>
                    <Text style={styles.remarkText}>
                      {job.admin_remark}
                    </Text>
                  </>
                )}
              </View>
            )}

            {!isTerminal && (
              <View style={styles.actionBar}>
                {(job.delivery_status === 'pending' || job.delivery_status === 'submitted_waiting') && (
                  <>
                    <TouchableOpacity 
                      style={[styles.actionButton, { backgroundColor: '#F59E0B' }]} 
                      onPress={() => openManagementModal('return')}
                      disabled={isSubmitting}
                    >
                      <MaterialIcons name="assignment-return" size={20} color="#FFFFFF" />
                      <Text style={styles.actionText}>RETURN FOR REVISION</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={[styles.actionButton, styles.failedButton]} 
                      onPress={() => openManagementModal('cancel')}
                      disabled={isSubmitting}
                    >
                      <MaterialIcons name="cancel" size={20} color="#FFFFFF" />
                      <Text style={styles.actionText}>CANCEL REQUEST</Text>
                    </TouchableOpacity>
                  </>
                )}

                <TouchableOpacity 
                  style={[styles.actionButton, styles.completeButton]} 
                  onPress={() => handleStatusUpdate('completed')}
                  disabled={isSubmitting}
                >
                  <MaterialIcons name="check-circle" size={20} color="#FFFFFF" />
                  <Text style={styles.actionText}>COMPLETE DELIVERY</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.actionButton, styles.failedButton]} 
                  onPress={() => handleStatusUpdate('failed')}
                  disabled={isSubmitting}
                >
                  <MaterialIcons name="error" size={20} color="#FFFFFF" />
                  <Text style={styles.actionText}>MARK AS FAILED</Text>
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
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {managementAction === 'return' ? 'Return for Revision' : 'Cancel Request'}
            </Text>
            <Text style={styles.modalSubtitle}>Please provide a reason/remark for this action:</Text>
            
            <TextInput
              style={styles.remarkInput}
              placeholder="Enter remark here..."
              multiline
              numberOfLines={4}
              value={adminRemark}
              onChangeText={setAdminRemark}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]} 
                onPress={() => {
                  setManagementModalVisible(false);
                  setAdminRemark('');
                }}
              >
                <Text style={styles.modalButtonText}>CANCEL</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalButton, styles.confirmButton, managementAction === 'cancel' && { backgroundColor: '#EF4444' }]} 
                onPress={handleManagementSubmit}
                disabled={isSubmitting || !adminRemark.trim()}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={[styles.modalButtonText, { color: '#FFFFFF' }]}>CONFIRM</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {isSubmitting && (
        <View style={styles.overlay}>
          <ActivityIndicator size="large" color={COLORS.onPrimary} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  mapContainer: { flex: 1 },
  header: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', padding: 20, zIndex: 10 },
  backButton: { width: 48, height: 48, borderRadius: 24, backgroundColor: COLORS.surface, justifyContent: 'center', alignItems: 'center', elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8 },
  headerBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, paddingHorizontal: 16, height: 40, borderRadius: 20, elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8 },
  pulseDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  liveText: { fontSize: 10, fontFamily: TYPOGRAPHY.fontFamily.bold, color: COLORS.primary, letterSpacing: 1 },
  bottomCard: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: COLORS.surface, borderTopLeftRadius: 32, borderTopRightRadius: 32, paddingBottom: Platform.OS === 'ios' ? 40 : 24, elevation: 30, shadowColor: '#000', shadowOffset: { width: 0, height: -10 }, shadowOpacity: 0.15, shadowRadius: 20, height: EXPANDED_HEIGHT, zIndex: 100 },
  clickableHeader: { width: '100%', paddingHorizontal: 24, paddingTop: 12, paddingBottom: 16 },
  handle: { width: 40, height: 4, backgroundColor: COLORS.border, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  customerLabel: { fontSize: 10, fontFamily: TYPOGRAPHY.fontFamily.bold, color: COLORS.muted, letterSpacing: 0.5 },
  customerName: { fontSize: 24, fontFamily: TYPOGRAPHY.fontFamily.bold, color: COLORS.primary, marginTop: 2 },
  drawerContent: { flex: 1 },
  detailsGrid: { marginTop: 10 },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 20, gap: 12 },
  iconCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center' },
  infoLabel: { fontSize: 9, fontFamily: TYPOGRAPHY.fontFamily.bold, color: COLORS.muted, textTransform: 'uppercase', letterSpacing: 0.5 },
  infoValue: { fontSize: 14, fontFamily: TYPOGRAPHY.fontFamily.bold, color: COLORS.primary, marginTop: 1 },
  infoSubValue: { fontSize: 11, fontFamily: TYPOGRAPHY.fontFamily.medium, color: COLORS.secondary, marginTop: 2, fontStyle: 'italic' },
  row: { flexDirection: 'row', gap: 10 },
  adminNoteCard: { backgroundColor: COLORS.background, padding: 16, borderRadius: 16, borderLeftWidth: 4, borderLeftColor: COLORS.primary, marginBottom: 20 },
  adminNoteHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  adminNoteTitle: { fontSize: 9, fontFamily: TYPOGRAPHY.fontFamily.bold, color: COLORS.primary, letterSpacing: 0.5 },
  adminNoteText: { fontSize: 13, fontFamily: TYPOGRAPHY.fontFamily.medium, color: COLORS.secondary, lineHeight: 18 },
  riderCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.primary, padding: 16, borderRadius: 20, marginBottom: 24 },
  riderAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
  riderLabel: { fontSize: 9, fontFamily: TYPOGRAPHY.fontFamily.bold, color: 'rgba(255,255,255,0.5)', letterSpacing: 0.5 },
  riderName: { fontSize: 15, fontFamily: TYPOGRAPHY.fontFamily.bold, color: COLORS.onPrimary, marginTop: 1 },
  timestamp: { fontSize: 10, fontFamily: TYPOGRAPHY.fontFamily.bold, color: 'rgba(255,255,255,0.4)', position: 'absolute', right: 16, bottom: 16 },
  actionBar: { gap: 12, marginTop: 10 },
  actionButton: { height: 56, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8 },
  completeButton: { backgroundColor: COLORS.success },
  failedButton: { backgroundColor: COLORS.danger },
  actionText: { color: COLORS.onPrimary, fontSize: 13, fontFamily: TYPOGRAPHY.fontFamily.bold, letterSpacing: 1 },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
  
  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: COLORS.surface, borderRadius: 24, padding: 24, width: '100%', elevation: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20 },
  modalTitle: { fontSize: 20, fontFamily: TYPOGRAPHY.fontFamily.bold, color: COLORS.primary, marginBottom: 8 },
  modalSubtitle: { fontSize: 14, fontFamily: TYPOGRAPHY.fontFamily.medium, color: COLORS.secondary, marginBottom: 16 },
  remarkInput: { backgroundColor: COLORS.background, borderRadius: 12, padding: 12, height: 100, textAlignVertical: 'top', fontSize: 14, fontFamily: TYPOGRAPHY.fontFamily.medium, color: COLORS.primary, marginBottom: 20 },
  modalButtons: { flexDirection: 'row', gap: 12 },
  modalButton: { flex: 1, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  cancelButton: { backgroundColor: COLORS.border },
  confirmButton: { backgroundColor: COLORS.primary },
  modalButtonText: { fontSize: 13, fontFamily: TYPOGRAPHY.fontFamily.bold, color: COLORS.primary, letterSpacing: 0.5 },
  
  deliveryDetailsCard: {
    backgroundColor: COLORS.background,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 24,
  },
  deliveryDetailsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  deliveryDetailsTitle: {
    fontSize: 16,
    fontFamily: TYPOGRAPHY.fontFamily.bold,
    letterSpacing: 1,
  },
  deliveryInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  deliveryTimeText: {
    fontSize: 13,
    color: COLORS.secondary,
    fontFamily: TYPOGRAPHY.fontFamily.medium,
  },
  remarkSeparator: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 14,
  },
  remarkLabel: {
    fontSize: 10,
    fontFamily: TYPOGRAPHY.fontFamily.bold,
    color: COLORS.muted,
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  remarkText: {
    fontSize: 14,
    fontFamily: TYPOGRAPHY.fontFamily.medium,
    color: COLORS.primary,
    lineHeight: 20,
  }
});
