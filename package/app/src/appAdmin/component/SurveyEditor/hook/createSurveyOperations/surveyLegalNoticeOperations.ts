import {
  BUFFERED_PATCH_ACTION_UPDATE,
  schemaManager,
  L10n,
} from 'veysur-common'

import { OperationDependencies } from './type'
import { SURVEY_ENTITY_TYPE_SURVEY } from '../../constant'

const l10nHtmlSchema = schemaManager.getSchema('l10nHtml')

type LegalNotice = {
  show: boolean
  link: boolean
  text: L10n
}

export const createSurveyLegalNoticeOperations = ({
  updateSurveyState,
  validateAndBuffer,
}: OperationDependencies) => ({
  updateSurveyLegalNotice: (legalNotice: LegalNotice) => {
    updateSurveyState((s) => {
      s = s.updateLegalNotice(legalNotice)
      validateAndBuffer({
        patches: [
          {
            type: SURVEY_ENTITY_TYPE_SURVEY,
            action: BUFFERED_PATCH_ACTION_UPDATE,
            id: s._id,
            data: { legalNotice },
          },
        ],
      })
      return s
    })
  },

  updateSurveyLegalNoticeSetting: (key: string, value: unknown) => {
    updateSurveyState((s) => {
      s = s.setLegalNoticeProperty(key, value)
      validateAndBuffer({
        patches: [
          {
            type: SURVEY_ENTITY_TYPE_SURVEY,
            action: BUFFERED_PATCH_ACTION_UPDATE,
            id: s._id,
            data: { [`legalNotice.${key}`]: value },
          },
        ],
      })
      return s
    })
  },

  updateSurveyLegalNoticeText: (text?: string | null, lang: string = 'en') => {
    updateSurveyState((s) => {
      s = s.updateLegalNoticeText(text, lang)
      validateAndBuffer({
        patches: [
          {
            type: SURVEY_ENTITY_TYPE_SURVEY,
            action: BUFFERED_PATCH_ACTION_UPDATE,
            id: s._id,
            data: { legalNotice: s.legalNotice },
          },
        ],
        validation: {
          schema: l10nHtmlSchema,
          path: lang,
          value: text ?? '',
          entityType: 'survey',
          entityId: s._id,
          field: `legalNotice.text.${lang}`,
        },
      })
      return s
    })
  },
})
