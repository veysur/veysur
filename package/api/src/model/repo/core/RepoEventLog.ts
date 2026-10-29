import { Repo, RepoIndexBuilder as repib } from '@datacapy/server'

export interface EventLog {
  _id?: string
  action: string
  userId?: string
  metadata?: Record<string, unknown>
  createdAt: Date
}

export class RepoEventLog extends Repo<EventLog> {
  constructor() {
    super({
      name: 'eventLog',
      dataSource: 'project',
      autoIndex: false,
      relations: {},
      indexes: {
        createdAt: repib.desc('createdAt').timestamp('createdAt'),
        action: repib.asc('action'),
        userId: repib.asc('userId'),
      },
    })
  }
}

export default RepoEventLog
