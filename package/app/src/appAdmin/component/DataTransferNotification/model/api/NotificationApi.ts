import { Api, ErrorRest } from 'model'

export type NotificationType = 'dataTransferJob'
export type NotificationLevel = 'info' | 'success' | 'error'
export type NotificationStatus = 'unread' | 'read' | 'dismissed'
export type DataTransferJobStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'

export type NotificationListItem = {
  notificationId: string
  type: NotificationType
  level: NotificationLevel
  title: string
  message: string | null
  status: NotificationStatus
  dataTransferJobId: string | null
  dataTransferJobStatus?: DataTransferJobStatus
  dataTransferJobError?: string | null
  downloadUrl?: string
  filename?: string
  expiresAt?: string
  createdAt: string
}

export type ListNotificationsResponse = {
  notifications: NotificationListItem[]
  notificationCount: number
}

export class NotificationApi extends Api {
  async listNotifications(
    page = 1,
    perPage = 20,
  ): Promise<ListNotificationsResponse> {
    try {
      return await this.getClient().get<ListNotificationsResponse>(
        `/notification/list?page=${page}&perPage=${perPage}`,
      )
    } catch (error) {
      throw ErrorRest.fromRequestError(error as Error)
    }
  }

  async markRead(notificationId: string): Promise<void> {
    try {
      await this.getClient().post(`/notification/${notificationId}/read`, {})
    } catch (error) {
      throw ErrorRest.fromRequestError(error as Error)
    }
  }

  async dismiss(notificationId: string): Promise<void> {
    try {
      await this.getClient().delete(`/notification/${notificationId}`)
    } catch (error) {
      throw ErrorRest.fromRequestError(error as Error)
    }
  }
}
