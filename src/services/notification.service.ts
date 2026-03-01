import { api, ApiResponse } from './api';

export interface Notification {
  id: string;
  userId: string;
  tenantId: string;
  type: 'BATCH_COMPLETED' | 'BATCH_FAILED' | 'JOB_COMPLETED' | 'JOB_FAILED' | 'SYSTEM_ALERT';
  title: string;
  message: string;
  data?: Record<string, unknown>;
  read: boolean;
  readAt?: string;
  link?: string;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationPage {
  notifications: Notification[];
  total: number;
  page: number;
  pages: number;
}

const BASE_URL = '/notifications';

export const notificationService = {
  async getUnread(): Promise<Notification[]> {
    const res = await api.get<ApiResponse<Notification[]>>(`${BASE_URL}/unread`);
    return res.data.data;
  },

  async getAll(page = 1): Promise<NotificationPage> {
    const res = await api.get<ApiResponse<NotificationPage>>(`${BASE_URL}?page=${page}`);
    return res.data.data;
  },

  async getUnreadCount(): Promise<number> {
    const res = await api.get<ApiResponse<{ count: number }>>(`${BASE_URL}/count`);
    return res.data.data.count;
  },

  async markAsRead(notificationId: string): Promise<void> {
    await api.patch(`${BASE_URL}/${notificationId}/read`);
  },

  async markAllAsRead(): Promise<void> {
    await api.post(`${BASE_URL}/mark-all-read`);
  },

  async deleteNotification(notificationId: string): Promise<void> {
    await api.delete(`${BASE_URL}/${notificationId}`);
  },
};
