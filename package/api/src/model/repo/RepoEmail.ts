import { SchemaBuilder as sb } from '@datacapy/schema'
import { Repo, RepoIndexBuilder as repib } from '@datacapy/server'

export interface Email {
  _id?: string
  userId?: string
  projectId?: string
  service?: string
  type: string
  to: string
  from?: string
  envelopeFrom?: string
  subject: string
  template?: string
  html?: string
  text?: string
  templateData?: Record<string, unknown>
  messageId?: string
  data?: Record<string, unknown>
  error?: string
  attempts?: number
  status?: 'pending' | 'sent' | 'error'
  scheduledAt?: Date
  sent?: Date
  updatedAt?: Date
  createdAt?: Date
}

export class RepoEmail extends Repo<Email> {
  constructor() {
    super({
      name: 'email',
      autoIndex: false,
      relations: {},
      schema: sb.schema().shape({
        _id: sb.string(),
        userId: sb.string().default(null),
        projectId: sb.string().default(null),
        service: sb
          .string()
          .required()
          .notNull()
          .maxLength(127)
          .lowercase()
          .trim(),
        type: sb
          .string()
          .required()
          .notNull()
          .maxLength(512)
          .lowercase()
          .trim(),
        to: sb
          .string()
          .required()
          .notNull()
          .email()
          .maxLength(512)
          .lowercase()
          .trim(),
        from: sb
          .string()
          .required()
          .notNull()
          .email()
          .maxLength(512)
          .lowercase()
          .trim(),
        subject: sb.string().required().notNull().maxLength(2048).trim(),
        template: sb.string().maxLength(2048).trim().default(null),
        html: sb.string().maxLength(50000).trim().default(null),
        text: sb.string().maxLength(50000).trim().default(null),
        templateData: sb.object(),
        messageId: sb.string().maxLength(2048).trim(),
        data: sb.object(),
        error: sb.string().maxLength(2048).trim(),
        attempts: sb.number().default(0),
        status: sb
          .string()
          .inArray(['pending', 'sent', 'error'])
          .default('sent'),
        scheduledAt: sb.date().default(null),
        sent: sb.date().default(null),
        updatedAt: sb.date().default(null),
        createdAt: sb.date().default('now'),
      }),
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
