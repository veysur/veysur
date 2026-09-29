import * as fs from 'fs'
import * as path from 'path'

import { Service } from '@datacapy/server'
import type { Response } from 'express'

/**
 * Serves the survey markdown format spec
 * (`model/asset/survey-markdown-spec/survey-markdown-format.md`) as a public
 * download, so a user can hand it to an LLM chat bot.
 */
export class ServiceSurveyMarkdownSpec extends Service {
  static readonly FILENAME = 'veysur-survey-markdown-spec.md'

  private readonly specPath = path.join(
    __dirname,
    '../../asset/survey-markdown-spec/survey-markdown-format.md',
  )

  constructor() {
    super({ name: 'surveyMarkdownSpec' })
  }

  async download({ response }: { response: Response }) {
    const content = await fs.promises.readFile(this.specPath, 'utf8')
    response.setHeader('Content-Type', 'text/markdown; charset=utf-8')
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="${ServiceSurveyMarkdownSpec.FILENAME}"`,
    )
    response.end(content)
  }
}

export default ServiceSurveyMarkdownSpec
