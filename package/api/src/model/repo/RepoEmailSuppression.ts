import { Repo, RepoIndexBuilder as repib } from '@datacapy/server'
import { EmailSuppression } from 'veysur-common'

export class RepoEmailSuppression extends Repo<EmailSuppression> {
  constructor() {
    super({
      name: 'emailSuppression',
      autoIndex: false,
      relations: {},
      indexes: {
        email: repib.asc('email').unique(),
        reason: repib.asc('reason').desc('createdAt').timestamp('createdAt'),
        complaintEvents: repib
          .asc('complaintEvents.projectId')
          .desc('complaintEvents.occurredAt')
          .timestamp('complaintEvents.occurredAt'),
        createdAt: repib.desc('createdAt').timestamp(),
        expiresAt: repib.asc('expiresAt').timestamp('expiresAt'),
      },
    })
  }
}

export default RepoEmailSuppression
