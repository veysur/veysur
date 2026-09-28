import {
  BUFFERED_PATCH_ACTION_UPDATE,
  schemaManager,
  L10n,
} from 'veysur-common'

import { OperationDependencies } from './type'
import { SURVEY_ENTITY_TYPE_SURVEY } from '../../constant'

const l10nHtmlSchema = schemaManager.getSchema('l10nHtml')
const l10nUrlSchema = schemaManager.getSchema('l10nUrl')

type DataPolicy = {
  show: boolean
  link: boolean
  text: L10n
  url: L10n
}

export const createSurveyDataPolicyOperations = ({
  updateSurveyState,
  validateAndBuffer,
}: OperationDependencies) => ({
  updateSurveyDataPolicy: (dataPolicy: DataPolicy) => {
    updateSurveyState((s) => {
      s = s.updateDataPolicy(dataPolicy)
      validateAndBuffer({
        patches: [
          {
            type: SURVEY_ENTITY_TYPE_SURVEY,
            action: BUFFERED_PATCH_ACTION_UPDATE,
            id: s._id,
            data: { dataPolicy },
          },
        ],
      })
      return s
    })
  },

  updateSurveyDataPolicySetting: (key: string, value: boolean | L10n) => {
    updateSurveyState((s) => {
      s = s.setDataPolicyProperty(key, value)
      validateAndBuffer({
        patches: [
          {
            type: SURVEY_ENTITY_TYPE_SURVEY,
            action: BUFFERED_PATCH_ACTION_UPDATE,
            id: s._id,
            data: { [`dataPolicy.${key}`]: value },
          },
        ],
      })
      return s
    })
  },

  updateSurveyDataPolicyText: (text?: string | null, lang: string = 'en') => {
    updateSurveyState((s) => {
      s = s.updateDataPolicyText(text, lang)
      validateAndBuffer({
        patches: [
          {
            type: SURVEY_ENTITY_TYPE_SURVEY,
            action: BUFFERED_PATCH_ACTION_UPDATE,
            id: s._id,
            data: { dataPolicy: s.dataPolicy },
          },
        ],
        validation: {
          schema: l10nHtmlSchema,
          path: lang,
          value: text ?? '',
          entityType: 'survey',
          entityId: s._id,
          field: `dataPolicy.text.${lang}`,
        },
      })
      return s
    })
  },

  updateSurveyDataPolicyUrl: (url?: string | null, lang: string = 'en') => {
    updateSurveyState((s) => {
      s = s.updateDataPolicyUrl(url, lang)
      validateAndBuffer({
        patches: [
          {
            type: SURVEY_ENTITY_TYPE_SURVEY,
            action: BUFFERED_PATCH_ACTION_UPDATE,
            id: s._id,
            data: { dataPolicy: s.dataPolicy },
          },
        ],
        validation: {
          schema: l10nUrlSchema,
          path: lang,
          value: url ?? '',
          entityType: 'survey',
          entityId: s._id,
          field: `dataPolicy.url.${lang}`,
        },
      })
      return s
    })
  },
})
