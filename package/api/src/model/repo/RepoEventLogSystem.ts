import type { Infer } from '@datacapy/schema'
import { Repo, RepoIndexBuilder as repib } from '@datacapy/server'

import type { SchemaEventLogSystem } from '../schema/SchemaEventLogSystem'

export type EventLogSystem = Infer<SchemaEventLogSystem>

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
