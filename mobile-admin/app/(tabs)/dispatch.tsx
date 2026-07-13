import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, ActivityIndicator, Alert, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { COLORS as DEFAULT_COLORS, RADIUS as DEFAULT_RADIUS, TYPOGRAPHY as DEFAULT_TYPOGRAPHY } from '../../constants/Theme';
import { useTheme } from '../../context/ThemeContext';
import { moderateScale, verticalScale } from '../../utils/responsive';
import { PremiumJobCard } from '../../components/Dispatch/PremiumJobCard';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { LiveActivityCard } from '../../components/Dispatch/LiveActivityCard';
import { useRealTime } from '../../context/RealTimeContext';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { getGroupedStatus } from '../../utils/statusMapping';
import DraggableFlatList, { ScaleDecorator } from 'react-native-draggable-flatlist';

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
    if (!isNaN(d.getTime())) return d;
  } catch (e) {}
  return null;
};

const TABS = ['Pending', 'Active', 'Done'];

export default function DispatchCenter() {
  const router = useRouter();
  const { lastRequestUpdate } = useRealTime();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  
  const { theme } = useTheme();
  const { COLORS, RADIUS, TYPOGRAPHY, SPACING } = theme;

  const styles = React.useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    header: { padding: SPACING.xl, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
    headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.lg },
    title: { fontSize: TYPOGRAPHY.size['2xl'], fontFamily: TYPOGRAPHY.fontFamily.bold, color: COLORS.primary, letterSpacing: -0.5 },
    headerActions: { flexDirection: 'row', gap: 8 },
    iconBtn: { padding: 8, backgroundColor: COLORS.background, borderRadius: RADIUS.sm, borderWidth: 1, borderColor: COLORS.border },
    iconBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
    searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.background, borderRadius: RADIUS.md, paddingHorizontal: 12, height: 48, borderWidth: 1, borderColor: COLORS.border },
    searchIcon: { marginRight: 10 },
    searchInput: { flex: 1, fontSize: TYPOGRAPHY.size.base, fontFamily: TYPOGRAPHY.fontFamily.medium, color: COLORS.primary },
    tabContainer: { flexDirection: 'row', backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
    tab: { flex: 1, alignItems: 'center', paddingVertical: 16 },
    activeTab: {},
    tabText: { fontSize: TYPOGRAPHY.size.sm, fontFamily: TYPOGRAPHY.fontFamily.bold, color: COLORS.muted },
    activeTabText: { color: COLORS.primary },
    activeIndicator: { position: 'absolute', bottom: 0, width: '40%', height: 3, backgroundColor: COLORS.primary, borderRadius: 3 },
    scrollContent: { padding: SPACING.xl, paddingBottom: 100 },
    emptyContainer: { alignItems: 'center', marginTop: 100 },
    emptyText: { marginTop: 16, fontSize: TYPOGRAPHY.size.base, fontFamily: TYPOGRAPHY.fontFamily.medium, color: COLORS.muted },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: COLORS.surface, borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl, padding: SPACING.xl, maxHeight: '85%' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.xl },
    modalTitle: { fontSize: TYPOGRAPHY.size.xl, fontFamily: TYPOGRAPHY.fontFamily.bold, color: COLORS.primary },
    modalSectionTitle: { fontSize: TYPOGRAPHY.size.xs, fontFamily: TYPOGRAPHY.fontFamily.bold, color: COLORS.secondary, marginBottom: 16, textTransform: 'uppercase' },
    filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.background },
    filterChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
    filterChipText: { fontFamily: TYPOGRAPHY.fontFamily.bold, fontSize: 12, color: COLORS.secondary },
    filterChipTextActive: { color: '#FFF' },
    riderGroup: { marginBottom: SPACING.xl },
    riderGroupHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingHorizontal: 4 },
    riderGroupName: { fontFamily: TYPOGRAPHY.fontFamily.bold, fontSize: TYPOGRAPHY.size.base, color: COLORS.primary, marginLeft: 8 },
    resequenceBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.background, paddingHorizontal: 12, paddingVertical: 6, borderRadius: RADIUS.button, borderWidth: 1, borderColor: COLORS.border },
    resequenceBtnText: { fontFamily: TYPOGRAPHY.fontFamily.bold, fontSize: 10, color: COLORS.accentBlue, marginLeft: 4, textTransform: 'uppercase' },
    selectableRow: { flexDirection: 'row', alignItems: 'center' },
    checkbox: { marginRight: 12 },
    bulkActionBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: COLORS.surface, borderTopWidth: 1, borderTopColor: COLORS.border, padding: SPACING.xl, paddingBottom: 40, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 20 },
    bulkActionText: { fontFamily: TYPOGRAPHY.fontFamily.bold, fontSize: TYPOGRAPHY.size.lg, color: COLORS.primary },
    bulkActionBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.accent, paddingHorizontal: 20, paddingVertical: 12, borderRadius: RADIUS.button },
    bulkActionBtnText: { fontFamily: TYPOGRAPHY.fontFamily.bold, fontSize: TYPOGRAPHY.size.sm, color: '#FFF' },
    sequenceItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.background, padding: 12, borderRadius: RADIUS.card, marginBottom: 8, borderWidth: 1, borderColor: COLORS.border },
    sequenceNumberBox: { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    sequenceNumberText: { fontFamily: TYPOGRAPHY.fontFamily.bold, color: '#FFF', fontSize: 14 },
    sequenceCustomer: { fontFamily: TYPOGRAPHY.fontFamily.bold, fontSize: TYPOGRAPHY.size.sm, color: COLORS.primary },
    sequenceId: { fontFamily: TYPOGRAPHY.fontFamily.mono, fontSize: 10, color: COLORS.secondary, marginTop: 2 },
    sequenceControls: { flexDirection: 'row', gap: 4 },
    modalJobInfo: { marginBottom: SPACING.xl },
    modalJobId: { fontSize: TYPOGRAPHY.size.sm, fontFamily: TYPOGRAPHY.fontFamily.monoMedium, color: COLORS.primary, textTransform: 'uppercase' },
    modalCustomer: { fontSize: TYPOGRAPHY.size['2xl'], fontFamily: TYPOGRAPHY.fontFamily.bold, color: COLORS.primary, marginTop: 4, marginBottom: 16 },
    detailRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
    detailIconContainer: { width: 24, alignItems: 'center', marginRight: 12, marginTop: 2 },
    detailTextContent: { flex: 1 },
    detailLabel: { fontSize: 10, fontFamily: TYPOGRAPHY.fontFamily.bold, color: COLORS.secondary, textTransform: 'uppercase' },
    detailValue: { fontSize: TYPOGRAPHY.size.sm, fontFamily: TYPOGRAPHY.fontFamily.medium, color: COLORS.primary, marginTop: 2 },
    instructionSection: { marginBottom: 12 },
    instructionInputContainer: { backgroundColor: COLORS.background, borderRadius: RADIUS.md, borderLeftWidth: 4, borderLeftColor: COLORS.primary, paddingHorizontal: 12, paddingVertical: 6 },
    instructionInput: { fontSize: TYPOGRAPHY.size.sm, color: COLORS.primary, fontFamily: TYPOGRAPHY.fontFamily.medium, lineHeight: 20, minHeight: 60, textAlignVertical: 'top' },
    actionButtonsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
    actionButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: RADIUS.md, marginHorizontal: 4 },
    returnButton: { backgroundColor: COLORS.warning },
    cancelButton: { backgroundColor: COLORS.danger },
    actionButtonText: { color: '#FFFFFF', fontSize: TYPOGRAPHY.size.xs, fontFamily: TYPOGRAPHY.fontFamily.bold, marginLeft: 6 },
    riderOption: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.background, padding: 16, borderRadius: RADIUS.card, marginBottom: 12, borderWidth: 1, borderColor: COLORS.border },
    riderOptionSelected: { borderColor: COLORS.primary, backgroundColor: COLORS.muted },
    riderOptionText: { flex: 1, fontSize: TYPOGRAPHY.size.base, fontFamily: TYPOGRAPHY.fontFamily.bold, color: COLORS.secondary, marginLeft: 12 },
    riderOptionTextSelected: { color: COLORS.primary },
    confirmDispatchButton: { backgroundColor: COLORS.accent, padding: 18, borderRadius: RADIUS.button, alignItems: 'center', marginTop: 12 },
    disabledButton: { opacity: 0.5 },
    confirmDispatchText: { color: COLORS.onPrimary, fontSize: TYPOGRAPHY.size.base, fontFamily: TYPOGRAPHY.fontFamily.bold },
    loadingContainer: { marginVertical: 20, alignItems: 'center' },
  }), [theme]);

  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Pending');
  const [search, setSearch] = useState('');
  
  // Filtering
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [filterPriority, setFilterPriority] = useState<string>('All');
  
  // Single Action State
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [adminInstructions, setAdminInstructions] = useState('');
  
  // Return Action State
  const [returnJob, setReturnJob] = useState<any>(null);
  const [revisionNote, setRevisionNote] = useState('');
  
  // Bulk Action State
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedJobIds, setSelectedJobIds] = useState<string[]>([]);
  const [isBulkAssignModalOpen, setIsBulkAssignModalOpen] = useState(false);

  // Live Riders State
  const [riders, setRiders] = useState<any[]>([]);
  const [selectedRiderId, setSelectedRiderId] = useState<string | null>(null);
  const [isAssigning, setIsAssigning] = useState(false);

  // Resequencing State
  const [sequenceModalVisible, setSequenceModalVisible] = useState(false);
  const [sequenceRider, setSequenceRider] = useState<string | null>(null);
  const [sequenceTasks, setSequenceTasks] = useState<any[]>([]);

  useEffect(() => {
    if (selectedJob) setAdminInstructions(selectedJob.admin_remark || '');
    else setAdminInstructions('');
  }, [selectedJob]);

  const fetchJobs = async () => {
    if (authLoading || !isAuthenticated || !user) {
      setLoading(false);
      return;
    }
    try {
      const response = await api.get('/requests?limit=200');
      const backendJobs = response.data.data || [];
      const mappedJobs = backendJobs
        .filter((bj: any) => bj.status !== 'submitted_waiting')
        .map((bj: any) => {
          const uiGroup = getGroupedStatus(bj.status, bj.delivery_status);
          let status = 'Pending';
          if (bj.status === 'pending') status = 'Pending';
          else if (bj.status === 'approved' && !['completed', 'failed', 'disapproved'].includes(bj.delivery_status || '')) status = 'Active';
          else status = 'Done';

          return {
            id: bj.request_id,
            customer: bj.requester_name,
            building: bj.dropoff_business_name || bj.pickup_business_name || 'N/A',
            location: bj.dropoff_location?.address || bj.dropoff_address || 'Unknown',
            time: bj.time_window || 'ASAP',
            status: status,
            uiGroup,
            type: bj.request_type || 'Delivery',
            priority: bj.urgency_level || 'normal',
            rider: bj.assigned_rider_name,
            rider_id: bj.assigned_rider_id,
            delivery_status: bj.delivery_status,
            created_at: bj.created_at,
            updated_at: bj.updated_at,
            admin_remark: bj.admin_remark,
            personnel_instructions: bj.personnel_instructions,
            sequence_order: bj.queue_order || 0,
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
      Alert.alert('Error', 'Failed to assign rider');
    } finally {
      setIsAssigning(false);
    }
  };

  const handleBulkAssign = async () => {
    if (!selectedRiderId || selectedJobIds.length === 0) return;
    try {
      setIsAssigning(true);
      await api.post(`/requests/mass-update`, {
        taskIds: selectedJobIds,
        action: 'approve',
        value: selectedRiderId,
        note: adminInstructions || 'Bulk Dispatched via Admin Mobile'
      });
      setIsBulkAssignModalOpen(false);
      setIsSelectionMode(false);
      setSelectedJobIds([]);
      setSelectedRiderId(null);
      fetchJobs();
      Alert.alert('Success', 'Requests have been bulk assigned.');
    } catch (error) {
      Alert.alert('Error', 'Failed to bulk assign riders');
    } finally {
      setIsAssigning(false);
    }
  };

  const handleReturnForRevision = (jobToReturn = selectedJob) => {
    if (!jobToReturn) return;
    setReturnJob(jobToReturn);
    setRevisionNote(adminInstructions || '');
    if (selectedJob) setSelectedJob(null); // Close the dispatch modal if open
  };

  const submitReturnForRevision = async () => {
    if (!returnJob || !revisionNote.trim()) return;

    try {
      setIsAssigning(true);
      await api.put(`/requests/${returnJob.id}/return`, {
        admin_remark: revisionNote
      });
      setReturnJob(null);
      setRevisionNote('');
      fetchJobs();
    } catch (error) {
      Alert.alert('Error', 'Failed to return request.');
    } finally {
      setIsAssigning(false);
    }
  };

  const handleCancelRequest = async () => {
    if (!selectedJob) return;
    Alert.alert('Cancel Request?', 'Are you sure?', [
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
            Alert.alert('Error', 'Failed to cancel request.');
          } finally {
            setIsAssigning(false);
          }
        }
      }
    ]);
  };

  // --- Resequencing Logic ---
  const openSequenceModal = (riderId: string) => {
    const riderTasks = jobs.filter(j => j.status === 'Active' && j.rider_id === riderId);
    setSequenceTasks([...riderTasks]);
    setSequenceRider(riderId);
    setSequenceModalVisible(true);
  };

  const moveTaskUp = (index: number) => {
    if (index === 0) return;
    const newTasks = [...sequenceTasks];
    const temp = newTasks[index];
    newTasks[index] = newTasks[index - 1];
    newTasks[index - 1] = temp;
    setSequenceTasks(newTasks);
  };

  const moveTaskDown = (index: number) => {
    if (index === sequenceTasks.length - 1) return;
    const newTasks = [...sequenceTasks];
    const temp = newTasks[index];
    newTasks[index] = newTasks[index + 1];
    newTasks[index + 1] = temp;
    setSequenceTasks(newTasks);
  };

  const saveSequence = async () => {
    if (!sequenceRider) return;
    try {
      setIsAssigning(true);
      const sequence = sequenceTasks.map(t => t.id);
      await api.post('/requests/resequence', {
        riderId: sequenceRider,
        sequence,
        note: 'Optimized via Mobile Admin'
      });
      setSequenceModalVisible(false);
      fetchJobs();
      Alert.alert('Success', 'Route sequence updated successfully.');
    } catch (error) {
      Alert.alert('Error', 'Failed to save sequence.');
    } finally {
      setIsAssigning(false);
    }
  };

  const toggleJobSelection = (id: string) => {
    setSelectedJobIds(prev => prev.includes(id) ? prev.filter(j => j !== id) : [...prev, id]);
  };

  const filteredJobs = jobs
    .filter(job => 
      job.status === activeTab &&
      (job.customer?.toLowerCase().includes(search.toLowerCase()) || String(job.id).includes(search)) &&
      (filterPriority === 'All' || (filterPriority === 'Urgent' && job.priority === 'urgent') || (filterPriority === 'Normal' && job.priority !== 'urgent'))
    )
    .sort((a, b) => {
      if (activeTab === 'Active') {
        return (a.sequence_order || 0) - (b.sequence_order || 0);
      }
      const dateA = parseSafeDate(activeTab === 'Pending' ? a.created_at : a.updated_at);
      const dateB = parseSafeDate(activeTab === 'Pending' ? b.created_at : b.updated_at);
      return (dateB?.getTime() || 0) - (dateA?.getTime() || 0);
    });

  const activeRidersSet = Array.from(new Set(filteredJobs.filter(j => j.status === 'Active').map(j => j.rider_id)));

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.title}>Dispatch Console</Text>
          <View style={styles.headerActions}>
            {activeTab === 'Pending' && (
              <TouchableOpacity 
                style={[styles.iconBtn, isSelectionMode && styles.iconBtnActive]}
                onPress={() => {
                  setIsSelectionMode(!isSelectionMode);
                  setSelectedJobIds([]);
                }}
              >
                <MaterialIcons name="checklist" size={20} color={isSelectionMode ? COLORS.onPrimary : COLORS.primary} />
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.iconBtn} onPress={() => setIsFilterModalOpen(true)}>
              <MaterialIcons name="filter-list" size={20} color={COLORS.primary} />
            </TouchableOpacity>
          </View>
        </View>
        
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

      {/* Tabs */}
      <View style={styles.tabContainer}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.activeTab]}
            onPress={() => { setActiveTab(tab); setIsSelectionMode(false); setSelectedJobIds([]); }}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>{tab}</Text>
            {activeTab === tab && <View style={styles.activeIndicator} />}
          </TouchableOpacity>
        ))}
      </View>

      {/* Main Content */}
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : activeTab === 'Active' ? (
          /* ACTIVE TAB - Grouped by Rider */
          activeRidersSet.length > 0 ? (
            activeRidersSet.map(riderId => {
              const riderJobs = filteredJobs.filter(j => j.rider_id === riderId);
              const riderName = riderJobs[0]?.rider || 'Unknown Rider';
              return (
                <View key={riderId} style={styles.riderGroup}>
                  <View style={styles.riderGroupHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <MaterialIcons name="two-wheeler" size={20} color={COLORS.primary} />
                      <Text style={styles.riderGroupName}>{riderName}</Text>
                    </View>
                    <TouchableOpacity style={styles.resequenceBtn} onPress={() => openSequenceModal(riderId as string)}>
                      <MaterialIcons name="swap-vert" size={16} color={COLORS.accentBlue} />
                      <Text style={styles.resequenceBtnText}>Edit Route</Text>
                    </TouchableOpacity>
                  </View>
                  {riderJobs.map((job, index) => (
                    <PremiumJobCard 
                      key={job.id} 
                      job={job} 
                      onPress={() => router.push({ pathname: '/job/[id]', params: { id: job.id } })}
                      activeTab="Active"
                      sequenceNumber={index + 1}
                    />
                  ))}
                </View>
              );
            })
          ) : (
             <View style={styles.emptyContainer}>
               <MaterialIcons name="assignment" size={50} color={COLORS.border} />
               <Text style={styles.emptyText}>No active requests</Text>
             </View>
          )
        ) : filteredJobs.length > 0 ? (
          /* PENDING / DONE TAB - Flat List */
          filteredJobs.map(job => (
            <View key={job.id} style={isSelectionMode ? styles.selectableRow : {}}>
              {isSelectionMode && (
                <TouchableOpacity 
                  style={styles.checkbox}
                  onPress={() => toggleJobSelection(job.id)}
                >
                  <MaterialIcons 
                    name={selectedJobIds.includes(job.id) ? "check-box" : "check-box-outline-blank"} 
                    size={28} 
                    color={selectedJobIds.includes(job.id) ? COLORS.primary : COLORS.muted} 
                  />
                </TouchableOpacity>
              )}
              <View style={{ flex: 1 }}>
                <PremiumJobCard 
                  job={job} 
                  onPress={(j) => activeTab === 'Pending' ? setSelectedJob(j) : router.push({ pathname: '/job/[id]', params: { id: j.id } })}
                  activeTab={activeTab}
                  onSwipeReturn={() => handleReturnForRevision(job)}
                  onSwipeDispatch={() => setSelectedJob(job)}
                />
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyContainer}>
            <MaterialIcons name="assignment" size={50} color={COLORS.border} />
            <Text style={styles.emptyText}>No {activeTab.toLowerCase()} requests</Text>
          </View>
        )}
      </ScrollView>

      {/* Floating Bulk Action Bar */}
      {isSelectionMode && selectedJobIds.length > 0 && (
        <View style={styles.bulkActionBar}>
          <Text style={styles.bulkActionText}>{selectedJobIds.length} Selected</Text>
          <TouchableOpacity 
            style={styles.bulkActionBtn}
            onPress={() => setIsBulkAssignModalOpen(true)}
          >
            <Text style={styles.bulkActionBtnText}>Bulk Assign</Text>
            <MaterialIcons name="send" size={16} color="#FFF" style={{ marginLeft: 4 }} />
          </TouchableOpacity>
        </View>
      )}

      {/* Filtering Modal */}
      <Modal visible={isFilterModalOpen} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Advanced Filters</Text>
              <TouchableOpacity onPress={() => setIsFilterModalOpen(false)}>
                <MaterialIcons name="close" size={24} color={COLORS.secondary} />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.modalSectionTitle}>Priority Level</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 24 }}>
              {['All', 'Urgent', 'Normal'].map(p => (
                <TouchableOpacity 
                  key={p} 
                  style={[styles.filterChip, filterPriority === p && styles.filterChipActive]}
                  onPress={() => setFilterPriority(p)}
                >
                  <Text style={[styles.filterChipText, filterPriority === p && styles.filterChipTextActive]}>{p}</Text>
                </TouchableOpacity>
              ))}
            </View>
            
            <TouchableOpacity style={styles.confirmDispatchButton} onPress={() => setIsFilterModalOpen(false)}>
              <Text style={styles.confirmDispatchText}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Resequencing Modal */}
      <Modal visible={sequenceModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Route Editor</Text>
              <TouchableOpacity onPress={() => setSequenceModalVisible(false)}>
                <MaterialIcons name="close" size={24} color={COLORS.secondary} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSectionTitle}>Adjust delivery sequence</Text>
            
            <View style={{ height: 400 }}>
              <GestureHandlerRootView style={{ flex: 1 }}>
                <DraggableFlatList
                  data={sequenceTasks}
                  onDragEnd={({ data }) => setSequenceTasks(data)}
                  keyExtractor={(item) => item.id}
                  containerStyle={{ flex: 1 }}
                  renderItem={({ item: task, drag, isActive, getIndex }: any) => {
                    const index = getIndex() || 0;
                    return (
                      <ScaleDecorator>
                        <TouchableOpacity
                          activeOpacity={0.9}
                          onLongPress={drag}
                          disabled={isActive}
                          style={[
                            styles.sequenceItem,
                            { 
                              backgroundColor: isActive ? COLORS.surface : COLORS.background, 
                              borderColor: isActive ? COLORS.primary : COLORS.border,
                              elevation: isActive ? 5 : 0,
                              shadowOpacity: isActive ? 0.2 : 0,
                              opacity: isActive ? 0.9 : 1
                            }
                          ]}
                        >
                          <View style={styles.sequenceNumberBox}>
                            <Text style={styles.sequenceNumberText}>{index + 1}</Text>
                          </View>
                          <View style={{ flex: 1, paddingRight: 8 }}>
                            <Text style={styles.sequenceCustomer} numberOfLines={1}>
                              {task.building !== 'N/A' && task.building ? task.building : 'No Building Specified'}
                            </Text>
                            <Text style={[styles.sequenceId, { fontFamily: TYPOGRAPHY.fontFamily.medium, fontSize: 11 }]} numberOfLines={1}>
                              {task.location}
                            </Text>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6, alignItems: 'center' }}>
                              <Text style={{ fontSize: 9, fontFamily: TYPOGRAPHY.fontFamily.mono, color: COLORS.secondary }}>#{task.id.slice(-8).toUpperCase()}</Text>
                              <Text style={{ fontSize: 10, fontFamily: TYPOGRAPHY.fontFamily.bold, color: COLORS.primary }}>{task.customer}</Text>
                            </View>
                          </View>
                          <View style={styles.sequenceControls}>
                            <TouchableOpacity onPressIn={drag} style={{ padding: 8 }}>
                              <MaterialIcons name="drag-indicator" size={28} color={isActive ? COLORS.primary : COLORS.muted} />
                            </TouchableOpacity>
                          </View>
                        </TouchableOpacity>
                      </ScaleDecorator>
                    );
                  }}
                />
              </GestureHandlerRootView>
            </View>

            <TouchableOpacity 
              style={[styles.confirmDispatchButton, isAssigning && styles.disabledButton]} 
              onPress={saveSequence}
              disabled={isAssigning}
            >
              {isAssigning ? <ActivityIndicator color="#FFF" /> : <Text style={styles.confirmDispatchText}>Save Sequence</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Single / Bulk Dispatch Modal */}
      <Modal visible={!!selectedJob || isBulkAssignModalOpen} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{isBulkAssignModalOpen ? 'Bulk Dispatch' : 'Dispatch Management'}</Text>
              <TouchableOpacity onPress={() => { setSelectedJob(null); setIsBulkAssignModalOpen(false); }}>
                <MaterialIcons name="close" size={24} color={COLORS.secondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {!isBulkAssignModalOpen && selectedJob && (
                <View style={styles.modalJobInfo}>
                  <Text style={styles.modalJobId}>{selectedJob.id}</Text>
                  <Text style={styles.modalCustomer}>{selectedJob.customer}</Text>

                  <View style={styles.detailRow}>
                    <View style={styles.detailIconContainer}>
                      <MaterialIcons name="local-shipping" size={16} color={COLORS.muted} />
                    </View>
                    <View style={styles.detailTextContent}>
                      <Text style={styles.detailLabel}>Request Type</Text>
                      <Text style={styles.detailValue}>{selectedJob.type}</Text>
                    </View>
                  </View>

                  <View style={styles.detailRow}>
                    <View style={styles.detailIconContainer}>
                      <MaterialIcons name="place" size={16} color={COLORS.muted} />
                    </View>
                    <View style={styles.detailTextContent}>
                      <Text style={styles.detailLabel}>Location</Text>
                      <Text style={styles.detailValue}>{selectedJob.location}</Text>
                    </View>
                  </View>

                  <View style={styles.detailRow}>
                    <View style={styles.detailIconContainer}>
                      <MaterialIcons name="calendar-today" size={16} color={COLORS.muted} />
                    </View>
                    <View style={styles.detailTextContent}>
                      <Text style={styles.detailLabel}>Date Filed</Text>
                      <Text style={styles.detailValue}>
                        {selectedJob.created_at ? new Date(selectedJob.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : 'Unknown'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.detailRow}>
                    <View style={styles.detailIconContainer}>
                      <MaterialIcons name="access-time" size={16} color={COLORS.muted} />
                    </View>
                    <View style={styles.detailTextContent}>
                      <Text style={styles.detailLabel}>Time Window</Text>
                      <Text style={styles.detailValue}>{selectedJob.time}</Text>
                    </View>
                  </View>

                  <View style={styles.detailRow}>
                    <View style={styles.detailIconContainer}>
                      <MaterialIcons name="warning" size={16} color={COLORS.muted} />
                    </View>
                    <View style={styles.detailTextContent}>
                      <Text style={styles.detailLabel}>Priority</Text>
                      <Text style={[styles.detailValue, { color: selectedJob.priority === 'Urgent' ? COLORS.danger : COLORS.primary, textTransform: 'capitalize' }]}>{selectedJob.priority}</Text>
                    </View>
                  </View>
                </View>
              )}
              {isBulkAssignModalOpen && (
                <View style={styles.modalJobInfo}>
                  <Text style={styles.modalCustomer}>{selectedJobIds.length} Requests Selected</Text>
                </View>
              )}

              {!isBulkAssignModalOpen && selectedJob?.personnel_instructions && (
                <View style={styles.instructionSection}>
                  <Text style={styles.modalSectionTitle}>Personnel Notes</Text>
                  <View style={[styles.instructionInputContainer, { borderLeftColor: COLORS.muted }]}>
                    <Text style={[styles.instructionInput, { minHeight: 20 }]}>
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

              {!isBulkAssignModalOpen && (
                <>
                  <Text style={styles.modalSectionTitle}>Management Actions</Text>
                  <View style={styles.actionButtonsRow}>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.returnButton, isAssigning && styles.disabledButton]}
                      onPress={() => handleReturnForRevision(selectedJob)}
                      disabled={isAssigning}
                    >
                      <MaterialIcons name="assignment-return" size={18} color="#FFFFFF" />
                      <Text style={styles.actionButtonText}>Return</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.cancelButton, isAssigning && styles.disabledButton]}
                      onPress={handleCancelRequest}
                      disabled={isAssigning}
                    >
                      <MaterialIcons name="cancel" size={18} color="#FFFFFF" />
                      <Text style={styles.actionButtonText}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}

              <Text style={styles.modalSectionTitle}>Select Available Rider</Text>
              {riders.length > 0 ? (
                riders.map((rider) => {
                  const isSelected = selectedRiderId === rider.id;

  return (
                    <TouchableOpacity 
                      key={rider.id} 
                      style={[styles.riderOption, isSelected && styles.riderOptionSelected]}
                      onPress={() => setSelectedRiderId(rider.id)}
                      activeOpacity={0.7}
                    >
                      <MaterialIcons name="two-wheeler" size={24} color={isSelected ? COLORS.primary : COLORS.secondary} />
                      <Text style={[styles.riderOptionText, isSelected && styles.riderOptionTextSelected]}>
                        {rider.name || rider.email}
                      </Text>
                      <MaterialIcons 
                        name={isSelected ? "check-circle" : "radio-button-unchecked"} 
                        size={24} 
                        color={isSelected ? COLORS.primary : COLORS.muted} 
                      />
                    </TouchableOpacity>
                  );
                })
              ) : (
                <Text style={styles.emptyText}>No available riders found</Text>
              )}

              <TouchableOpacity 
                style={[styles.confirmDispatchButton, (!selectedRiderId || isAssigning) && styles.disabledButton]}
                onPress={isBulkAssignModalOpen ? handleBulkAssign : handleAssignRider}
                disabled={!selectedRiderId || isAssigning}
                activeOpacity={0.8}
              >
                {isAssigning ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.confirmDispatchText}>Confirm Assignment</Text>}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Return for Revision Modal */}
      <Modal visible={!!returnJob} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '60%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Return for Revision</Text>
              <TouchableOpacity onPress={() => { setReturnJob(null); setRevisionNote(''); }}>
                <MaterialIcons name="close" size={24} color={COLORS.secondary} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalJobInfo}>
              <Text style={styles.modalJobId}>{returnJob?.id}</Text>
              <Text style={styles.modalCustomer}>{returnJob?.customer}</Text>
            </View>

            <View style={styles.instructionSection}>
              <Text style={styles.modalSectionTitle}>Reason for Return (Required)</Text>
              <View style={styles.instructionInputContainer}>
                <TextInput
                  style={styles.instructionInput}
                  placeholder="Explain what needs to be fixed..."
                  placeholderTextColor={COLORS.muted}
                  value={revisionNote}
                  onChangeText={setRevisionNote}
                  multiline={true}
                  numberOfLines={4}
                  autoFocus={true}
                />
              </View>
            </View>

            <TouchableOpacity 
              style={[styles.confirmDispatchButton, { backgroundColor: COLORS.warning }, (!revisionNote.trim() || isAssigning) && styles.disabledButton]}
              onPress={submitReturnForRevision}
              disabled={!revisionNote.trim() || isAssigning}
              activeOpacity={0.8}
            >
              {isAssigning ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.confirmDispatchText}>Confirm Return</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}