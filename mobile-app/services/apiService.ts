import { api } from '@/utils/api';
import { Job } from '@/types';

export const getTasks = async (): Promise<Job[]> => {
  const response = await api.get('/api/requests');
  return Array.isArray(response.data) ? response.data : response.data.data;
};

export const getJobDetails = async (id: string): Promise<Job> => {
  const response = await api.get(`/api/requests/${id}`);
  return response.data;
};

export const updateJobStatus = async (id: string, status: string, remark: string) => {
  return api.put(`/api/requests/${id}/status`, {
    status,
    remark,
    timestamp: new Date().toISOString(),
  });
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
