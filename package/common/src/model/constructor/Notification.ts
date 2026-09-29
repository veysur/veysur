import { genUniqueId } from '@datacapy/id'

import { DataTransferJob } from './DataTransferJob'

/**
 * Persisted notification row, related to (not replacing) the entity that
 * produced it. Today only DataTransferJob produces notifications
 * (dataTransferJobId), so `type` is a single-member union - extend it and
 * add a matching nullable FK field when a second producer appears. @datacapy/om
 * relations bind to one repo each, so there is no single polymorphic
 * relatedEntityId field: each related-entity-type gets its own FK + its own
 * `belongsToOne` relation on RepoNotification.
 */
export class Notification {
  _id: string
  type: 'dataTransferJob'
  projectId: string
  recipientUserId: string
  dataTransferJobId: string | null
  dataTransferJob: DataTransferJob | null
  level: 'info' | 'success' | 'error'
  title: string
  message: string | null
  status: 'unread' | 'read' | 'dismissed'
  createdAt: Date
  readAt: Date | null
  dismissedAt: Date | null

  constructor(data: Partial<Notification> = {}) {
    this._id = data._id || genUniqueId()
    this.type = data.type || 'dataTransferJob'
    this.projectId = data.projectId || ''
    this.recipientUserId = data.recipientUserId || ''
    this.dataTransferJobId = data.dataTransferJobId || null
    this.dataTransferJob =
      (data.dataTransferJob && new DataTransferJob(data.dataTransferJob)) || null
    this.level = data.level || 'info'
    this.title = data.title || ''
    this.message = data.message || null
    this.status = data.status || 'unread'
    this.createdAt = data.createdAt || new Date()
    this.readAt = data.readAt || null
    this.dismissedAt = data.dismissedAt || null
  }
}

export default Notification
