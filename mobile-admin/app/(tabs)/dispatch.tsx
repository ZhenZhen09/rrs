import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Platform, Modal, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { COLORS, RADIUS, TYPOGRAPHY } from '../../constants/Theme';
import { moderateScale, verticalScale } from '../../utils/responsive';
import { PremiumJobCard } from '../../components/Dispatch/PremiumJobCard';
import { LiveActivityCard } from '../../components/Dispatch/LiveActivityCard';
import { useRealTime } from '../../context/RealTimeContext';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { getGroupedStatus } from '../../utils/statusMapping';

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

const TABS = ['Pending', 'Active', 'Done'];

const PREVIOUS_EXAMPLES = [
  { id: 'EX-01', customer: 'Regular Corp', location: 'Business District', type: 'Bulk Delivery', avgTime: '45 mins', icon: 'business' },
  { id: 'EX-02', customer: 'Morning Cafe', location: 'Old Town', type: 'Express Pickup', avgTime: '15 mins', icon: 'local-cafe' },
  { id: 'EX-03', customer: 'Tech Store', location: 'Cyber Plaza', type: 'Fragile Delivery', avgTime: '30 mins', icon: 'computer' },
  { id: 'EX-04', customer: 'City Hospital', location: 'Medical Zone', type: 'Urgent Lab', avgTime: '20 mins', icon: 'local-hospital' },
];

