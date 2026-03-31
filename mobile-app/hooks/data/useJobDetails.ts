import { useState, useEffect, useRef } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, Linking, Platform } from 'react-native';
import * as Location from 'expo-location';
import { io, Socket } from 'socket.io-client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getJobDetails, updateJobStatus } from '@/services/apiService';
import { useAuth } from '@/context/AuthContext';
import { Job } from '@/types';
import { Config } from '@/constants/Config';

import NetInfo from '@react-native-community/netinfo';

export type JobSyncStatus = 'synced' | 'pending' | 'verifying' | 'sync_pending' | 'sync_error';

export const useJobDetails = () => {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const [locationPermission, setLocationPermission] = useState<boolean | null>(null);
  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const [statusType, setStatusType] = useState<'completed' | 'failed' | null>(null);
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [customRemark, setCustomRemark] = useState<string>('');
  const [syncStatus, setSyncStatus] = useState<JobSyncStatus>('synced');
  
  // Use TanStack Query for Job Details
  const {
    data: job,
    isLoading: loading,
    refetch: fetchJobDetails,
  } = useQuery({
    queryKey: ['job', id],
    queryFn: () => getJobDetails(id as string),
    enabled: !!id,
    staleTime: 30000, // 30 seconds
  });

  // Use TanStack Mutation for Status Updates (Optimistic UI)
  const updateMutation = useMutation({
    mutationFn: ({ status, remark }: { status: string; remark: string }) => 
      updateJobStatus(id as string, status, remark),
    
    // When mutate is called:
    onMutate: async (newStatusData) => {
      setSyncStatus('pending');
      
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
        startTracking();
      } else if (['completed', 'failed', 'cancelled'].includes(variables.status)) {
        stopTracking();
      }
      setStatusModalVisible(false);
      // Small success feedback is fine, but not blocking
    }
  });

  const updating = updateMutation.isPending || syncStatus === 'pending' || syncStatus === 'verifying';
  const socketRef = useRef<Socket | null>(null);
  const watchId = useRef<Location.LocationSubscription | null>(null);
  const isMounted = useRef(true);

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

  const requestLocationPermission = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    setLocationPermission(status === 'granted');
  };

  const startTracking = async () => {
    if (!locationPermission) {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      setLocationPermission(true);
    }

    if (watchId.current) return;

    try {
      const subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          distanceInterval: 20,
          timeInterval: 15000,
        },
        (location) => {
          const { latitude, longitude } = location.coords;
          if (socketRef.current && job) {
            socketRef.current.emit('update-location', {
              riderId: user?.id,
              riderName: user?.name,
              lat: latitude,
              lng: longitude,
              requestId: job.request_id,
            });
          }
        }
      );

      if (!isMounted.current) {
        subscription.remove();
      } else {
        watchId.current = subscription;
      }
    } catch (err) {
      console.error('Error starting location tracking:', err);
    }
  };

  const stopTracking = () => {
    if (watchId.current) {
      watchId.current.remove();
      watchId.current = null;
    }
  };

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
    isMounted.current = true;
    requestLocationPermission();

    socketRef.current = io(Config.API_URL, { 
      transports: ['websocket'],
      reconnectionAttempts: 3
    });

    return () => {
      isMounted.current = false;
      stopTracking();
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [id]);

  useEffect(() => {
    if (socketRef.current && id) {
      socketRef.current.emit('join-job-room', id);
      socketRef.current.on('job-status-changed', (data: any) => {
        if (data.requestId === id) {
          queryClient.invalidateQueries({ queryKey: ['job', id] });
          if (['completed', 'failed', 'cancelled'].includes(data.status)) {
            stopTracking();
          }
        }
      });
    }
  }, [id, queryClient]);

  useEffect(() => {
    if (job?.delivery_status === 'in_progress') {
      startTracking();
    }
  }, [job?.delivery_status]);

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
  };
};
