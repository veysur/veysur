import type { Infer } from '@datacapy/schema'
import { Repo, RepoIndexBuilder as repib } from '@datacapy/server'

import type { SchemaEventLog } from '../../schema/SchemaEventLog'

export type EventLog = Infer<SchemaEventLog>

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