export default function DispatchCenter() {
  const router = useRouter();
  const { lastRequestUpdate } = useRealTime();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Pending');
  const [search, setSearch] = useState('');
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [adminInstructions, setAdminInstructions] = useState('');

  useEffect(() => {
    if (selectedJob) {
      setAdminInstructions(selectedJob.admin_remark || '');
    } else {
      setAdminInstructions('');
    }
  }, [selectedJob]);

  // Live Riders State
  const [riders, setRiders] = useState<any[]>([]);
  const [selectedRiderId, setSelectedRiderId] = useState<string | null>(null);
  const [isAssigning, setIsAssigning] = useState(false);

  const fetchJobs = async () => {
    if (authLoading || !isAuthenticated || !user) {
      setLoading(false);
      return;
    }

    try {
      const response = await api.get('/requests?limit=100');
      const backendJobs = response.data.data || [];
      
      const mappedJobs = backendJobs
        .filter((bj: any) => bj.status !== 'submitted_waiting')
        .map((bj: any) => {
          const uiGroup = getGroupedStatus(bj.status, bj.delivery_status);
          let status = 'Pending';
          if (bj.status === 'pending') {
            status = 'Pending';
          } else if (bj.status === 'approved' && !['completed', 'failed', 'disapproved'].includes(bj.delivery_status || '')) {
            status = 'Active';
          } else if (['completed', 'failed', 'disapproved'].includes(bj.delivery_status || '') || bj.status === 'disapproved' || bj.status === 'cancelled') {
            status = 'Done';
          } else {
            status = 'Done';
          }

          return {
            id: bj.request_id,
            customer: bj.requester_name,
            location: bj.dropoff_location?.address || bj.dropoff_address || 'Unknown',
            time: bj.time_window || 'ASAP',
            status: status,
            uiGroup,
            type: bj.request_type || 'Delivery',
            priority: bj.urgency_level,
            rider: bj.assigned_rider_name,
            delivery_status: bj.delivery_status,
            created_at: bj.created_at,
            completed_at: bj.completed_at,
            updated_at: bj.updated_at,
            admin_remark: bj.admin_remark,
            personnel_instructions: bj.personnel_instructions,
          };
        });
      
      setJobs(mappedJobs);
    } catch (error) {
      console.error('Failed to fetch jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRiders = async () => {
    // SECURITY GUARD: Only fetch if authorized
    if (user?.role !== 'admin' && user?.role !== 'personnel') return;
    
    try {
      const response = await api.get('/users/riders');
      const allUsers = Array.isArray(response.data) ? response.data : response.data.data || [];
      setRiders(allUsers);
    } catch (error) {
      console.error('Failed to fetch riders:', error);
    }
  };

  useEffect(() => {
    if (!authLoading && isAuthenticated && user) {
      fetchJobs();
      fetchRiders();
    }
  }, [lastRequestUpdate, authLoading, isAuthenticated, user]);

  const handleAssignRider = async () => {
    if (!selectedRiderId || !selectedJob) return;
    try {
      setIsAssigning(true);
      await api.put(`/requests/${selectedJob.id}/approve`, {
        rider_id: selectedRiderId,
        admin_remark: adminInstructions || 'Dispatched via Admin Mobile'
      });
      setSelectedJob(null);
      setSelectedRiderId(null);
      fetchJobs();
    } catch (error) {
      console.error('Failed to assign rider:', error);
    } finally {
      setIsAssigning(false);
    }
  };

  const handleReturnForRevision = async () => {
    if (!selectedJob) return;
    Alert.alert(
      'Return for Revision?',
      'Are you sure you want to return this request to the personnel for revision?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Return',
          style: 'default',
          onPress: async () => {
            try {
              setIsAssigning(true);
              await api.put(`/requests/${selectedJob.id}/return`, {
                admin_remark: adminInstructions || 'Returned for revision by Admin'
              });
              setSelectedJob(null);
              fetchJobs();
            } catch (error) {
              console.error('Failed to return request:', error);
              Alert.alert('Error', 'Failed to return request. Please try again.');
            } finally {
              setIsAssigning(false);
            }
          }
        }
      ]
    );
  };

  const handleCancelRequest = async () => {
    if (!selectedJob) return;
    Alert.alert(
      'Cancel Request?',
      'Are you sure you want to permanently cancel this request? This action is permanent.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Cancel Request',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsAssigning(true);
              await api.put(`/requests/${selectedJob.id}/cancel`, {
                admin_remark: adminInstructions || 'Cancelled by Admin'
              });
              setSelectedJob(null);
              fetchJobs();
            } catch (error) {
              console.error('Failed to cancel request:', error);
              Alert.alert('Error', 'Failed to cancel request. Please try again.');
            } finally {
              setIsAssigning(false);
            }
          }
        }
      ]
    );
  };

  const filteredJobs = jobs
    .filter(job => 
      job.status === activeTab &&
      (job.customer?.toLowerCase().includes(search.toLowerCase()) || String(job.id).includes(search))
    )
    .sort((a, b) => {
      const dateA = parseSafeDate(activeTab === 'Pending' ? a.created_at : a.updated_at);
      const dateB = parseSafeDate(activeTab === 'Pending' ? b.created_at : b.updated_at);
      
      const timeA = dateA ? dateA.getTime() : 0;
      const timeB = dateB ? dateB.getTime() : 0;
      
      if (timeB !== timeA) return timeB - timeA;
      return Number(b.id) - Number(a.id);
    });

  return (
    <SafeAreaView style={styles.container}>
      {/* Search Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Dispatch Console</Text>
        <View style={styles.searchBar}>
          <MaterialIcons name="search" size={20} color={COLORS.muted} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search requests..."
            placeholderTextColor={COLORS.muted}
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      {/* 3-Tab Selector */}
      <View style={styles.tabContainer}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.activeTab]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>{tab}</Text>
            {activeTab === tab && <View style={styles.activeIndicator} />}
          </TouchableOpacity>
        ))}
      </View>

      {/* Main Content */}
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {activeTab === 'Pending' && (
          <View style={styles.exampleSection}>
            <Text style={styles.sectionHeader}>Quick Templates from History</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.exampleScroll}>
              {PREVIOUS_EXAMPLES.map((ex) => (
                <TouchableOpacity key={ex.id} style={styles.exampleCard}>
                  <View style={styles.exampleIconContainer}>
                    <MaterialIcons name={ex.icon as any} size={24} color={COLORS.accentBlue} />
                  </View>
                  <Text style={styles.exampleCustomer}>{ex.customer}</Text>
                  <Text style={styles.exampleType}>{ex.type}</Text>
                  <View style={styles.exampleFooter}>
                    <MaterialIcons name="timer" size={12} color={COLORS.secondary} />
                    <Text style={styles.exampleTime}>{ex.avgTime} avg.</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        <Text style={styles.sectionHeader}>{activeTab} Requests</Text>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.accentBlue} />
          </View>
        ) : filteredJobs.length > 0 ? (
          <>
            {activeTab === 'Active' && <LiveActivityCard job={filteredJobs[0]} />}
            {filteredJobs.map((job, index) => {
              // For Active tab, the first/newest request is pinned in LiveActivityCard, 
              // so we don't render it again as a standard PremiumJobCard below
              if (activeTab === 'Active' && index === 0) return null;
              
              return (
                <PremiumJobCard 
                  key={job.id} 
                  job={job} 
                  onPress={(selectedJob) => {
                    if (activeTab === 'Pending') {
                      setSelectedJob(selectedJob);
                    } else {
                      router.push({ pathname: '/job/[id]', params: { id: selectedJob.id } });
                    }
                  }} 
                  activeTab={activeTab} 
                />
              );
            })}
          </>
        ) : (
          <View style={styles.emptyContainer}>
            <FontAwesome5 name="clipboard-list" size={50} color={COLORS.border} />
            <Text style={styles.emptyText}>No {activeTab.toLowerCase()} requests</Text>
          </View>
        )}
      </ScrollView>

      {/* Dispatch Management Modal */}
      <Modal
        visible={!!selectedJob}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Dispatch Management</Text>
              <TouchableOpacity onPress={() => setSelectedJob(null)}>
                <MaterialIcons name="close" size={24} color={COLORS.secondary} />
              </TouchableOpacity>
            </View>

            {selectedJob && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.modalJobInfo}>
                  <Text style={styles.modalJobId}>{selectedJob.id}</Text>
                  <Text style={styles.modalCustomer}>{selectedJob.customer}</Text>
                </View>

                {selectedJob.personnel_instructions && (
                  <View style={styles.personnelInstructionSection}>
                    <Text style={styles.modalSectionTitle}>Personnel Instructions</Text>
                    <View style={styles.personnelInstructionCard}>
                      <Text style={styles.personnelInstructionText}>
                        {selectedJob.personnel_instructions}
                      </Text>
                    </View>
                  </View>
                )}

                <View style={styles.instructionSection}>
                  <Text style={styles.modalSectionTitle}>Admin Instructions</Text>
                  <View style={styles.instructionInputContainer}>
                    <TextInput
                      style={styles.instructionInput}
                      placeholder="Write instructions/remarks for the rider..."
                      placeholderTextColor={COLORS.muted}
                      value={adminInstructions}
                      onChangeText={setAdminInstructions}
                      multiline={true}
                      numberOfLines={3}
                    />
                  </View>
                </View>

                <Text style={styles.modalSectionTitle}>Management Actions</Text>
                <View style={styles.actionButtonsRow}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.returnButton, isAssigning && styles.disabledButton]}
                    onPress={handleReturnForRevision}
                    disabled={isAssigning}
                  >
                    <MaterialIcons name="assignment-return" size={18} color="#FFFFFF" />
                    <Text style={styles.actionButtonText}>Return for Revision</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionButton, styles.cancelButton, isAssigning && styles.disabledButton]}
                    onPress={handleCancelRequest}
                    disabled={isAssigning}
                  >
                    <MaterialIcons name="cancel" size={18} color="#FFFFFF" />
                    <Text style={styles.actionButtonText}>Cancel Request</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.spacer} />

                <Text style={styles.modalSectionTitle}>Select Available Rider</Text>
                {riders.length > 0 ? (
                  riders.map((rider) => {
                    const isSelected = selectedRiderId === rider.id;
                    return (
                      <TouchableOpacity 
                        key={rider.id} 
                        style={[styles.riderOption, isSelected && styles.riderOptionSelected]}
                        onPress={() => setSelectedRiderId(rider.id)}
                      >
                        <FontAwesome5 name="biking" size={16} color={isSelected ? COLORS.accentBlue : COLORS.primary} />
                        <Text style={[styles.riderOptionText, isSelected && styles.riderOptionTextSelected]}>
                          {rider.name || rider.email}
                        </Text>
                        <MaterialIcons 
                          name={isSelected ? "check-circle" : "add-circle-outline"} 
                          size={24} 
                          color={isSelected ? COLORS.accentBlue : COLORS.muted} 
                        />
                      </TouchableOpacity>
                    );
                  })
                ) : (
                  <Text style={styles.emptyText}>No available riders found</Text>
                )}

                <TouchableOpacity 
                  style={[styles.confirmDispatchButton, (!selectedRiderId || isAssigning) && styles.disabledButton]}
                  onPress={handleAssignRider}
                  disabled={!selectedRiderId || isAssigning}
                >
                  {isAssigning ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.confirmDispatchText}>Confirm Assignment</Text>
                  )}
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { 
    padding: moderateScale(20), 
    backgroundColor: '#FFFFFF', 
    borderBottomWidth: 1, 
    borderBottomColor: COLORS.border 
  },
  title: { 
    fontSize: TYPOGRAPHY.size['2xl'], 
    fontWeight: '900' as any, 
    color: COLORS.primary, 
    marginBottom: verticalScale(16), 
    letterSpacing: -0.5 
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: moderateScale(12),
    height: verticalScale(48),
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchIcon: {
    marginRight: moderateScale(10),
  },
  searchInput: { 
    flex: 1, 
    fontSize: TYPOGRAPHY.size.base, 
    fontWeight: '500' as any,
    color: COLORS.primary,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tab: { flex: 1, alignItems: 'center', paddingVertical: verticalScale(16) },
  activeTab: {},
  tabText: { fontSize: TYPOGRAPHY.size.sm, fontWeight: '700' as any, color: COLORS.muted },
  activeTabText: { color: COLORS.primary },
  activeIndicator: {
    position: 'absolute',
    bottom: 0,
    width: '40%',
    height: 3,
    backgroundColor: COLORS.primary,
    borderRadius: 3,
  },
  scrollContent: { padding: moderateScale(20) },
  sectionHeader: { 
    fontSize: TYPOGRAPHY.size.xs, 
    fontWeight: '800' as any, 
    color: COLORS.secondary, 
    marginBottom: verticalScale(16), 
    textTransform: 'uppercase', 
    letterSpacing: 0.5 
  },
  emptyContainer: { alignItems: 'center', marginTop: verticalScale(100) },
  emptyText: { marginTop: verticalScale(16), fontSize: TYPOGRAPHY.size.base, fontWeight: '600' as any, color: COLORS.muted },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: RADIUS.modal,
    borderTopRightRadius: RADIUS.modal,
    padding: moderateScale(24),
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: verticalScale(24),
  },
  modalTitle: { fontSize: TYPOGRAPHY.size.xl, fontWeight: '900' as any, color: COLORS.primary },
  modalJobInfo: { marginBottom: verticalScale(24) },
  modalJobId: { fontSize: TYPOGRAPHY.size.sm, fontWeight: '800' as any, color: COLORS.accentBlue, textTransform: 'uppercase' },
  modalCustomer: { fontSize: TYPOGRAPHY.size['2xl'], fontWeight: '900' as any, color: COLORS.primary, marginTop: verticalScale(4) },
  modalSectionTitle: { 
    fontSize: TYPOGRAPHY.size.xs, 
    fontWeight: '900' as any, 
    color: COLORS.secondary, 
    marginBottom: verticalScale(16), 
    textTransform: 'uppercase' 
  },
  personnelInstructionSection: {
    marginBottom: verticalScale(16),
  },
  personnelInstructionCard: {
    backgroundColor: '#EFF6FF',
    padding: moderateScale(16),
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.accentBlue,
  },
  personnelInstructionText: {
    fontSize: TYPOGRAPHY.size.sm,
    color: COLORS.primary,
    fontWeight: '600' as any,
    lineHeight: 20,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: verticalScale(16),
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: verticalScale(12),
    borderRadius: 12,
    marginHorizontal: moderateScale(4),
  },
  returnButton: {
    backgroundColor: COLORS.warning,
  },
  cancelButton: {
    backgroundColor: COLORS.danger,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: '700' as any,
    marginLeft: moderateScale(6),
  },
  instructionSection: {
    marginBottom: verticalScale(12),
  },
  instructionCard: {
    backgroundColor: '#F1F5F9',
    padding: moderateScale(16),
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  instructionInputContainer: {
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
    paddingHorizontal: moderateScale(12),
    paddingVertical: verticalScale(6),
  },
  instructionInput: {
    fontSize: TYPOGRAPHY.size.sm,
    color: COLORS.primary,
    fontWeight: '650' as any,
    lineHeight: 20,
    minHeight: verticalScale(60),
    textAlignVertical: 'top',
  },
  instructionText: {
    fontSize: TYPOGRAPHY.size.sm,
    color: COLORS.primary,
    fontWeight: '600' as any,
    lineHeight: 20,
  },
  spacer: {
    height: verticalScale(24),
  },
  riderOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: moderateScale(16),
    borderRadius: 16,
    marginBottom: verticalScale(12),
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  riderOptionSelected: {
    borderColor: COLORS.accentBlue,
    backgroundColor: '#EFF6FF',
  },
  riderOptionText: { flex: 1, fontSize: TYPOGRAPHY.size.base, fontWeight: '700' as any, color: COLORS.primary, marginLeft: moderateScale(12) },
  riderOptionTextSelected: {
    color: COLORS.accentBlue,
    fontWeight: '800' as any,
  },
  confirmDispatchButton: {
    backgroundColor: COLORS.primary,
    padding: moderateScale(18),
    borderRadius: RADIUS.button,
    alignItems: 'center',
    marginTop: verticalScale(12),
  },
  disabledButton: {
    opacity: 0.5,
  },
  loadingContainer: {
    marginVertical: verticalScale(20),
    alignItems: 'center',
  },
  confirmDispatchText: { color: '#FFFFFF', fontSize: TYPOGRAPHY.size.base, fontWeight: '800' as any },
  exampleSection: { marginBottom: verticalScale(24) },
  exampleScroll: { marginHorizontal: moderateScale(-20), paddingHorizontal: moderateScale(20) },
  exampleCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: moderateScale(16),
    marginRight: moderateScale(16),
    width: moderateScale(160),
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  exampleIconContainer: { 
    width: moderateScale(40), 
    height: moderateScale(40), 
    borderRadius: 12, 
    backgroundColor: '#EFF6FF', 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginBottom: verticalScale(12) 
  },
  exampleCustomer: { fontSize: TYPOGRAPHY.size.base, fontWeight: '800' as any, color: COLORS.primary, marginBottom: verticalScale(4) },
  exampleType: { fontSize: TYPOGRAPHY.size.xs, fontWeight: '600' as any, color: COLORS.secondary, marginBottom: verticalScale(12) },
  exampleFooter: { flexDirection: 'row', alignItems: 'center' },
  exampleTime: { fontSize: TYPOGRAPHY.size.xs, fontWeight: '700' as any, color: COLORS.muted, marginLeft: moderateScale(4) },
});
