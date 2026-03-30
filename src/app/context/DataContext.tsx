import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { DeliveryRequest, Notification, DeliveryStatus } from '../types';
import { useAuth } from './AuthContext';
import { io, Socket } from 'socket.io-client';

interface DataContextType {
  requests: DeliveryRequest[];
  notifications: Notification[];
  submitRequest: (request: Omit<DeliveryRequest, 'request_id' | 'requester_id' | 'created_at' | 'status'>) => Promise<void>;
  resubmitRequest: (requestId: string, request: Omit<DeliveryRequest, 'request_id' | 'requester_id' | 'created_at' | 'status'>) => Promise<void>;
  approveRequest: (requestId: string, riderId: string, adminRemark?: string) => Promise<void>;
  disapproveRequest: (requestId: string, adminRemark?: string) => Promise<void>;
  returnForRevision: (requestId: string, adminRemark: string) => Promise<void>;
  updateDeliveryStatus: (requestId: string, status: DeliveryStatus, remark?: string, currentLat?: number, currentLng?: number) => Promise<void>;
  cancelRequest: (requestId: string) => Promise<void>;
  markNotificationRead: (notificationId: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  getRequestById: (requestId: string) => DeliveryRequest | undefined;
  refreshData: () => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);
const API_URL = '/api';

export function DataProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [requests, setRequests] = useState<DeliveryRequest[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const socketRef = React.useRef<Socket | null>(null);
  const pendingOptimisticIds = React.useRef<Set<string>>(new Set());

  const fetchRequests = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/requests`);
      if (res.ok) {
        const json = await res.json();
        let data: DeliveryRequest[] = Array.isArray(json) ? json : (json.data || []);
        
        setRequests(prev => {
          const optimisticIds = pendingOptimisticIds.current;
          
          // Create a map of existing exceptions/optimistic states to carry over
          const existingStates = new Map<string, Partial<DeliveryRequest>>();
          (prev || []).forEach(r => {
            if (r.exceptions || r.is_optimistic) {
              existingStates.set(r.request_id, {
                exceptions: r.exceptions,
                exception_severity: r.exception_severity,
                is_optimistic: r.is_optimistic,
                // If it was optimistic, we might want to keep the optimistic field values 
                // until the server definitely has the new data
                status: r.is_optimistic ? r.status : undefined,
                delivery_status: r.is_optimistic ? r.delivery_status : undefined,
                assigned_rider_id: r.is_optimistic ? r.assigned_rider_id : undefined,
              });
            }
          });

          // Merge server data with existing local states
          const merged = data.map(newItem => {
            const state = existingStates.get(newItem.request_id);
            if (!state) return newItem;

            if (state.is_optimistic) {
              // Senior Logic: If we are optimistic, we trust our local data more than the server's
              // until the server status catches up to our expected state.
              const isSyncComplete = newItem.status === state.status;
              
              if (!isSyncComplete) {
                return {
                  ...newItem,
                  ...state, // Preserve local edits (recipient, locations, etc.)
                  is_optimistic: true
                };
              }
            }

            return {
              ...newItem,
              exceptions: newItem.exceptions || state.exceptions,
              exception_severity: newItem.exception_severity || state.exception_severity,
              is_optimistic: false
            };
          });

          // Add any purely optimistic items (like new requests not yet in DB)
          prev.forEach(p => {
            if (p.is_optimistic && 
                pendingOptimisticIds.current.has(p.request_id) &&
                !merged.find(m => m.request_id === p.request_id)) {
              merged.unshift(p);
            }
          });

          return merged;
        });
      }
    } catch (err) {
      console.error("Failed to fetch requests", err);
    }
  }, []);

  const fetchNotifications = useCallback(async () => {
    if (!user?.id) return;
    try {
      const res = await fetch(`${API_URL}/notifications?userId=${user.id}`);
      if (res.ok) {
        const data = await res.json();
        let notifArray: any[] = Array.isArray(data) ? data : (data.data || []);
        setNotifications(notifArray.map((n: any) => ({ ...n, read: Boolean(n.is_read) })));
      }
    } catch (err) {
      console.error("Failed to fetch notifications", err);
    }
  }, [user?.id]);

  const refreshData = useCallback(async () => {
    await Promise.all([fetchRequests(), fetchNotifications()]);
  }, [fetchRequests, fetchNotifications]);

  // Initial Load
  useEffect(() => {
    refreshData();
  }, [user?.id, refreshData]);

  // Socket.io for Real-time Updates (No Polling Needed)
  useEffect(() => {
    if (!user?.id) return;

    // Use current origin for socket to prevent CORS issues in production
    socketRef.current = io();
    const socket = socketRef.current;

    socket.on('connect', () => {
      console.log('Web Socket connected');
      socket.emit('join-room', user.id); // For general user updates
      socket.emit('join-room', 'admin-room'); // If admin, join admin broadcast
    });

    socket.on('rider-location-updated', (data: { requestId: string, lat: number, lng: number }) => {
      if (pendingOptimisticIds.current.has(data.requestId)) return;
      setRequests(prev => (prev || []).map(req => 
        req.request_id === data.requestId 
          ? { 
              ...req, 
              current_lat: data.lat, 
              current_lng: data.lng,
              current_location: { lat: data.lat, lng: data.lng } 
            }
          : req
      ));
    });

    socket.on('delivery-status-updated', () => {
      fetchRequests(); // Refresh list on status change
    });

    socket.on('mbe-sync', (data: { requestId: string, exceptions: string[], severity: 'warning' | 'critical' }[]) => {
      setRequests(prev => {
        const updated = [...(prev || [])];
        data.forEach(item => {
          const idx = updated.findIndex(r => r.request_id === item.requestId);
          if (idx !== -1) {
            updated[idx] = { ...updated[idx], exceptions: item.exceptions, exception_severity: item.severity };
          }
        });
        return updated;
      });
    });

    socket.on('exception-detected', (data: { requestId: string, exceptions: string[], severity: 'warning' | 'critical' }) => {
      setRequests(prev => (prev || []).map(req => 
        req.request_id === data.requestId 
          ? { ...req, exceptions: data.exceptions, exception_severity: data.severity }
          : req
      ));
    });

    socket.on('exception-cleared', (data: { requestId: string }) => {
      setRequests(prev => (prev || []).map(req => 
        req.request_id === data.requestId 
          ? { ...req, exceptions: undefined, exception_severity: undefined }
          : req
      ));
    });

    socket.on('request-updated', () => {
      fetchRequests(); // Refresh list on request change
    });

    socket.on('new_assignment', () => {
      refreshData();
    });

    socket.on('notification-added', () => {
      fetchNotifications();
    });

    return () => {
      if (socket) {
        socket.disconnect();
        socketRef.current = null;
      }
    };
  }, [user?.id, fetchRequests, fetchNotifications, refreshData]);

  const submitRequest = async (requestData: Omit<DeliveryRequest, 'request_id' | 'requester_id' | 'created_at' | 'status'>) => {
    if (!user) return;
    
    // Optimistic Update
    const tempId = `temp-${Date.now()}`;
    const optimisticRequest: DeliveryRequest = {
      ...requestData,
      request_id: tempId,
      requester_id: user.id,
      requester_name: user.name,
      requester_department: user.department,
      created_at: new Date().toISOString(),
      status: 'submitted_waiting',
      is_optimistic: true
    };

    pendingOptimisticIds.current.add(tempId);
    setRequests(prev => [optimisticRequest, ...prev]);

    try {
      const response = await fetch(`${API_URL}/requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...requestData,
          requester_id: user.id,
          requester_name: user.name,
          requester_department: user.department,
        })
      });
      
      if (response.ok) {
        // Remove temp request and let fetchRequests get the real one
        pendingOptimisticIds.current.delete(tempId);
        await fetchRequests();
      } else {
        // Rollback
        pendingOptimisticIds.current.delete(tempId);
        setRequests(prev => prev.filter(r => r.request_id !== tempId));
        console.error("Failed to submit request");
      }
    } catch (error) {
      pendingOptimisticIds.current.delete(tempId);
      setRequests(prev => prev.filter(r => r.request_id !== tempId));
      console.error(error);
    }
  };

  const resubmitRequest = async (requestId: string, requestData: Omit<DeliveryRequest, 'request_id' | 'requester_id' | 'created_at' | 'status'>) => {
    if (!user) return;
    
    const previousRequests = [...requests];

    // Optimistic Update
    pendingOptimisticIds.current.add(requestId);
    setRequests(prev => prev.map(req => 
      req.request_id === requestId 
        ? { ...req, ...requestData, status: 'submitted_waiting', is_optimistic: true }
        : req
    ));

    try {
      const response = await fetch(`${API_URL}/requests/${requestId}/resubmit`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...requestData,
          requester_id: user.id,
        })
      });
      
      if (response.ok) {
        pendingOptimisticIds.current.delete(requestId);
        await fetchRequests();
      } else {
        // Rollback
        pendingOptimisticIds.current.delete(requestId);
        setRequests(previousRequests);
        console.error("Failed to resubmit request");
      }
    } catch (error) {
      pendingOptimisticIds.current.delete(requestId);
      setRequests(previousRequests);
      console.error(error);
    }
  };

  const approveRequest = async (requestId: string, riderId: string, adminRemark?: string) => {
    const previousRequests = [...requests];
    
    // Optimistic Update
    pendingOptimisticIds.current.add(requestId);
    setRequests(prev => prev.map(req => 
      req.request_id === requestId 
        ? { ...req, status: 'approved', assigned_rider_id: riderId, admin_remark: adminRemark, is_optimistic: true } 
        : req
    ));

    try {
      const response = await fetch(`${API_URL}/requests/${requestId}/approve`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rider_id: riderId, admin_remark: adminRemark })
      });
      
      if (response.ok) {
        pendingOptimisticIds.current.delete(requestId);
        await fetchRequests();
      } else {
        pendingOptimisticIds.current.delete(requestId);
        setRequests(previousRequests);
      }
    } catch (error) {
      pendingOptimisticIds.current.delete(requestId);
      setRequests(previousRequests);
      console.error(error);
    }
  };

  const disapproveRequest = async (requestId: string, adminRemark?: string) => {
    const previousRequests = [...requests];

    // Optimistic Update
    pendingOptimisticIds.current.add(requestId);
    setRequests(prev => prev.map(req => 
      req.request_id === requestId 
        ? { ...req, status: 'disapproved', admin_remark: adminRemark, is_optimistic: true } 
        : req
    ));

    try {
      const response = await fetch(`${API_URL}/requests/${requestId}/disapprove`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ admin_remark: adminRemark })
      });

      if (response.ok) {
        pendingOptimisticIds.current.delete(requestId);
        await fetchRequests();
      } else {
        pendingOptimisticIds.current.delete(requestId);
        setRequests(previousRequests);
      }
    } catch (error) {
      pendingOptimisticIds.current.delete(requestId);
      setRequests(previousRequests);
      console.error(error);
    }
    };

    const returnForRevision = async (requestId: string, adminRemark: string) => {
    const previousRequests = [...requests];

    // Optimistic Update
    pendingOptimisticIds.current.add(requestId);
    setRequests(prev => prev.map(req =>
      req.request_id === requestId
        ? { ...req, status: 'returned_for_revision', admin_remark: adminRemark, is_optimistic: true }
        : req
    ));

    try {
      const response = await fetch(`${API_URL}/requests/${requestId}/return`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ admin_remark: adminRemark })
      });

      if (response.ok) {
        pendingOptimisticIds.current.delete(requestId);
        await fetchRequests();
      } else {
        pendingOptimisticIds.current.delete(requestId);
        setRequests(previousRequests);
      }
    } catch (error) {
      pendingOptimisticIds.current.delete(requestId);
      setRequests(previousRequests);
      console.error(error);
    }
    };
  const updateDeliveryStatus = async (requestId: string, status: DeliveryStatus, remark?: string, currentLat?: number, currentLng?: number) => {
    const previousRequests = [...requests];

    // Optimistic Update
    pendingOptimisticIds.current.add(requestId);
    setRequests(prev => prev.map(req => 
      req.request_id === requestId 
        ? { ...req, delivery_status: status, rider_remark: remark, is_optimistic: true } 
        : req
    ));

    try {
      const response = await fetch(`${API_URL}/requests/${requestId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status, 
          remark,
          current_lat: currentLat,
          current_lng: currentLng
        })
      });
      
      if (response.ok) {
        pendingOptimisticIds.current.delete(requestId);
        await fetchRequests();
      } else {
        pendingOptimisticIds.current.delete(requestId);
        setRequests(previousRequests);
      }
    } catch (error) {
      pendingOptimisticIds.current.delete(requestId);
      setRequests(previousRequests);
      console.error(error);
    }
  };

  const cancelRequest = async (requestId: string) => {
    const previousRequests = [...requests];

    // Optimistic Update
    pendingOptimisticIds.current.add(requestId);
    setRequests(prev => prev.filter(r => r.request_id !== requestId));

    try {
      const response = await fetch(`${API_URL}/requests/${requestId}/cancel`, {
        method: 'PUT'
      });
      
      if (response.ok) {
        pendingOptimisticIds.current.delete(requestId);
        await fetchRequests();
      } else {
        pendingOptimisticIds.current.delete(requestId);
        setRequests(previousRequests);
      }
    } catch (error) {
      pendingOptimisticIds.current.delete(requestId);
      setRequests(previousRequests);
      console.error(error);
    }
  };

  const markNotificationRead = async (notificationId: string) => {
    try {
      await fetch(`${API_URL}/notifications/${notificationId}/read`, { method: 'PUT' });
      await fetchNotifications();
    } catch (error) {
      console.error(error);
    }
  };

  const markAllNotificationsRead = async () => {
    if (!user) return;
    try {
      setNotifications(prev => (prev || []).map(n => n.user_id === user.id ? { ...n, read: true } : n));
      await fetch(`${API_URL}/notifications/read-all/${user.id}`, { method: 'PUT' });
      await fetchNotifications();
    } catch (error) {
      console.error(error);
    }
  };

  const getRequestById = (requestId: string) => {
    return requests.find(req => req.request_id === requestId);
  };

  return (
    <DataContext.Provider
      value={{
        requests,
        notifications,
        submitRequest,
        resubmitRequest,
        approveRequest,
        disapproveRequest,
        returnForRevision,
        updateDeliveryStatus,
        cancelRequest,
        markNotificationRead,
        markAllNotificationsRead,
        getRequestById,
        refreshData
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}
