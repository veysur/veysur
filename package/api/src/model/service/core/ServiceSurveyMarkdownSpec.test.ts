import * as fs from 'fs'
import * as path from 'path'

import type { Response } from 'express'

import { ServiceSurveyMarkdownSpec } from './ServiceSurveyMarkdownSpec'

describe('ServiceSurveyMarkdownSpec', () => {
  it('sends the spec file as a markdown attachment', async () => {
    const setHeader = jest.fn()
    const end = jest.fn()
    const response = { setHeader, end } as unknown as Response

    await new ServiceSurveyMarkdownSpec().download({ response })

    const expected = fs.readFileSync(
      path.join(
        __dirname,
        '../../asset/survey-markdown-spec/survey-markdown-format.md',
      ),
      'utf8',
    )
    expect(setHeader).toHaveBeenCalledWith(
      'Content-Type',
      'text/markdown; charset=utf-8',
    )
    expect(setHeader).toHaveBeenCalledWith(
      'Content-Disposition',
      `attachment; filename="${ServiceSurveyMarkdownSpec.FILENAME}"`,
    )
    expect(end).toHaveBeenCalledWith(expected)
    expect(expected).toContain('Survey Markdown Format')
  })
})
