import { api } from '@/utils/api';
import { Job } from '@/types';
import { addToQueue } from './syncQueue';
import { getDb } from './localDb';
import * as Crypto from 'expo-crypto';

export const getTasks = async (): Promise<Job[]> => {
  try {
    const response = await api.get('/api/rider/tasks/active');
    const tasks = Array.isArray(response.data) ? response.data : response.data.data;
    
    // Update local cache (Slice 1.1)
    if (tasks) {
      const db = await getDb();
      await db.runAsync(
        "INSERT OR REPLACE INTO tasks_cache (id, data, updated_at) VALUES (?, ?, ?)",
        ['active_tasks', JSON.stringify(tasks), Date.now()]
      );
    }
    
    return tasks;
  } catch (err: any) {
    if (!err.response) {
      // Offline fallback: load from local SQLite
      console.warn('[apiService] Offline detected, loading tasks from local cache');
      const db = await getDb();
      const cached: any = await db.getFirstAsync("SELECT data FROM tasks_cache WHERE id = 'active_tasks'");
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

export const getJobDetails = async (id: string): Promise<Job> => {
  const response = await api.get(`/api/requests/${id}`);
  return response.data;
};

export const updateJobStatus = async (id: string, status: string, remark: string) => {
  const idempotencyKey = Crypto.randomUUID();
  const payload = {
    status,
    remark,
    timestamp: new Date().toISOString(),
  };

  // Enterprise Pattern (Slice 1.2): Attempt direct call, fallback to queue on network failure
  try {
    return await api.put(`/api/requests/${id}/status`, payload, {
      headers: { 'Idempotency-Key': idempotencyKey }
    });
  } catch (err: any) {
    if (!err.response) {
      // No response = Network error
      console.warn('[apiService] Network error during status update, queueing for offline sync');
      // Reuse the same idempotency key for the queued retry
      const db = await getDb();
      const now = Date.now();
      const expiresAt = now + (24 * 60 * 60 * 1000);
      await db.runAsync(
        `INSERT INTO sync_queue (endpoint, method, payload, idempotency_key, created_at, expires_at) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [`/api/requests/${id}/status`, 'PUT', JSON.stringify(payload), idempotencyKey, now, expiresAt]
      );
      return { success: true, queued: true, idempotencyKey };
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

export const updateLocationBackground = async (data: {
  riderId: string;
  lat: number;
  lng: number;
  requestId: string;
  heading?: number | null;
  accuracy?: number | null;
  timestamp?: number;
}) => {
  return api.post('/api/users/location', data);
};
