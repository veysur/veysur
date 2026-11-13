import { Infer, SchemaBuilder as sb } from '@datacapy/schema'
import type { tags as t } from '@datacapy/schema'

import { DataTransferJob } from './DataTransferJob'
import { SchemaNotification } from './Notification.schema'

type InternalId = string & t.MaxLength<17>

/** @schema notification construct=Notification strict */
export interface NotificationFields {
  _id: InternalId & t.Required & t.InitFn<'genUniqueId'>
  type: 'dataTransferJob' & t.Required & t.Default<'dataTransferJob'>
  projectId: InternalId & t.Required & t.Init<''>
  recipientUserId: InternalId & t.Required & t.Init<''>
  dataTransferJobId: (InternalId & t.Default<null>) | null
  level: ('info' | 'success' | 'error') & t.Required & t.Default<'info'>
  title: string & t.Required & t.Init<''> & t.MaxLength<255>
  message: (string & t.Default<null>) | null
  status: ('unread' | 'read' | 'dismissed') & t.Required & t.Default<'unread'>
  createdAt: Date & t.Default<'now'>
  readAt: (Date & t.Default<null>) | null
  dismissedAt: (Date & t.Default<null>) | null
  /** Populated relation: the job that produced the notification */
  dataTransferJob?:
    | (unknown & t.Relation & t.Construct<'DataTransferJob'> & t.Default<null>)
    | null
}

/** Fields come from the generated {@link SchemaNotification}. */
export interface Notification extends Omit<
  Infer<SchemaNotification>,
  'dataTransferJob'
> {}

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
  dataTransferJob: DataTransferJob | null

  constructor(data: Partial<Notification> = {}) {
    const applied = sb.applyDefaults(
      new SchemaNotification().builderFields(),
      data,
    )
    Object.assign(this, applied)
    // The schema names the constructor, which a bare `new Notification()` cannot resolve
    const job = applied.dataTransferJob
    this.dataTransferJob =
      job === null || job === undefined ? null : new DataTransferJob(job)
  }
}

export default Notification
