import { Repo, TYPE_HINT_TIMESTAMP } from 'mzen-server'

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
      schema: {
        _id: { $type: String },
        userId: { $type: String, $filter: { defaultValue: null } },
        projectId: { $type: String, $filter: { defaultValue: null } },
        service: {
          $type: String,
          $validate: {
            required: true,
            notNull: true,
            valueLength: { max: 127 },
          },
          $filter: { lowercase: true, trim: true },
        },
        type: {
          $type: String,
          $validate: {
            required: true,
            notNull: true,
            valueLength: { max: 512 },
          },
          $filter: { lowercase: true, trim: true },
        },
        to: {
          $type: String,
          $validate: {
            required: true,
            notNull: true,
            email: true,
            valueLength: { max: 512 },
          },
          $filter: { lowercase: true, trim: true },
        },
        from: {
          $type: String,
          $validate: {
            required: true,
            notNull: true,
            email: true,
            valueLength: { max: 512 },
          },
          $filter: { lowercase: true, trim: true },
        },
        subject: {
          $type: String,
          $validate: {
            required: true,
            notNull: true,
            valueLength: { max: 2048 },
          },
          $filter: { trim: true },
        },
        template: {
          $type: String,
          $validate: { valueLength: { max: 2048 } },
          $filter: { trim: true, defaultValue: null },
        },
        html: {
          $type: String,
          $validate: { valueLength: { max: 50000 } },
          $filter: { trim: true, defaultValue: null },
        },
        text: {
          $type: String,
          $validate: { valueLength: { max: 50000 } },
          $filter: { trim: true, defaultValue: null },
        },
        templateData: { $type: Object },
        messageId: {
          $type: String,
          $validate: { valueLength: { max: 2048 } },
          $filter: { trim: true },
        },
        data: { $type: Object },
        error: {
          $type: String,
          $validate: { valueLength: { max: 2048 } },
          $filter: { trim: true },
        },
        attempts: { $type: Number, $filter: { defaultValue: 0 } },
        status: {
          $type: String,
          $validate: { inArray: { values: ['pending', 'sent', 'error'] } },
          $filter: { defaultValue: 'sent' },
        },
        scheduledAt: { $type: Date, $filter: { defaultValue: null } },
        sent: { $type: Date, $filter: { defaultValue: null } },
        updatedAt: { $type: Date, $filter: { defaultValue: null } },
        createdAt: { $type: Date, $filter: { defaultValue: 'now' } },
      },
      indexes: {
        createdAt: {
          spec: { createdAt: -1 },
          options: { typeHint: TYPE_HINT_TIMESTAMP },
        },
        user: {
          spec: { userId: 1, createdAt: -1 },
          options: { typeHint: { createdAt: TYPE_HINT_TIMESTAMP } },
        },
        to: {
          spec: { to: 1, createdAt: -1 },
          options: { typeHint: { createdAt: TYPE_HINT_TIMESTAMP } },
        },
        project: {
          spec: { projectId: 1, createdAt: -1 },
          options: { typeHint: { createdAt: TYPE_HINT_TIMESTAMP } },
        },
        queueStatus: {
          spec: { status: 1, scheduledAt: 1 },
          options: { typeHint: { scheduledAt: TYPE_HINT_TIMESTAMP } },
        },
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
