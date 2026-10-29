import { Repo, RepoIndexBuilder as repib } from '@datacapy/server'

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
        createdAt: repib.desc('createdAt').timestamp('createdAt'),
        action: repib.asc('action'),
        userId: repib.asc('userId'),
      },
    })
  }
}

export default RepoEventLogSystem
