import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Modal, ActivityIndicator, Alert, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import { FilterModal } from '../../components/Dispatch/FilterModal';
import { SequenceModal } from '../../components/Dispatch/SequenceModal';
import { DispatchModal } from '../../components/Dispatch/DispatchModal';
import { PremiumJobCard } from '../../components/Dispatch/PremiumJobCard';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { LiveActivityCard } from '../../components/Dispatch/LiveActivityCard';
import { useRealTimeStore } from '../../store/useRealTimeStore';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { getGroupedStatus } from '../../utils/statusMapping';
import DraggableFlatList, { ScaleDecorator } from 'react-native-draggable-flatlist';
import { useDebounce } from '../../utils/useDebounce';

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

const TABS = ['Pending', 'Active', 'Overdue', 'Done'];

export default function DispatchCenter() {
  const router = useRouter();
  const rawLastRequestUpdate = useRealTimeStore(state => state.lastRequestUpdate);
  const lastRequestUpdate = useDebounce(rawLastRequestUpdate, 2000);
  const riderPresence = useRealTimeStore(state => state.riderPresence);
  const riderLocations = useRealTimeStore(state => state.riderLocations);
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  
  const { theme } = useTheme();
  const { COLORS, SPACING } = theme;


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
            requesterName: bj.requester_name,
            onBehalfOf: bj.on_behalf_of,
            requesterDepartment: bj.requester_department,
            building: bj.dropoff_business_name || bj.pickup_business_name || 'N/A',
            location: bj.dropoff_location?.address || bj.dropoff_address || 'Unknown',
            time: bj.time_window || 'ASAP',
            deliveryDate: bj.delivery_date,
            timeWindow: bj.time_window,
            pickupAddress: bj.pickup_location?.address || bj.pickup_address || 'Unknown',
            pickupContactName: bj.pickup_contact_name,
            destinationAddress: bj.dropoff_location?.address || bj.dropoff_address || 'Unknown',
            recipientName: bj.recipient_name,
            destinationBuilding: bj.dropoff_location?.businessName || bj.dropoff_business_name,
            recipientContact: bj.recipient_contact,
            status: status,
            uiGroup,
            type: bj.request_type || 'Delivery',
            priority: bj.urgency_level || 'normal',
            rider: bj.assigned_rider_name,
            rider_id: bj.assigned_rider_id,
            delivery_status: bj.delivery_status,
            created_at: bj.created_at,
            updated_at: bj.updated_at,
            delivery_date: bj.delivery_date,
            admin_remark: bj.admin_remark,
            personnel_instructions: bj.personnel_instructions,
            sequence_order: bj.queue_order || 0,
            is_overdue: Boolean(bj.is_overdue),
            overdue_minutes: bj.overdue_minutes || 0,
            overdue_label: bj.overdue_label || '',
            recommended_action: bj.recommended_action || null,
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
      const response = await api.get('/users/riders/live');
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
    const selectedRider = riders.find((rider) => rider.id === selectedRiderId);
    const unavailableReason = getRiderUnavailableReason(selectedRider, [selectedJob]);
    if (unavailableReason) {
      Alert.alert('Rider unavailable', `Cannot assign rider: ${unavailableReason}`);
      return;
    }
    try {
      setIsAssigning(true);
      await api.put(`/requests/${selectedJob.id}/approve`, {
        rider_id: selectedRiderId,
        admin_remark: adminInstructions || 'Dispatched via Admin Mobile'
      });
      setSelectedJob(null);
      setSelectedRiderId(null);
      fetchJobs();
    } catch (error: any) {
      Alert.alert('Error', error?.response?.data?.error || 'Failed to assign rider');
    } finally {
      setIsAssigning(false);
    }
  };

  const handleBulkAssign = async () => {
    if (!selectedRiderId || selectedJobIds.length === 0) return;
    const selectedRider = riders.find((rider) => rider.id === selectedRiderId);
    const selectedJobs = jobs.filter((job) => selectedJobIds.includes(job.id));
    const unavailableReason = getRiderUnavailableReason(selectedRider, selectedJobs);
    if (unavailableReason) {
      Alert.alert('Rider unavailable', `Cannot assign rider: ${unavailableReason}`);
      return;
    }
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
    } catch (error: any) {
      Alert.alert('Error', error?.response?.data?.error || 'Failed to bulk assign riders');
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
      (activeTab === 'Overdue' ? job.is_overdue : job.status === activeTab) &&
      (job.customer?.toLowerCase().includes(search.toLowerCase()) || String(job.id).includes(search)) &&
      (filterPriority === 'All' || (filterPriority === 'Urgent' && job.priority === 'urgent') || (filterPriority === 'Normal' && job.priority !== 'urgent'))
    )
    .sort((a, b) => {
      if (activeTab === 'Overdue') {
        const overdueDelta = (b.overdue_minutes || 0) - (a.overdue_minutes || 0);
        if (overdueDelta !== 0) return overdueDelta;
        return (a.priority || '').localeCompare(b.priority || '');
      }
      if (activeTab === 'Active') {
        return (a.sequence_order || 0) - (b.sequence_order || 0);
      }
      const dateA = parseSafeDate(activeTab === 'Pending' ? a.created_at : a.updated_at);
      const dateB = parseSafeDate(activeTab === 'Pending' ? b.created_at : b.updated_at);
      return (dateB?.getTime() || 0) - (dateA?.getTime() || 0);
    });

  const activeRidersSet = Array.from(new Set(filteredJobs.filter(j => j.status === 'Active').map(j => j.rider_id)));

  const toDateString = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const normalizeDateString = (date?: string) => typeof date === 'string' ? date.split('T')[0] : '';
  const getRiderUnavailableReason = (rider: any, targetJobs: any[]) => {
    if (!rider) return 'not found';
    if (rider.attendance_status === 'on_leave') return 'on leave';
    const hasTodayJob = targetJobs.some((job) => normalizeDateString(job?.delivery_date) === toDateString(new Date()));
    if (!hasTodayJob) return null;
    if (rider.attendance_status === 'absent') return 'absent today';
    if (!rider.attendance_status) return 'no attendance report';
    if (!rider.is_on_duty) return 'off duty';
    const presenceStatus = riderPresence.get(rider.id);
    const isOnline = presenceStatus ? presenceStatus === 'online' : !!rider.is_online;
    if (!isOnline) return 'offline';
    return null;
  };

  const modalTargetJobs = isBulkAssignModalOpen
    ? jobs.filter((job) => selectedJobIds.includes(job.id))
    : (selectedJob ? [selectedJob] : []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
      {/* Header */}
      <View className="border-b" style={{ padding: SPACING.xl, backgroundColor: COLORS.surface, borderBottomColor: COLORS.border }}>
        <View className="mb-4 flex-row items-center justify-between" style={{ marginBottom: SPACING.lg }}>
          <Text className="font-fira-bold text-2xl tracking-[-0.5px]" style={{ color: COLORS.primary }}>Dispatch Console</Text>
          <View className="flex-row gap-2">
            {activeTab === 'Pending' && (
              <TouchableOpacity 
                className="rounded-[4px] border p-2"
                style={{ backgroundColor: isSelectionMode ? COLORS.primary : COLORS.background, borderColor: isSelectionMode ? COLORS.primary : COLORS.border }}
                onPress={() => {
                  setIsSelectionMode(!isSelectionMode);
                  setSelectedJobIds([]);
                }}
              >
                <MaterialIcons name="checklist" size={20} color={isSelectionMode ? COLORS.onPrimary : COLORS.primary} />
              </TouchableOpacity>
            )}
            <TouchableOpacity className="rounded-[4px] border p-2" style={{ backgroundColor: COLORS.background, borderColor: COLORS.border }} onPress={() => setIsFilterModalOpen(true)}>
              <MaterialIcons name="filter-list" size={20} color={COLORS.primary} />
            </TouchableOpacity>
          </View>
        </View>
        
        <View className="h-12 flex-row items-center rounded-lg border px-3" style={{ backgroundColor: COLORS.background, borderColor: COLORS.border }}>
          <MaterialIcons name="search" size={20} color={COLORS.muted} style={{ marginRight: 10 }} />
          <TextInput
            className="flex-1 font-fira-medium text-base"
            style={{ color: COLORS.primary }}
            placeholder="Search requests..."
            placeholderTextColor={COLORS.muted}
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      {/* Tabs */}
      <View className="flex-row border-b" style={{ backgroundColor: COLORS.surface, borderBottomColor: COLORS.border }}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab}
            className="flex-1 items-center py-4"
            onPress={() => { setActiveTab(tab); setIsSelectionMode(false); setSelectedJobIds([]); }}
            activeOpacity={0.7}
          >
            <Text className="font-fira-bold text-sm" style={{ color: activeTab === tab ? COLORS.primary : COLORS.muted }}>{tab}</Text>
            {activeTab === tab && <View className="absolute bottom-0 h-[3px] w-[40%] rounded-[3px]" style={{ backgroundColor: COLORS.primary }} />}
          </TouchableOpacity>
        ))}
      </View>

      {/* Main Content */}
      {activeTab === 'Active' ? (
        <ScrollView contentContainerStyle={{ padding: SPACING.xl, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
          {loading ? (
             <View className="my-5 items-center">
               <ActivityIndicator size="large" color={COLORS.primary} />
             </View>
          ) : activeRidersSet.length > 0 ? (
            activeRidersSet.map(riderId => {
              const riderJobs = filteredJobs.filter(j => j.rider_id === riderId);
              const riderName = riderJobs[0]?.rider || 'Unknown Rider';
              return (
                <View key={riderId} className="mb-6" style={{ marginBottom: SPACING.xl }}>
                  <View className="mb-3 flex-row items-center justify-between px-1">
                    <View className="flex-row items-center">
                      <MaterialIcons name="two-wheeler" size={20} color={COLORS.primary} />
                      <Text className="ml-2 font-fira-bold text-base" style={{ color: COLORS.primary, marginLeft: 8 }}>{riderName}</Text>
                    </View>
                    <TouchableOpacity className="flex-row items-center rounded-lg border px-3 py-1.5" style={{ backgroundColor: COLORS.background, borderColor: COLORS.border }} onPress={() => openSequenceModal(riderId as string)}>
                      <MaterialIcons name="swap-vert" size={16} color={COLORS.accentBlue} />
                      <Text className="ml-1 font-fira-bold text-[10px] uppercase" style={{ color: COLORS.accentBlue, marginLeft: 4 }}>Edit Route</Text>
                    </TouchableOpacity>
                  </View>
                  {riderJobs.map((job, index) => (
                    <PremiumJobCard 
                      key={job.id} 
                      job={job} 
                      onPress={() => router.push({ pathname: '/job/[id]', params: { id: job.id } })}
                      activeTab="Active"
                      sequenceNumber={index + 1}
                      riderPresence={riderPresence.get(job.rider_id)}
                      riderLocation={riderLocations.get(job.rider_id)}
                    />
                  ))}
                </View>
              );
            })
          ) : (
             <View className="mt-[100px] items-center">
               <MaterialIcons name="assignment" size={50} color={COLORS.border} />
               <Text className="mt-4 font-fira-medium text-base" style={{ color: COLORS.muted }}>No active requests</Text>
             </View>
          )}
        </ScrollView>
      ) : (
        <FlatList
          data={filteredJobs}
          keyExtractor={item => item.id}
          contentContainerStyle={{ padding: SPACING.xl, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            loading ? (
              <View className="my-5 items-center">
                <ActivityIndicator size="large" color={COLORS.primary} />
              </View>
            ) : (
              <View className="mt-[100px] items-center">
                <MaterialIcons name="assignment" size={50} color={COLORS.border} />
                <Text className="mt-4 font-fira-medium text-base" style={{ color: COLORS.muted }}>No {activeTab.toLowerCase()} requests</Text>
              </View>
            )
          }
          renderItem={({ item: job }) => (
            <View className={isSelectionMode ? 'flex-row items-center' : ''}>
              {isSelectionMode && (
                <TouchableOpacity 
                  className="mr-3"
                  onPress={() => toggleJobSelection(job.id)}
                >
                  <MaterialIcons 
                    name={selectedJobIds.includes(job.id) ? "check-box" : "check-box-outline-blank"} 
                    size={28} 
                    color={selectedJobIds.includes(job.id) ? COLORS.primary : COLORS.muted} 
                  />
                </TouchableOpacity>
              )}
              <View className="flex-1">
                <PremiumJobCard 
                  job={job} 
                  onPress={(j) => activeTab === 'Pending' ? setSelectedJob(j) : router.push({ pathname: '/job/[id]', params: { id: j.id } })}
                  activeTab={activeTab}
                  onSwipeReturn={() => handleReturnForRevision(job)}
                  onSwipeDispatch={() => setSelectedJob(job)}
                />
              </View>
            </View>
          )}
        />
      )}

      {/* Floating Bulk Action Bar */}
      {isSelectionMode && selectedJobIds.length > 0 && (
        <View className="absolute bottom-0 left-0 right-0 flex-row items-center justify-between border-t" style={{ backgroundColor: COLORS.surface, borderTopColor: COLORS.border, padding: SPACING.xl, paddingBottom: 40, shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 20 }}>
          <Text className="font-fira-bold text-lg" style={{ color: COLORS.primary }}>{selectedJobIds.length} Selected</Text>
          <TouchableOpacity 
            className="flex-row items-center rounded-lg px-5 py-3"
            style={{ backgroundColor: COLORS.accent }}
            onPress={() => setIsBulkAssignModalOpen(true)}
          >
            <Text className="font-fira-bold text-sm text-white">Bulk Assign</Text>
            <MaterialIcons name="send" size={16} color="#FFF" style={{ marginLeft: 4 }} />
          </TouchableOpacity>
        </View>
      )}


      <FilterModal 
        visible={isFilterModalOpen} 
        onClose={() => setIsFilterModalOpen(false)} 
        filterPriority={filterPriority} 
        setFilterPriority={setFilterPriority} 
      />
      <SequenceModal 
        visible={sequenceModalVisible} 
        onClose={() => setSequenceModalVisible(false)} 
        sequenceTasks={sequenceTasks} 
        setSequenceTasks={setSequenceTasks} 
        saveSequence={saveSequence} 
        isAssigning={isAssigning} 
      />
      <DispatchModal 
        selectedJob={selectedJob} 
        setSelectedJob={setSelectedJob} 
        isBulkAssignModalOpen={isBulkAssignModalOpen} 
        setIsBulkAssignModalOpen={setIsBulkAssignModalOpen} 
        selectedJobIds={selectedJobIds} 
        adminInstructions={adminInstructions} 
        setAdminInstructions={setAdminInstructions} 
        handleReturnForRevision={handleReturnForRevision} 
        handleCancelRequest={handleCancelRequest} 
        riders={riders} 
        selectedRiderId={selectedRiderId} 
        setSelectedRiderId={setSelectedRiderId} 
        getRiderUnavailableReason={(rider) => getRiderUnavailableReason(rider, modalTargetJobs)}
        handleAssignRider={handleAssignRider} 
        handleBulkAssign={handleBulkAssign} 
        isAssigning={isAssigning} 
      />
      {/* Return for Revision Modal */}
      <Modal visible={!!returnJob} animationType="fade" transparent={true}>
        <View className="flex-1 justify-end bg-black/50">
          <View className="max-h-[60%] rounded-t-2xl" style={{ backgroundColor: COLORS.surface, padding: SPACING.xl }}>
            <View className="mb-6 flex-row items-center justify-between" style={{ marginBottom: SPACING.xl }}>
              <Text className="font-fira-bold text-xl" style={{ color: COLORS.primary }}>Return for Revision</Text>
              <TouchableOpacity onPress={() => { setReturnJob(null); setRevisionNote(''); }}>
                <MaterialIcons name="close" size={24} color={COLORS.secondary} />
              </TouchableOpacity>
            </View>
            
            <View className="mb-6" style={{ marginBottom: SPACING.xl }}>
              <Text className="font-fira-code-medium text-sm uppercase" style={{ color: COLORS.primary }}>{returnJob?.id}</Text>
              <Text className="mt-1 mb-4 font-fira-bold text-2xl" style={{ color: COLORS.primary, marginTop: 4, marginBottom: 16 }}>{returnJob?.customer}</Text>
            </View>

            <View className="mb-3">
              <Text className="mb-4 font-fira-bold text-xs uppercase" style={{ color: COLORS.secondary }}>Reason for Return (Required)</Text>
              <View className="rounded-lg border-l-4 px-3 py-1.5" style={{ backgroundColor: COLORS.background, borderLeftColor: COLORS.primary }}>
                <TextInput
                  className="font-fira-medium text-sm"
                  style={{ color: COLORS.primary, lineHeight: 20, minHeight: 60, textAlignVertical: 'top' }}
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
              className="mt-3 items-center rounded-lg p-[18px]"
              style={{ backgroundColor: COLORS.warning, opacity: (!revisionNote.trim() || isAssigning) ? 0.5 : 1 }}
              onPress={submitReturnForRevision}
              disabled={!revisionNote.trim() || isAssigning}
              activeOpacity={0.8}
            >
              {isAssigning ? <ActivityIndicator color="#FFFFFF" /> : <Text className="font-fira-bold text-base" style={{ color: COLORS.onPrimary }}>Confirm Return</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}
