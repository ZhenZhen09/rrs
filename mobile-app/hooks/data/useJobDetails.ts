import { useState, useEffect, useRef, useMemo } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, Linking, Platform } from 'react-native';
import { io, Socket } from 'socket.io-client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getJobDetails, updateJobStatus, getTasks } from '@/services/apiService';
import { useAuth } from '@/context/AuthContext';
import { useLocation } from '@/context/LocationContext';
import { Job } from '@/types';
import { Config } from '@/constants/Config';

import NetInfo from '@react-native-community/netinfo';

export type JobSyncStatus = 'synced' | 'pending' | 'verifying' | 'sync_pending' | 'sync_error';

export const useJobDetails = () => {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const { startTracking, stopTracking, isTracking } = useLocation();
  const queryClient = useQueryClient();
  
  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const [statusType, setStatusType] = useState<'completed' | 'failed' | null>(null);
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [customRemark, setCustomRemark] = useState<string>('');
  const [syncStatus, setSyncStatus] = useState<JobSyncStatus>('synced');
  const [isSelfUpdated, setIsSelfUpdated] = useState(false);
  
  // Use TanStack Query for Job Details
  const {
    data: jobData,
    isLoading: loading,
    refetch: fetchJobDetails,
  } = useQuery({
    queryKey: ['job', id],
    queryFn: () => getJobDetails(id as string),
    enabled: !!id,
    staleTime: 30000, // 30 seconds
  });

  /**
   * --- LAYER 2: SEQUENTIAL ENFORCEMENT ---
   * Fetch all active tasks to check the sequence
   */
  const { data: allActiveTasks = [] } = useQuery<Job[]>({
    queryKey: ['tasks', user?.id],
    queryFn: getTasks,
    enabled: !!user?.id,
  });

  const sequentialEnforcement = useMemo(() => {
    if (!jobData || !allActiveTasks.length) return { isLocked: false, activeTask: null };

    const currentStatus = jobData.delivery_status || '';
    const isTerminal = ['completed', 'failed', 'cancelled', 'disapproved'].includes(currentStatus);
    
    // 0. If task is terminal (History), it's never locked
    if (isTerminal) return { isLocked: false, activeTask: null };

    // 1. Filter for "Active" tasks in the rider's queue
    const activeTasks = allActiveTasks.filter(t => 
      !['completed', 'failed', 'cancelled', 'disapproved'].includes(t.delivery_status || '')
    );

    // 2. Sort by queue_order (Layer 2)
    const sortedQueue = [...activeTasks].sort((a, b) => {
      const orderA = a.queue_order || 999;
      const orderB = b.queue_order || 999;
      if (orderA !== orderB) return orderA - orderB;
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });

    const currentTaskInQueue = sortedQueue[0];
    const isFirstInQueue = currentTaskInQueue?.request_id === id;

    // 3. Exception: If the task is already "In Progress", it's effectively the active one
    if (jobData.delivery_status === 'in_progress') return { isLocked: false, activeTask: jobData };

    return {
      isLocked: !isFirstInQueue,
      activeTask: currentTaskInQueue,
      queuePosition: sortedQueue.findIndex(t => t.request_id === id) + 1,
      totalInQueue: sortedQueue.length
    };
  }, [jobData, allActiveTasks, id]);

  /**
   * --- SENIOR STATUS ALIGNMENT LOGIC ---
   * If the job is assigned to a rider and approved, but the delivery 
   * hasn't started yet (status is NULL or 'pending'), we force it 
   * to 'assigned' so the UI is clear.
   */
  const job = jobData ? {
    ...jobData,
    delivery_status: (
      (jobData.delivery_status && jobData.delivery_status !== 'pending') 
        ? jobData.delivery_status 
        : (jobData.assigned_rider_id ? 'assigned' : 'pending')
    )
  } : null;

  // Use TanStack Mutation for Status Updates (Optimistic UI)
  const updateMutation = useMutation({
    mutationFn: ({ status, remark }: { status: string; remark: string }) => 
      updateJobStatus(id as string, status, remark),
    
    // When mutate is called:
    onMutate: async (newStatusData) => {
      setSyncStatus('pending');
      setIsSelfUpdated(true);
      
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey: ['job', id] });

      // Snapshot the previous value
      const previousJob = queryClient.getQueryData<Job>(['job', id]);

      // Optimistically update to the new value
      if (previousJob) {
        queryClient.setQueryData(['job', id], {
          ...previousJob,
          delivery_status: newStatusData.status
        });
      }
      
      return { previousJob };
    },
    // If the mutation fails, use the context returned from onMutate to roll back
    onError: async (err, newStatusData, context) => {
      setSyncStatus('verifying');
      
      // Attempt to verify the actual status from server before assuming failure
      try {
        const latestJob = await getJobDetails(id as string);
        if (latestJob.delivery_status === newStatusData.status) {
          // It actually succeeded on the server!
          queryClient.setQueryData(['job', id], latestJob);
          setSyncStatus('synced');
          return;
        }
      } catch (verifyErr) {
        console.warn('Could not verify status with server:', verifyErr);
      }

      setSyncStatus('sync_pending');
      setIsSelfUpdated(false);
      // No blocking alert here - the UI will handle the sync_pending state
    },
    // Always refetch after error or success to ensure we have the correct server state
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['job', id] });
      queryClient.invalidateQueries({ queryKey: ['tasks', user?.id] });
    },
    onSuccess: (data, variables) => {
      setSyncStatus('synced');
      if (variables.status === 'in_progress') {
        startTracking(id as string);
      } else if (['completed', 'failed', 'cancelled'].includes(variables.status)) {
        stopTracking();
      }
      setStatusModalVisible(false);
      // Small success feedback is fine, but not blocking
    }
  });

  const updating = updateMutation.isPending || syncStatus === 'pending' || syncStatus === 'verifying';
  const isStartingDelivery = updateMutation.isPending && updateMutation.variables?.status === 'in_progress';
  const socketRef = useRef<Socket | null>(null);

  const COMPLETED_REASONS = [
    'Handed directly to recipient',
    'Left at Reception/Lobby',
    'Left at Mailroom',
    'Left with security guard',
    'Transaction Complete',
  ];

  const FAILED_REASONS = [
    'Recipient not present',
    'Building closed',
    'Incorrect Address',
    'Vehicle issue',
    'Client cancelled',
  ];

  const handleUpdateStatus = (newStatus: string) => {
    if (newStatus === 'in_progress') {
      Alert.alert(
        'Start Delivery',
        'Are you ready to start this delivery?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Start',
            onPress: () => updateMutation.mutate({ status: newStatus, remark: 'Delivery started' }),
          },
        ]
      );
    } else if (newStatus === 'completed' || newStatus === 'failed') {
      setStatusType(newStatus as 'completed' | 'failed');
      setSelectedReason('');
      setCustomRemark('');
      setStatusModalVisible(true);
    }
  };

  const handleSubmitStatus = () => {
    if (!statusType) return;
    let finalRemark = selectedReason;
    if (customRemark.trim()) {
      finalRemark = finalRemark ? `${finalRemark} - ${customRemark.trim()}` : customRemark.trim();
    }
    if (!finalRemark) {
      Alert.alert('Required', 'Please select a reason or enter a remark.');
      return;
    }
    updateMutation.mutate({ status: statusType, remark: finalRemark });
  };

  useEffect(() => {
    // SENIOR FIX: Stop creating a local socket here. 
    // The LocationContext already handles the connection.
    // We just need to join the job-specific room.
    
    // For now, I will remove this block entirely as the 
    // global socket in LocationContext will handle the 'join'.
    // Room joining will be moved to a more stable place or handled via the global ref.
  }, [id, user?.id]);

  useEffect(() => {
    // Instead of local socket, we rely on the global sync
    // triggered by queryClient invalidation from the server.
  }, [id, queryClient]);

  useEffect(() => {
    const currentStatus = job?.delivery_status?.toLowerCase();
    if (currentStatus === 'in_progress' && !isTracking) {
      startTracking(id as string);
    }
  }, [job?.delivery_status, isTracking, id]);

  const openInNativeMaps = (lat: number, lng: number, label: string) => {
    const scheme = Platform.select({ ios: 'maps:0,0?q=', android: 'geo:0,0?q=' });
    const latLng = `${lat},${lng}`;
    const url = Platform.select({
      ios: `${scheme}${label}@${latLng}`,
      android: `${scheme}${latLng}(${label})`
    });
    if (url) Linking.openURL(url);
  };

  const callRecipient = () => job?.recipient_contact && Linking.openURL(`tel:${job.recipient_contact}`);
  const callPickupContact = () => job?.pickup_contact_mobile && Linking.openURL(`tel:${job.pickup_contact_mobile}`);

  // Auto-retry when connection returns
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      if (state.isConnected && state.isInternetReachable && syncStatus === 'sync_pending') {
        setSyncStatus('verifying');
        fetchJobDetails();
      }
    });

    return () => unsubscribe();
  }, [syncStatus, fetchJobDetails]);

  return {
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
    isTracking,
    isStartingDelivery,
    fetchJobDetails,
    isSelfUpdated,
    sequentialEnforcement,
  };
};
