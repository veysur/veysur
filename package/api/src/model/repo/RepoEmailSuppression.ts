import { Repo, TYPE_HINT_TIMESTAMP } from '@datacapy/server'
import { EmailSuppression } from 'veysur-common'

export class RepoEmailSuppression extends Repo<EmailSuppression> {
  constructor() {
    super({
      name: 'emailSuppression',
      autoIndex: false,
      relations: {},
      indexes: {
        email: {
          spec: { email: 1 },
          options: { unique: true },
        },
        reason: {
          spec: { reason: 1, createdAt: -1 },
          options: { typeHint: { createdAt: TYPE_HINT_TIMESTAMP } },
        },
        complaintEvents: {
          spec: {
            'complaintEvents.projectId': 1,
            'complaintEvents.occurredAt': -1,
          },
          options: {
            typeHint: { 'complaintEvents.occurredAt': TYPE_HINT_TIMESTAMP },
          },
        },
        createdAt: {
          spec: { createdAt: -1 },
          options: { typeHint: TYPE_HINT_TIMESTAMP },
        },
        expiresAt: {
          spec: { expiresAt: 1 },
          options: { typeHint: { expiresAt: TYPE_HINT_TIMESTAMP } },
        },
      },
    })
  }
}

export default RepoEmailSuppression
