import { api } from '@/utils/api';
import { Job } from '@/types';
import { addToQueue, getRiderStatusActions, queueRiderStatus, updateRiderAction } from './syncQueue';
import { getDb } from './localDb';
import { RouteEstimate } from '@/utils/eta';
import { AuthManager } from '@/utils/AuthManager';
import { triggerSync } from './SyncManager';

export const getDeliveryEta = async (
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number },
  requestId?: string,
): Promise<RouteEstimate> => {
  const response = await api.post('/api/routing/eta', {
    origin,
    destination,
    requestId,
  });
  return response.data;
};

const tasksCacheKey = (riderId: string) => `active_tasks:${riderId}`;
const jobCacheKey = (riderId: string, requestId: string) => `job:${riderId}:${requestId}`;
export const getJobQueryKey = (riderId: string, requestId: string) => ['job', riderId, requestId] as const;

export const getCachedTasks = async (riderId: string): Promise<Job[]> => {
  const db = await getDb();
  const row: any = await db.getFirstAsync('SELECT data FROM tasks_cache WHERE id = ?', [tasksCacheKey(riderId)]);
  return row ? JSON.parse(row.data) : [];
};

export const getCachedJobSnapshot = async (riderId: string, requestId: string): Promise<{ job: Job | null; savedAt: number | null }> => {
  const db = await getDb();
  const row: any = await db.getFirstAsync('SELECT data, updated_at FROM tasks_cache WHERE id = ?', [jobCacheKey(riderId, requestId)]);
  if (row) return { job: JSON.parse(row.data), savedAt: Number(row.updated_at) || null };
  const tasksRow: any = await db.getFirstAsync('SELECT data, updated_at FROM tasks_cache WHERE id = ?', [tasksCacheKey(riderId)]);
  const job = tasksRow ? (JSON.parse(tasksRow.data) as Job[]).find((task) => String(task.request_id) === String(requestId)) || null : null;
  return { job, savedAt: job ? Number(tasksRow.updated_at) || null : null };
};

export const getCachedJob = async (riderId: string, requestId: string): Promise<Job | null> => {
  return (await getCachedJobSnapshot(riderId, requestId)).job;
};

const saveJobStatusCache = async (riderId: string, requestId: string, status: string) => {
  const database = await getDb();
  const cachedJob = await getCachedJob(riderId, requestId);
  if (cachedJob) {
    const updated = { ...cachedJob, delivery_status: status };
    await database.runAsync('INSERT OR REPLACE INTO tasks_cache (id, data, updated_at) VALUES (?, ?, ?)',
      [jobCacheKey(riderId, requestId), JSON.stringify(updated), Date.now()]);
    const cachedTasks = await getCachedTasks(riderId);
    const updatedTasks = cachedTasks.map((job) => String(job.request_id) === String(requestId) ? updated : job);
    await database.runAsync('INSERT OR REPLACE INTO tasks_cache (id, data, updated_at) VALUES (?, ?, ?)',
      [tasksCacheKey(riderId), JSON.stringify(updatedTasks), Date.now()]);
  }
};

export const getTasks = async (riderId?: string): Promise<Job[]> => {
  const activeRiderId = riderId || (await AuthManager.getUserData())?.id;
  if (!activeRiderId) throw new Error('Sign in to load rider tasks.');
  try {
    const response = await api.get('/api/rider/tasks/active');
    const tasks = Array.isArray(response.data) ? response.data : response.data.data;
    
    // Update local cache (Slice 1.1)
    if (tasks) {
      const db = await getDb();
      await db.runAsync(
        "INSERT OR REPLACE INTO tasks_cache (id, data, updated_at) VALUES (?, ?, ?)",
        [tasksCacheKey(activeRiderId), JSON.stringify(tasks), Date.now()]
      );
    }
    
    return tasks;
  } catch (err: any) {
    if (!err.response || err.response.status >= 500) {
      const db = await getDb();
      const cached: any = await db.getFirstAsync('SELECT data FROM tasks_cache WHERE id = ?', [tasksCacheKey(activeRiderId)]);
      if (cached) {
        return JSON.parse(cached.data);
      }
    }
    throw err;
  }
};

export const getHistoryTasks = async (): Promise<Job[]> => {
  const response = await api.get('/api/rider/tasks/history', { params: { page: 1, limit: 50 } });
  return Array.isArray(response.data) ? response.data : response.data.data;
};

