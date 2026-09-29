import { Repo } from '@datacapy/server'

export interface EventLogSystem {
  _id?: string
  action: string
  userId?: string
  metadata?: Record<string, unknown>
  createdAt: Date
}

export class RepoEventLogSystem extends Repo<EventLogSystem> {
  constructor() {
    super({
      name: 'eventLogSystem',
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

export default RepoEventLogSystem
