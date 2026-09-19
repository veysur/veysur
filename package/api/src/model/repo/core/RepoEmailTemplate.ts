import { Repo, ServerErrorBadRequest, TYPE_HINT_TIMESTAMP } from 'mzen-server'
import { EmailTemplate } from 'veysur-common'

export class RepoEmailTemplate extends Repo<EmailTemplate> {
  constructor() {
    super({
      name: 'emailTemplate',
      dataSource: 'project', // Use project-specific dynamic datasource
      autoIndex: false,
      relations: {},
      indexes: {
        createdAt: {
          spec: { createdAt: -1 },
          options: { typeHint: TYPE_HINT_TIMESTAMP },
        },
        updatedAt: {
          spec: { updatedAt: -1 },
          options: { typeHint: TYPE_HINT_TIMESTAMP },
        },
        surveyIdTypeLang: {
          spec: { surveyId: 1, type: 1, lang: 1 },
          options: { unique: true },
        },
      },
    })
  }

  async create(data = {}, options?) {
    const { isValid, errors } = await this.schema.validatePaths(data)
    if (!isValid) {
      throw new ServerErrorBadRequest(errors)
    }

    await this.schema.applyFilters(data)
    const emailTemplate = new EmailTemplate(data)

    await this.insertOne(emailTemplate, options)

    return emailTemplate
  }
}

export default RepoEmailTemplate
