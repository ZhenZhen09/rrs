import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ActivityIndicator, Modal, TextInput, KeyboardAvoidingView, ScrollView, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons, Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { scale, verticalScale, moderateScale, normalizeFontSize } from '@/utils/responsive';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { formatDisplayDate } from '@/utils/dateUtils';
import { useJobDetails } from '@/hooks/data/useJobDetails';
import { Platform } from 'react-native';

export default function JobDetailsScreen() {
  const {
    job,
    loading,
    updating,
    statusModalVisible,
    setStatusModalVisible,
    statusType,
    selectedReason,
    setSelectedReason,
    customRemark,
    setCustomRemark,
    COMPLETED_REASONS,
    FAILED_REASONS,
    handleUpdateStatus,
    handleSubmitStatus,
    openInNativeMaps,
    callRecipient,
    callPickupContact,
    router,
    syncStatus,
  } = useJobDetails();

  const getSyncBannerColor = (status: string) => {
    switch (status) {
      case 'pending': return '#3B82F6'; // blue
      case 'verifying': return '#8B5CF6'; // purple
      case 'sync_pending': return '#F59E0B'; // amber
      case 'sync_error': return '#EF4444'; // red
      default: return '#64748B';
    }
  };

  const getSyncMessage = (status: string) => {
    switch (status) {
      case 'pending': return 'Updating status...';
      case 'verifying': return 'Verifying with server...';
      case 'sync_pending': return 'Offline. Syncing when connection returns...';
      case 'sync_error': return 'Sync failed. Tap to retry.';
      default: return '';
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0F172A" />
        <Text style={styles.loadingText}>Synchronizing Job Data...</Text>
      </View>
    );
  }

  if (!job) {
    return (
      <View style={styles.center}>
        <MaterialIcons name="error-outline" size={64} color="#EF4444" />
        <Text style={styles.errorText}>Job not found</Text>
        <Button title="Go Back" onPress={() => router.back()} style={styles.backBtn} />
      </View>
    );
  }
  
  const getStatusVariant = (status: string): any => {
    switch (status) {
      case 'assigned': return 'info';
      case 'in_progress': return 'warning';
      case 'completed': return 'success';
      case 'failed': return 'danger';
      default: return 'default';
    }
  };

  const isNextStopPickup = job?.delivery_status === 'assigned';
  const nextLocation = isNextStopPickup ? job?.pickup_location : job?.dropoff_location;

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      {syncStatus !== 'synced' && (
        <View style={[styles.syncBanner, { backgroundColor: getSyncBannerColor(syncStatus) }]}>
          {syncStatus !== 'sync_error' && (
            <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: scale(8) }} />
          )}
          <Text style={styles.syncText}>{getSyncMessage(syncStatus)}</Text>
        </View>
      )}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back-ios" size={20} color="#0F172A" />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerId}>#{job?.request_id ? job.request_id.slice(-6).toUpperCase() : 'UNKNOWN'}</Text>
          <Badge 
            label={(job?.delivery_status || 'UNKNOWN').toUpperCase()} 
            status={getStatusVariant(job?.delivery_status || 'default') as any} 
          />
        </View>
        <View style={styles.headerRight} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* Task Instructions - Combined Admin Remark & Personnel Instructions */}
        {(job?.admin_remark || job?.personnel_instructions) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>TASK INSTRUCTIONS</Text>
            <View style={styles.remarkContainer}>
              <MaterialIcons name="info-outline" size={20} color="#3B82F6" style={{ marginTop: 2 }} />
              <View style={{ flex: 1, marginLeft: scale(12) }}>
                {job?.admin_remark && (
                  <View style={{ marginBottom: job?.personnel_instructions ? 8 : 0 }}>
                    <Text style={{ fontWeight: '800', color: '#1E40AF', fontSize: normalizeFontSize(12), marginBottom: 2 }}>ADMIN REMARK:</Text>
                    <Text style={[styles.remarkText, { marginLeft: 0 }]}>{job.admin_remark}</Text>
                  </View>
                )}
                {job?.personnel_instructions && (
                  <View>
                    <Text style={{ fontWeight: '800', color: '#1E40AF', fontSize: normalizeFontSize(12), marginBottom: 2 }}>PERSONNEL INSTRUCTIONS:</Text>
                    <Text style={[styles.remarkText, { marginLeft: 0 }]}>{job.personnel_instructions}</Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        )}

        {/* Navigation Action Card */}
        {['assigned', 'in_progress'].includes(job?.delivery_status || '') && nextLocation && (
          <Card style={styles.navCard}>
            <View style={styles.navHeader}>
              <View style={styles.navIconContainer}>
                <FontAwesome5 name="route" size={20} color="#FFFFFF" />
              </View>
              <View style={styles.navTextContainer}>
                <Text style={styles.navLabel}>NEXT DESTINATION</Text>
                <Text style={styles.navTarget}>{isNextStopPickup ? 'Pickup Point' : 'Recipient Address'}</Text>
              </View>
            </View>
            <TouchableOpacity 
              style={styles.navButton}
              onPress={() => {
                if (nextLocation?.lat && nextLocation?.lng) {
                  openInNativeMaps(nextLocation.lat, nextLocation.lng, isNextStopPickup ? 'Pickup' : 'Drop-off');
                }
              }}
            >
              <MaterialIcons name="directions" size={22} color="#FFFFFF" />
              <Text style={styles.navButtonText}>OPEN IN GOOGLE MAPS</Text>
            </TouchableOpacity>
          </Card>
        )}

        {/* Route Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>DELIVERY ROUTE</Text>
          <Card style={styles.routeCard}>
            <View style={styles.timeline}>
              <View style={styles.timelineLeft}>
                <View style={[styles.dot, { backgroundColor: '#10B981' }]} />
                <View style={styles.line} />
                <View style={[styles.dot, { backgroundColor: '#EF4444' }]} />
              </View>
              <View style={styles.timelineRight}>
                <View style={styles.locationContainer}>
                  <Text style={styles.locationType}>PICKUP FROM</Text>
                  <Text style={styles.addressTextBold}>{job?.pickup_location?.address || 'Address unavailable'}</Text>
                  {(job?.pickup_location?.businessName || job?.pickup_location?.landmarks) && (
                    <Text style={styles.locationSubText}>
                      {job.pickup_location.businessName || 'N/A'} • {job.pickup_location.landmarks || 'None'}
                    </Text>
                  )}
                </View>
                <View style={[styles.locationContainer, { marginBottom: 0 }]}>
                  <Text style={styles.locationType}>DELIVER TO</Text>
                  <Text style={styles.addressTextBold}>{job?.dropoff_location?.address || 'Address unavailable'}</Text>
                  {(job?.dropoff_location?.businessName || job?.dropoff_location?.landmarks) && (
                    <Text style={styles.locationSubText}>
                      {job.dropoff_location.businessName || 'N/A'} • {job.dropoff_location.landmarks || 'None'}
                    </Text>
                  )}
                </View>
              </View>
            </View>
          </Card>
        </View>

        {/* Requester & On Behalf Of */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>REQUESTER INFORMATION</Text>
          <Card style={styles.recipientCard}>
            <View style={styles.recipientRow}>
              <View style={[styles.avatar, { backgroundColor: '#F1F5F9' }]}>
                <MaterialIcons name="person" size={28} color="#64748B" />
              </View>
              <View style={styles.recipientInfo}>
                <Text style={styles.recipientName}>{job?.requester_name || 'Anonymous'}</Text>
                <Text style={styles.recipientDept}>{job?.requester_department || 'No Department'}</Text>
                {job?.on_behalf_of && (
                  <View style={styles.onBehalfBadge}>
                    <Text style={styles.onBehalfText}>ON BEHALF OF: {job.on_behalf_of.toUpperCase()}</Text>
                  </View>
                )}
              </View>
            </View>
          </Card>
        </View>

        {/* Pickup Contact Card */}
        {(job?.pickup_contact_name || job?.pickup_contact_mobile) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>PICKUP CONTACT (ORIGIN)</Text>
            <Card style={styles.recipientCard}>
              <View style={styles.recipientRow}>
                <View style={[styles.avatar, { backgroundColor: '#ECFDF5' }]}>
                  <MaterialIcons name="person-pin" size={28} color="#10B981" />
                </View>
                <View style={styles.recipientInfo}>
                  <Text style={styles.recipientName}>{job?.pickup_contact_name || 'Pickup Personnel'}</Text>
                  <Text style={styles.recipientDept}>Origin Contact Person</Text>
                  <Text style={styles.recipientContact}>{job?.pickup_contact_mobile || 'No contact provided'}</Text>
                </View>
                {job?.pickup_contact_mobile && (
                  <TouchableOpacity style={[styles.callButton, { backgroundColor: '#F0FDF4' }]} onPress={callPickupContact}>
                    <Ionicons name="call" size={20} color="#10B981" />
                  </TouchableOpacity>
                )}
              </View>
            </Card>
          </View>
        )}

        {/* Recipient Card */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>RECIPIENT INFORMATION (DESTINATION)</Text>
          <Card style={styles.recipientCard}>
            <View style={styles.recipientRow}>
              <View style={[styles.avatar, { backgroundColor: '#EFF6FF' }]}>
                <Text style={[styles.avatarText, { color: '#3B82F6' }]}>{(job?.recipient_name || 'R').charAt(0)}</Text>
              </View>
              <View style={styles.recipientInfo}>
                <Text style={styles.recipientName}>{job?.recipient_name || 'No Name'}</Text>
                <Text style={styles.recipientDept}>Target Recipient</Text>
                <Text style={styles.recipientContact}>{job?.recipient_contact || 'No contact provided'}</Text>
              </View>
              {job?.recipient_contact && (
                <TouchableOpacity style={styles.callButton} onPress={callRecipient}>
                  <Ionicons name="call" size={20} color="#3B82F6" />
                </TouchableOpacity>
              )}
            </View>
          </Card>
        </View>

        {/* Additional Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>JOB CLASSIFICATION</Text>
          <Card style={styles.infoCard}>
            <View style={styles.infoRow}>
              <MaterialIcons name="category" size={18} color="#64748B" />
              <Text style={styles.infoLabel}>Request Type:</Text>
              <Text style={styles.infoValue}>{job?.request_type || 'General'}</Text>
            </View>
            <View style={styles.infoRow}>
              <MaterialIcons name="calendar-today" size={18} color="#64748B" />
              <Text style={styles.infoLabel}>Scheduled Date:</Text>
              <Text style={styles.infoValue}>{job?.delivery_date ? formatDisplayDate(job.delivery_date) : 'Not set'}</Text>
            </View>
            <View style={styles.infoRow}>
              <MaterialIcons name="access-time" size={18} color="#64748B" />
              <Text style={styles.infoLabel}>Time Window:</Text>
              <Text style={styles.infoValue}>{job?.time_window || 'Not set'}</Text>
            </View>
            <View style={styles.infoRow}>
              <MaterialIcons name="priority-high" size={18} color="#64748B" />
              <Text style={styles.infoLabel}>Urgency Level:</Text>
              <Text style={[styles.infoValue, { color: (job?.urgency_level?.toLowerCase() === 'high' || job?.urgency_level?.toLowerCase() === 'urgent') ? '#EF4444' : '#0F172A' }]}>
                {(job?.urgency_level || 'NORMAL').toUpperCase()}
              </Text>
            </View>
          </Card>
        </View>

      </ScrollView>

      {/* Footer Action Buttons */}
      <View style={styles.footer}>
        {updating ? (
          <ActivityIndicator size="small" color="#0F172A" />
        ) : (
          <>
            {job?.delivery_status === 'assigned' && (
              <Button 
                title="START DELIVERY" 
                onPress={() => handleUpdateStatus('in_progress')} 
                style={styles.mainActionBtn}
              />
            )}
            
            {job?.delivery_status === 'in_progress' && (
              <View style={styles.btnRow}>
                <TouchableOpacity 
                  style={[styles.actionBtn, { backgroundColor: '#10B981' }]}
                  onPress={() => handleUpdateStatus('completed')}
                >
                  <MaterialIcons name="check-circle" size={22} color="white" />
                  <Text style={styles.actionBtnText}>Complete</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.actionBtn, { backgroundColor: '#EF4444' }]}
                  onPress={() => handleUpdateStatus('failed')}
                >
                  <MaterialIcons name="report-problem" size={22} color="white" />
                  <Text style={styles.actionBtnText}>Mark Failed</Text>
                </TouchableOpacity>
              </View>
            )}

            {(['completed', 'failed', 'cancelled'].includes(job?.delivery_status || '')) && (
              <Button 
                title="BACK TO DASHBOARD" 
                onPress={() => router.back()} 
                style={styles.secondaryActionBtn}
              />
            )}
          </>
        )}
      </View>

      {/* Status Update Modal */}
      <Modal
        visible={statusModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setStatusModalVisible(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {statusType === 'completed' ? 'Completion Report' : 'Failure Report'}
              </Text>
              <TouchableOpacity onPress={() => setStatusModalVisible(false)}>
                <MaterialIcons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.modalSubtitle}>Please provide an outcome reason:</Text>
            
            <ScrollView style={styles.reasonsList}>
              {(statusType === 'completed' ? COMPLETED_REASONS : FAILED_REASONS).map((reason, idx) => (
                <TouchableOpacity 
                  key={idx} 
                  style={[
                    styles.reasonChip, 
                    selectedReason === reason && styles.reasonChipSelected
                  ]}
                  onPress={() => setSelectedReason(reason)}
                >
                  <Text style={[
                    styles.reasonText,
                    selectedReason === reason && styles.reasonTextSelected
                  ]}>{reason}</Text>
                  {selectedReason === reason && (
                    <MaterialIcons name="check-circle" size={18} color="#3B82F6" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.customRemarkContainer}>
              <Text style={styles.modalSubtitle}>Additional Remarks (Optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="Type any additional details here..."
                value={customRemark}
                onChangeText={setCustomRemark}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            <Button 
              title={statusType === 'completed' ? "SUBMIT COMPLETION" : "SUBMIT FAILURE REPORT"}
              onPress={handleSubmitStatus}
              style={[
                styles.submitModalBtn, 
                statusType === 'completed' ? { backgroundColor: '#10B981' } : { backgroundColor: '#EF4444' }
              ] as ViewStyle}
              disabled={updating}
            />
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  syncBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: verticalScale(10),
    paddingHorizontal: scale(20),
  },
  syncText: {
    color: '#FFFFFF',
    fontSize: normalizeFontSize(12),
    fontWeight: '700',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: scale(20),
  },
  loadingText: {
    marginTop: verticalScale(16),
    fontSize: normalizeFontSize(14),
    color: '#64748B',
    fontWeight: '600',
  },
  errorText: {
    fontSize: normalizeFontSize(18),
    fontWeight: '700',
    color: '#0F172A',
    marginTop: verticalScale(16),
    marginBottom: verticalScale(24),
  },
  backBtn: {
    width: scale(140),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(20),
    paddingVertical: verticalScale(16),
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  backButton: {
    padding: moderateScale(8),
    borderRadius: moderateScale(12),
    backgroundColor: '#F1F5F9',
  },
  headerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerId: {
    fontSize: normalizeFontSize(16),
    fontWeight: '800',
    color: '#0F172A',
    marginRight: scale(12),
  },
  headerRight: {
    width: scale(40),
  },
  scrollContent: {
    padding: scale(20),
    paddingBottom: verticalScale(40),
  },
  navCard: {
    backgroundColor: '#0F172A',
    borderRadius: moderateScale(24),
    padding: moderateScale(24),
    marginBottom: verticalScale(24),
  },
  navHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: verticalScale(20),
  },
  navIconContainer: {
    width: moderateScale(44),
    height: moderateScale(44),
    borderRadius: moderateScale(14),
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  navTextContainer: {
    marginLeft: scale(16),
  },
  navLabel: {
    fontSize: normalizeFontSize(10),
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.6)',
    letterSpacing: 1,
  },
  navTarget: {
    fontSize: normalizeFontSize(18),
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: verticalScale(2),
  },
  navButton: {
    backgroundColor: '#3B82F6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: verticalScale(16),
    borderRadius: moderateScale(16),
  },
  navButtonText: {
    color: '#FFFFFF',
    fontSize: normalizeFontSize(14),
    fontWeight: '700',
    marginLeft: scale(10),
    letterSpacing: 0.5,
  },
  section: {
    marginBottom: verticalScale(24),
  },
  sectionTitle: {
    fontSize: normalizeFontSize(12),
    fontWeight: '800',
    color: '#64748B',
    marginBottom: verticalScale(12),
    letterSpacing: 1,
  },
  routeCard: {
    padding: moderateScale(20),
    borderRadius: moderateScale(24),
  },
  timeline: {
    flexDirection: 'row',
  },
  timelineLeft: {
    alignItems: 'center',
    width: scale(20),
  },
  dot: {
    width: moderateScale(12),
    height: moderateScale(12),
    borderRadius: moderateScale(6),
  },
  line: {
    width: 2,
    flex: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: verticalScale(4),
  },
  timelineRight: {
    flex: 1,
    marginLeft: scale(16),
  },
  locationContainer: {
    marginBottom: verticalScale(20),
  },
  locationType: {
    fontSize: normalizeFontSize(10),
    fontWeight: '700',
    color: '#94A3B8',
    marginBottom: verticalScale(4),
  },
  addressText: {
    fontSize: normalizeFontSize(14),
    color: '#475569',
    lineHeight: normalizeFontSize(20),
  },
  addressTextBold: {
    fontSize: normalizeFontSize(15),
    fontWeight: '700',
    color: '#0F172A',
    lineHeight: normalizeFontSize(22),
  },
  locationSubText: {
    fontSize: normalizeFontSize(12),
    color: '#64748B',
    marginTop: verticalScale(4),
    fontStyle: 'italic',
  },
  recipientCard: {
    padding: moderateScale(20),
    borderRadius: moderateScale(24),
  },
  recipientRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  onBehalfBadge: {
    marginTop: verticalScale(8),
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(4),
    backgroundColor: '#F1F5F9',
    borderRadius: moderateScale(8),
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  onBehalfText: {
    fontSize: normalizeFontSize(10),
    fontWeight: '800',
    color: '#475569',
    letterSpacing: 0.5,
  },
  avatar: {
    width: moderateScale(56),
    height: moderateScale(56),
    borderRadius: moderateScale(28),
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: normalizeFontSize(24),
    fontWeight: '700',
    color: '#475569',
  },
  recipientInfo: {
    flex: 1,
    marginLeft: scale(16),
  },
  recipientName: {
    fontSize: normalizeFontSize(18),
    fontWeight: '700',
    color: '#0F172A',
  },
  recipientDept: {
    fontSize: normalizeFontSize(13),
    color: '#64748B',
    marginTop: verticalScale(2),
  },
  recipientContact: {
    fontSize: normalizeFontSize(13),
    color: '#3B82F6',
    fontWeight: '600',
    marginTop: verticalScale(4),
  },
  callButton: {
    width: moderateScale(44),
    height: moderateScale(44),
    borderRadius: moderateScale(22),
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoCard: {
    padding: moderateScale(20),
    borderRadius: moderateScale(24),
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: verticalScale(12),
  },
  infoLabel: {
    fontSize: normalizeFontSize(14),
    color: '#64748B',
    marginLeft: scale(12),
    flex: 1,
  },
  infoValue: {
    fontSize: normalizeFontSize(14),
    fontWeight: '700',
    color: '#0F172A',
  },
  remarkContainer: {
    flexDirection: 'row',
    backgroundColor: '#EFF6FF',
    padding: moderateScale(16),
    borderRadius: moderateScale(16),
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  remarkText: {
    flex: 1,
    fontSize: normalizeFontSize(14),
    color: '#1E40AF',
    marginLeft: scale(12),
    lineHeight: normalizeFontSize(20),
  },
  footer: {
    padding: scale(20),
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  mainActionBtn: {
    height: verticalScale(56),
    borderRadius: moderateScale(16),
  },
  btnRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: verticalScale(56),
    borderRadius: moderateScale(16),
    marginHorizontal: scale(6),
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: normalizeFontSize(15),
    fontWeight: '700',
    marginLeft: scale(8),
  },
  secondaryActionBtn: {
    height: verticalScale(56),
    borderRadius: moderateScale(16),
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: moderateScale(32),
    borderTopRightRadius: moderateScale(32),
    padding: scale(24),
    paddingBottom: Platform.OS === 'ios' ? verticalScale(40) : verticalScale(24),
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: verticalScale(20),
  },
  modalTitle: {
    fontSize: normalizeFontSize(20),
    fontWeight: '800',
    color: '#0F172A',
  },
  modalSubtitle: {
    fontSize: normalizeFontSize(14),
    fontWeight: '700',
    color: '#64748B',
    marginBottom: verticalScale(12),
  },
  reasonsList: {
    maxHeight: verticalScale(240),
    marginBottom: verticalScale(20),
  },
  reasonChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: verticalScale(14),
    paddingHorizontal: scale(16),
    borderRadius: moderateScale(12),
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: verticalScale(8),
  },
  reasonChipSelected: {
    backgroundColor: '#EFF6FF',
    borderColor: '#3B82F6',
  },
  reasonText: {
    fontSize: normalizeFontSize(14),
    color: '#475569',
    fontWeight: '500',
  },
  reasonTextSelected: {
    color: '#1D4ED8',
    fontWeight: '700',
  },
  customRemarkContainer: {
    marginBottom: verticalScale(24),
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: moderateScale(12),
    padding: scale(16),
    fontSize: normalizeFontSize(14),
    color: '#0F172A',
    minHeight: verticalScale(100),
  },
  submitModalBtn: {
    height: verticalScale(56),
    borderRadius: moderateScale(16),
  },
});