export const getJobDetails = async (id: string, riderId?: string): Promise<Job> => {
  const activeRiderId = riderId || (await AuthManager.getUserData())?.id;
  try {
    const response = await api.get(`/api/requests/${id}`);
    if (activeRiderId) {
      const db = await getDb();
      await db.runAsync('INSERT OR REPLACE INTO tasks_cache (id, data, updated_at) VALUES (?, ?, ?)',
        [jobCacheKey(activeRiderId, id), JSON.stringify(response.data), Date.now()]);
    }
    return response.data;
  } catch (error: any) {
    if ((!error.response || error.response.status >= 500) && activeRiderId) {
      const cached = await getCachedJob(activeRiderId, id);
      if (cached) return cached;
      throw new Error('No saved delivery details are available offline.');
    }
    throw error;
  }
};

export const updateJobStatus = async (id: string, status: string, remark: string, riderId?: string) => {
  const activeRiderId = riderId || (await AuthManager.getUserData())?.id;
  if (!activeRiderId) throw new Error('Sign in before updating a delivery.');
  const payload = {
    status,
    remark,
    timestamp: new Date().toISOString(),
  };

  const { operationId } = await queueRiderStatus({ riderId: activeRiderId, requestId: id, status, remark, timestamp: payload.timestamp });
  try {
    await saveJobStatusCache(activeRiderId, id, status);
  } catch (error) {
    console.warn('[apiService] Delivery action was saved, but its task cache could not be updated:', error);
  }
  const deliveryActions = await getRiderStatusActions(activeRiderId, id);
  const hasEarlierUnresolvedAction = deliveryActions.some((action) =>
    action.operation_id !== operationId && action.state !== 'acked',
  );
  if (hasEarlierUnresolvedAction) {
    void triggerSync();
    return { success: true, queued: true, operationId };
  }
  try {
    const response = await api.put(`/api/requests/${id}/status`, payload, {
      headers: { 'Idempotency-Key': operationId }
    });
    await updateRiderAction(operationId, 'acked');
    return { success: true, queued: false, operationId, deliveryStatus: response.data?.deliveryStatus || status };
  } catch (err: any) {
    if (!err.response) {
      return { success: true, queued: true, operationId };
    }
    const responseStatus = err.response?.status;
    if (responseStatus >= 400 && responseStatus < 500 && responseStatus !== 429) {
      await updateRiderAction(operationId, 'needs_attention', err.response?.data?.error || err.message);
    }
    throw err;
  }
};

export const getNotifications = async (userId: string) => {
  const response = await api.get('/api/notifications', {
    params: { userId },
  });
  return response.data;
};

export const markNotificationAsRead = async (notificationId: string) => {
  return api.put(`/api/notifications/${notificationId}/read`);
};

export const markAllNotificationsAsRead = async (userId: string) => {
  return api.put(`/api/notifications/read-all/${userId}`);
};

export const updateDutyStatus = async (userId: string, is_on_duty: boolean) => {
  return api.post(`/api/users/${userId}/duty`, { is_on_duty });
};

export const endShift = async (userId: string, operation_id: string, reason?: string) => {
  return api.post(`/api/users/${userId}/shift/end`, { operation_id, reason });
};

export const submitAttendance = async (userId: string, status: 'present' | 'absent' | 'on_leave', reason?: string, operation_id?: string) => {
  const response = await api.post(`/api/users/${userId}/attendance`, { status, reason, operation_id });
  if (status === 'present' && (!response.data?.success || !response.data?.session?.start_time)) {
    throw new Error('The server did not confirm your shift start. Please try again.');
  }
  return response;
};

export const getMyShiftSession = async () => (await api.get('/api/users/me/shift-session')).data;

export const getMyAttendance = async () => {
  const res = await api.get('/api/users/me/attendance');
  return res.data; // { status: 'absent' | 'present' | 'on_leave' | null }
};

export const updateLocationBackground = async (data: {
  riderId: string;
  lat: number;
  lng: number;
  requestId: string;
  heading?: number | null;
  accuracy?: number | null;
  timestamp?: number;
  batteryLevel?: number;
  networkType?: string;
}) => {
  try {
    return await api.post('/api/users/location', data);
  } catch (err: any) {
    if (!err.response) {
      // Network failure: Buffer the location update
      console.warn('[Location] Network offline, buffering coordinate to sync queue');
      try {
        await addToQueue({
          endpoint: '/api/users/location',
          method: 'POST',
          payload: data
        });
        return { success: true, buffered: true };
      } catch (queueErr) {
        console.error('[Location] Failed to buffer coordinate:', queueErr);
      }
    }
    throw err;
  }
};
