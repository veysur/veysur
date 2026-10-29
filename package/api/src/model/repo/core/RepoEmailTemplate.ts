import { Repo, ServerErrorBadRequest, RepoIndexBuilder as repib } from '@datacapy/server'
import { EmailTemplate } from 'veysur-common'

export class RepoEmailTemplate extends Repo<EmailTemplate> {
  constructor() {
    super({
      name: 'emailTemplate',
      dataSource: 'project', // Use project-specific dynamic datasource
      autoIndex: false,
      relations: {},
      indexes: {
        createdAt: repib.desc('createdAt').timestamp(),
        updatedAt: repib.desc('updatedAt').timestamp(),
        surveyIdTypeLang: repib
          .asc('surveyId')
          .asc('type')
          .asc('lang')
          .unique(),
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
