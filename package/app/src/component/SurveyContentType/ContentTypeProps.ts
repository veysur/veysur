import { SurveyContent as SurveyContentModel } from 'veysur-common'

import { SurveyContentFormatConfig } from '../Survey/SurveyTypes'

export interface ContentTypeProps {
  element: SurveyContentModel
  /** Element text with `{{...}}` expressions resolved */
  resolvedText: string
  /** Element text before expression resolution */
  rawText: string
  contentFormat: SurveyContentFormatConfig
}
