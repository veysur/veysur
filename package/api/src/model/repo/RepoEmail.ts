import type { Infer } from '@datacapy/schema'
import { Repo, RepoIndexBuilder as repib } from '@datacapy/server'

import type { SchemaEmail } from '../schema/SchemaEmail'

export type Email = Partial<Infer<SchemaEmail>> &
  Required<Pick<Infer<SchemaEmail>, 'type' | 'to' | 'subject'>>

export class RepoEmail extends Repo<Email> {
  constructor() {
    super({
      name: 'email',
      autoIndex: false,
      relations: {},
      indexes: {
        createdAt: repib.desc('createdAt').timestamp(),
        user: repib.asc('userId').desc('createdAt').timestamp('createdAt'),
        to: repib.asc('to').desc('createdAt').timestamp('createdAt'),
        project: repib
          .asc('projectId')
          .desc('createdAt')
          .timestamp('createdAt'),
        queueStatus: repib
          .asc('status')
          .asc('scheduledAt')
          .timestamp('scheduledAt'),
      },
    })
  }

  async save(email: Email) {
    if (email._id) {
      const { _id, ...fields } = email
      return await this.updateOne({ _id }, { $set: fields })
    } else {
      return await this.insertOne(email)
    }
  }
}

export default RepoEmail
