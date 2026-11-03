import { Infer, SchemaBuilder as sb } from '@datacapy/schema'

import { notificationSpec } from '../schema/SchemaNotification'
import { DataTransferJob } from './DataTransferJob'

/** Fields come from {@link notificationSpec}. */
export interface Notification extends Omit<
  Infer<typeof notificationSpec>,
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
    Object.assign(this, sb.applyDefaults(notificationSpec, data))
  }
}

export default Notification
