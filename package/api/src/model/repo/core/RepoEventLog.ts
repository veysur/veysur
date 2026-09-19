import { Repo } from 'mzen-server'

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
        createdAt: {
          spec: { createdAt: -1 },
          options: { typeHint: { createdAt: 'timestamp' } },
        },
        action: {
          spec: { action: 1 },
        },
        userId: {
          spec: { userId: 1 },
        },
      },
    })
  }
}

export default RepoEventLog
